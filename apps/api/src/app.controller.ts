import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getHello(): { status: string; name: string } {
    return { status: 'ok', name: 'HMAT Pharmacy API' };
  }

  @Get('settings')
  async getSettings(@Query('tenantId') tenantId: string) {
    if (!tenantId) return {};
    const settingsList = await this.prisma.setting.findMany({
      where: { tenantId }
    });
    
    const result: Record<string, string> = {};
    settingsList.forEach((s) => {
      result[s.key] = s.value;
    });
    return result;
  }

  @Post('settings')
  async saveSettings(@Body() body: Record<string, any>) {
    const { tenantId, settings } = body;
    if (!tenantId) return { success: false, message: 'tenantId is required' };

    let flatSettings: Record<string, string> = {};
    if (settings && typeof settings === 'object') {
      flatSettings = settings;
    } else {
      Object.entries(body).forEach(([key, val]) => {
        if (key !== 'tenantId') {
          flatSettings[key] = String(val);
        }
      });
    }

    const operations = Object.entries(flatSettings).map(([key, value]) => {
      return this.prisma.setting.upsert({
        where: {
          tenantId_key: { tenantId, key }
        },
        update: { value },
        create: { tenantId, key, value }
      });
    });

    await this.prisma.$transaction(operations);
    return { success: true };
  }

  @Get('system/backup')
  async getBackup(@Query('tenantId') tenantId: string) {
    if (!tenantId) return { error: 'tenantId is required' };
        const patients = await this.prisma.patient.findMany({ where: { tenantId } });
    const items = await this.prisma.item.findMany({ where: { tenantId } });
    const inventoryBalances = await this.prisma.inventoryBalance.findMany({ where: { tenantId } });
    const batchLots = await this.prisma.batchLot.findMany({ where: { tenantId } });
    const sales = await this.prisma.sale.findMany({ where: { tenantId }, include: { lines: true, payments: true } });
    const prescriptions = await this.prisma.prescription.findMany({ where: { tenantId }, include: { lines: true } });
    const settings = await this.prisma.setting.findMany({ where: { tenantId } });

    return {
      patients,
      items,
      inventoryBalances,
      batchLots,
      sales,
      prescriptions,
      settings
    };
  }

  @Post('system/restore')
  async restoreBackup(@Body() payload: { tenantId: string; data: any }) {
    const { tenantId, data } = payload;
    if (!tenantId || !data) return { success: false, message: 'tenantId and data are required' };

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.deleteMany({ where: { tenantId } });
        await tx.saleLine.deleteMany({ where: { tenantId } });
        await tx.sale.deleteMany({ where: { tenantId } });
        await tx.prescriptionLine.deleteMany({ where: { tenantId } });
        await tx.prescription.deleteMany({ where: { tenantId } });
        await tx.inventoryBalance.deleteMany({ where: { tenantId } });
        await tx.batchLot.deleteMany({ where: { tenantId } });
        await tx.item.deleteMany({ where: { tenantId } });
        await tx.patient.deleteMany({ where: { tenantId } });
        await tx.setting.deleteMany({ where: { tenantId } });

        if (data.settings && data.settings.length > 0) {
          await tx.setting.createMany({ data: data.settings.map((s: any) => ({ tenantId, key: s.key, value: s.value })) });
        }

        if (data.patients && data.patients.length > 0) {
          await tx.patient.createMany({ data: data.patients.map((p: any) => ({ ...p, tenantId })) });
        }

        if (data.items && data.items.length > 0) {
          await tx.item.createMany({ data: data.items.map((i: any) => ({ ...i, tenantId })) });
        }

        if (data.batchLots && data.batchLots.length > 0) {
          await tx.batchLot.createMany({ data: data.batchLots.map((b: any) => ({ ...b, tenantId })) });
        }

        if (data.inventoryBalances && data.inventoryBalances.length > 0) {
          await tx.inventoryBalance.createMany({ data: data.inventoryBalances.map((ib: any) => ({ ...ib, tenantId })) });
        }

        if (data.prescriptions && data.prescriptions.length > 0) {
          for (const rx of data.prescriptions) {
            const rxLines = rx.lines || [];
            delete rx.lines;
            await tx.prescription.create({ data: { ...rx, tenantId } });
            if (rxLines.length > 0) {
              await tx.prescriptionLine.createMany({ data: rxLines.map((rl: any) => ({ ...rl, tenantId })) });
            }
          }
        }

        if (data.sales && data.sales.length > 0) {
          for (const s of data.sales) {
            const sLines = s.lines || [];
            const sPayments = s.payments || [];
            delete s.lines;
            delete s.payments;
            await tx.sale.create({ data: { ...s, tenantId } });
            if (sLines.length > 0) {
              await tx.saleLine.createMany({ data: sLines.map((sl: any) => ({ ...sl, tenantId })) });
            }
            if (sPayments.length > 0) {
              await tx.payment.createMany({ data: sPayments.map((sp: any) => ({ ...sp, tenantId })) });
            }
          }
        }
      });

      return { success: true, message: 'Database backup restored successfully.' };
    } catch (err: any) {
      return { success: false, message: 'Database restore failed: ' + err.message };
    }
  }
}
