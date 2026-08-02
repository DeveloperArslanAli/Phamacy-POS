import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSummary(startDate: Date, endDate: Date, tenantId?: string) {
    // 1. Sales & Gross Margin Calculations
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        totals: true,
        lines: {
          select: {
            qty: true,
            item: {
              select: {
                unitCost: true,
              },
            },
          },
        },
        payments: {
          select: {
            method: true,
            amount: true,
          },
        },
      },
    });

    let totalRevenue = 0;
    let totalCogs = 0;
    let totalMedicinesSold = 0;
    const paymentMethods: Record<string, number> = {};

    sales.forEach((sale) => {
      totalRevenue += sale.totals;
      
      // Calculate Cost of Goods Sold (COGS)
      sale.lines.forEach((line) => {
        const itemCost = line.item?.unitCost || 0;
        totalCogs += line.qty * itemCost;
        totalMedicinesSold += line.qty;
      });

      // Group payments
      sale.payments.forEach((pay) => {
        paymentMethods[pay.method] = (paymentMethods[pay.method] || 0) + pay.amount;
      });
    });

    // Query approved refunds in this period to calculate net revenue
    const refunds = await this.prisma.refund.findMany({
      where: {
        tenantId,
        status: 'approved',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        amount: true,
      },
    });

    let totalRefunded = 0;
    refunds.forEach((ref) => {
      totalRefunded += ref.amount;
    });

    const netRevenue = Math.max(0, totalRevenue - totalRefunded);
    const grossProfit = netRevenue - totalCogs;
    const grossMarginPercent = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;
    const customerCount = sales.length;

    // Calculate 1d, 7d, 30d revenue volumes dynamically (net of approved refunds)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [revenue1d, refunds1d, revenue7d, refunds7d, revenue30d, refunds30d] = await Promise.all([
      this.prisma.sale.aggregate({
        where: {
          tenantId,
          createdAt: { gte: oneDayAgo },
        },
        _sum: { totals: true },
      }),
      this.prisma.refund.aggregate({
        where: {
          tenantId,
          status: 'approved',
          createdAt: { gte: oneDayAgo },
        },
        _sum: { amount: true },
      }),
      this.prisma.sale.aggregate({
        where: {
          tenantId,
          createdAt: { gte: sevenDaysAgo },
        },
        _sum: { totals: true },
      }),
      this.prisma.refund.aggregate({
        where: {
          tenantId,
          status: 'approved',
          createdAt: { gte: sevenDaysAgo },
        },
        _sum: { amount: true },
      }),
      this.prisma.sale.aggregate({
        where: {
          tenantId,
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { totals: true },
      }),
      this.prisma.refund.aggregate({
        where: {
          tenantId,
          status: 'approved',
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { amount: true },
      }),
    ]);

    const rev1d = Math.max(0, (revenue1d._sum.totals || 0) - (refunds1d._sum.amount || 0));
    const rev7d = Math.max(0, (revenue7d._sum.totals || 0) - (refunds7d._sum.amount || 0));
    const rev30d = Math.max(0, (revenue30d._sum.totals || 0) - (refunds30d._sum.amount || 0));

    // 2. Clinical Performance Metric (Average Dispensing processing time)
    const prescriptions = await this.prisma.prescription.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
        status: 'completed',
        verifiedAt: { not: null },
      },
    });

    let totalVerificationSec = 0;
    prescriptions.forEach((rx) => {
      if (rx.verifiedAt) {
        const diffMs = new Date(rx.verifiedAt).getTime() - new Date(rx.createdAt).getTime();
        totalVerificationSec += Math.max(0, diffMs / 1000);
      }
    });

    const avgProcessingTimeSeconds = prescriptions.length > 0
      ? Math.round(totalVerificationSec / prescriptions.length)
      : 0;

    // 3. Clinical Intercepts & DUR overrides
    const durOverridesCount = await this.prisma.auditEvent.count({
      where: {
        tenantId,
        action: 'dur_warning_override',
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // 4. Stock Adjustments & Shrinkage audit
    const adjustments = await this.prisma.inventoryMovement.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        movementType: { in: ['adjustment', 'shrinkage', 'cycle_count_loss'] },
      },
    });

    let totalShrinkageQty = 0;
    adjustments.forEach((adj) => {
      if (adj.qty < 0) {
        totalShrinkageQty += Math.abs(adj.qty);
      }
    });

    return {
      financials: {
        revenue: netRevenue,
        grossRevenue: totalRevenue,
        totalRefunded,
        refundsCount: refunds.length,
        refundRatePercent: totalRevenue > 0 ? (totalRefunded / totalRevenue) * 100 : 0,
        cogs: totalCogs,
        grossProfit,
        grossMarginPercent,
        transactionCount: sales.length,
        paymentMethods,
        revenue1d: rev1d,
        revenue7d: rev7d,
        revenue30d: rev30d,
        customerCount,
        medicinesSold: totalMedicinesSold,
      },
      clinical: {
        avgProcessingTimeSeconds,
        completedRxs: prescriptions.length,
        durOverrides: durOverridesCount,
      },
      inventory: {
        shrinkageQty: totalShrinkageQty,
      },
    };
  }

  async runReconciliationVerification(tenantId?: string) {
    // 1. Fetch current balances
    const balances = await this.prisma.inventoryBalance.findMany({
      where: tenantId ? { location: { tenantId } } : undefined,
      include: {
        item: true,
        location: true,
      },
    });

    // 2. Fetch all movements to aggregate transaction totals
    const movements = await this.prisma.inventoryMovement.findMany({
      include: {
        fromLocation: true,
        toLocation: true,
      },
    });

    // Map each balance and reconcile transaction logs
    const auditReport = balances.map((bal) => {
      // Calculate ledger-expected stock: sum of adjustments and purchases minus sales
      // Filter movements belonging to this item and location
      const itemMovements = movements.filter(m => {
        if (m.itemId) {
          return m.itemId === bal.itemId && (m.toLocationId === bal.locationId || m.fromLocationId === bal.locationId);
        }
        // Fallback for legacy movements
        const isMatchLocation = m.toLocationId === bal.locationId || m.fromLocationId === bal.locationId;
        if (!isMatchLocation) return false;
        if (m.referenceType === 'BatchLot' && m.referenceId === bal.batchLotId) return true;
        if (m.referenceType === 'StockAdjustment' && m.referenceId === bal.id) return true;
        return false;
      });

      let expectedStock = 0;
      itemMovements.forEach((m) => {
        // If it moved to this location, add
        if (m.toLocationId === bal.locationId) {
          expectedStock += m.qty;
        }
        // If it moved from this location, subtract
        if (m.fromLocationId === bal.locationId) {
          expectedStock -= m.qty;
        }
      });

      const discrepancy = bal.onHand - expectedStock;
      const status = discrepancy === 0 ? 'SUCCESS' : 'VARIANCE';

      return {
        itemId: bal.itemId,
        itemName: bal.item.name,
        sku: bal.item.sku,
        locationName: bal.location.name,
        currentOnHand: bal.onHand,
        ledgerExpected: expectedStock,
        discrepancy,
        status,
      };
    });

    return auditReport;
  }

  async getSalesExportData(startDate: Date, endDate: Date, tenantId?: string) {
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        lines: {
          include: {
            item: true,
          },
        },
        payments: true,
        cashier: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const exportRows: any[] = [];
    sales.forEach((sale) => {
      sale.lines.forEach((line) => {
        exportRows.push({
          saleId: sale.id,
          date: sale.createdAt.toISOString(),
          cashier: sale.cashier?.displayName || sale.cashier?.email || 'N/A',
          itemSku: line.item?.sku || 'N/A',
          itemName: line.item?.name || 'N/A',
          qty: line.qty,
          unitPrice: line.unitPrice,
          totalCost: line.qty * (line.item?.unitCost || 0),
          totalPrice: line.qty * line.unitPrice,
          profit: line.qty * line.unitPrice - line.qty * (line.item?.unitCost || 0),
          paymentMethod: sale.payments.map((p) => p.method).join(' | '),
        });
      });
    });

    return exportRows;
  }

  async closeDayReport(tenantId: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const summary = await this.getSummary(startOfToday, endOfToday, tenantId);

    // Fetch EOD and SMTP configurations from DB
    const settingsList = await this.prisma.setting.findMany({
      where: { tenantId }
    });
    const dbSettings: Record<string, string> = {};
    settingsList.forEach(s => {
      dbSettings[s.key] = s.value;
    });

    const targetEmail = dbSettings['eod_report_email'] || 'manager@hmatpharmacy.local';
    const smtpHost = dbSettings['smtp_host'];
    const smtpPort = dbSettings['smtp_port'] ? parseInt(dbSettings['smtp_port']) : 587;
    const smtpUser = dbSettings['smtp_user'];
    const smtpPass = dbSettings['smtp_pass'];
    const smtpFrom = dbSettings['smtp_from'] || 'no-reply@hmatpharmacy.local';
    const pharmacyName = dbSettings['pharmacy_name'] || 'HMAT Pharmacy';

    // Formulate a beautiful HTML email summary
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: sans-serif; color: #111; padding: 20px; }
          .container { border: 1px solid #000; padding: 20px; border-radius: 8px; max-width: 600px; }
          h1 { border-bottom: 2px solid #000; pb-10px; font-size: 20px; text-transform: uppercase; }
          .metric-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 10px; margin-top: 15px; }
          .metric-card { border: 1px solid #ccc; padding: 10px; border-radius: 4px; }
          .metric-title { font-size: 10px; font-weight: bold; color: #555; text-transform: uppercase; }
          .metric-value { font-size: 18px; font-weight: black; margin-top: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>HMAT POS — End-Of-Day Closing Report</h1>
          <p><strong>Date:</strong> ${startOfToday.toLocaleDateString()}</p>
          <p><strong>Tenant Identifier:</strong> ${tenantId}</p>
          <p><strong>Manager Delivery Destination:</strong> ${targetEmail}</p>
          
          <h2>Financial Performance Summary</h2>
          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-title">Total Revenue</div>
              <div class="metric-value">Rs. ${summary.financials.revenue.toLocaleString()}</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">Gross Profit</div>
              <div class="metric-value">Rs. ${summary.financials.grossProfit.toLocaleString()}</div>
            </div>
            <div class="metric-card">
              <div class="metric-title font-bold">Gross Margin %</div>
              <div class="metric-value">${summary.financials.grossMarginPercent.toFixed(2)}%</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">Transaction Volume</div>
              <div class="metric-value">${summary.financials.transactionCount} Orders</div>
            </div>
          </div>

          <h2>Clinical Operational Performance</h2>
          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-title">Rxs Dispensed</div>
              <div class="metric-value">${summary.clinical.completedRxs}</div>
            </div>
            <div class="metric-card">
              <div class="metric-title">DUR Intercepts</div>
              <div class="metric-value">${summary.clinical.durOverrides} Overrides</div>
            </div>
          </div>

          <h2>Inventory Reconciliation Audit</h2>
          <div class="metric-card" style="margin-top: 10px;">
            <div class="metric-title">Stock Shrinkage Count</div>
            <div class="metric-value text-red-600">${summary.inventory.shrinkageQty} units lost</div>
          </div>
        </div>
      </body>
      </html>
    `;

    this.logger.log(`=========================================`);
    this.logger.log(`DISPATCHING EOD REPORT EMAIL TO: ${targetEmail}`);
    this.logger.log(`Subject: HMAT POS — End-Of-Day Closing Report`);
    this.logger.log(`Email Content:\n${emailHtml}`);
    this.logger.log(`=========================================`);

    let mailSent = false;
    let mailError = null;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: `"${pharmacyName}" <${smtpFrom}>`,
          to: targetEmail,
          subject: 'HMAT POS — End-Of-Day Closing Report',
          html: emailHtml,
        });

        this.logger.log(`REAL EOD EMAIL DISPATCHED SUCCESSFULLY to ${targetEmail}`);
        mailSent = true;
      } catch (err: any) {
        this.logger.error(`Failed to send real SMTP email: ${err.message}`);
        mailError = err.message;
      }
    } else {
      this.logger.warn(`SMTP settings are incomplete. Skipping real email dispatch.`);
      mailError = 'SMTP host or credentials not configured in System Setup.';
    }

    // Log this system closing event in the Audit Log
    await this.prisma.auditEvent.create({
      data: {
        tenantId,
        actorId: 'system-close-day',
        action: 'system_day_close',
        entityType: 'DayCloseSummary',
        entityId: startOfToday.toISOString().slice(0, 10),
        after: JSON.stringify(summary),
      },
    });

    return {
      success: true,
      message: mailSent 
        ? `EOD report compiled, email successfully sent to ${targetEmail}`
        : `EOD report compiled, email logged to server console (${mailError || 'SMTP unconfigured'}).`,
      summary,
      emailHtml,
      targetEmail,
      mailSent,
      mailError
    };
  }
}
