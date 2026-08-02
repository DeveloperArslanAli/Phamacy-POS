import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FinalizeCheckoutDto } from './dto/finalize-checkout.dto';

@Injectable()
export class CheckoutService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureLicenseActive(tenantId: string) {
    const license = await this.prisma.license.findFirst({
      where: {
        tenantId,
        status: 'active',
        expiresAt: { gte: new Date() },
      },
    });

    if (!license) {
      throw new BadRequestException('Tenant license is invalid or expired');
    }
  }

  private async ensureItemsExist(tenantId: string, itemIds: string[]) {
    const items = await this.prisma.item.findMany({
      where: {
        tenantId,
        id: { in: itemIds },
      },
      select: { id: true },
    });

    const missing = itemIds.filter((id) => !items.some((item) => item.id === id));
    if (missing.length) {
      throw new BadRequestException(`Items not found: ${missing.join(', ')}`);
    }
  }

  private async allocateInventory(prisma: Prisma.TransactionClient, locationId: string, itemId: string, qty: number) {
    const balances = await prisma.inventoryBalance.findMany({
      where: {
        locationId,
        itemId,
        onHand: { gt: 0 },
      },
      orderBy: [{ batchLot: { expiryDate: 'asc' } }, { createdAt: 'asc' }],
    });

    let remaining = qty;
    const updates: Array<{ id: string; allocate: number; batchLotId: string }> = [];

    for (const balance of balances) {
      if (remaining <= 0) break;
      const allocate = Math.min(balance.onHand, remaining);
      if (allocate > 0) {
        updates.push({ id: balance.id, allocate, batchLotId: balance.batchLotId });
        remaining -= allocate;
      }
    }

    if (remaining > 0) {
      throw new BadRequestException(`Insufficient stock for item ${itemId}. Needed ${qty}, available ${qty - remaining}`);
    }

    return updates;
  }

  async finalizeSale(data: FinalizeCheckoutDto) {
    await this.ensureLicenseActive(data.tenantId);
    await this.ensureItemsExist(data.tenantId, Array.from(new Set(data.lines.map((line) => line.itemId))));

    const totals = data.lines.reduce((sum, line) => sum + line.qty * line.unitPrice - (line.discount || 0) + (line.tax || 0), 0);
    if (Math.abs(totals - data.payment.amount) > 0.01) {
      throw new BadRequestException('Payment amount must match sale total');
    }

    const sale = await this.prisma.$transaction(async (prisma) => {
      let activeLocationId = data.locationId;
      let location = await prisma.location.findFirst({
        where: { id: activeLocationId, tenantId: data.tenantId }
      });
      if (!location) {
        location = await prisma.location.findFirst({
          where: { tenantId: data.tenantId }
        });
        if (!location) {
          location = await prisma.location.create({
            data: {
              tenantId: data.tenantId,
              code: 'MAIN',
              name: 'Main Counter Store',
              address: 'Pharmacy Counter'
            }
          });
        }
      }
      activeLocationId = location.id;

      const createdSale = await prisma.sale.create({
        data: {
          tenantId: data.tenantId,
          locationId: activeLocationId,
          cashierId: data.cashierId,
          totals,
          status: 'completed',
          lines: {
            create: data.lines.map((line) => ({
              tenantId: data.tenantId,
              itemId: line.itemId,
              qty: line.qty,
              unitPrice: line.unitPrice,
              discount: line.discount || 0,
              tax: line.tax || 0,
            })),
          },
          payments: {
            create: {
              tenantId: data.tenantId,
              method: data.payment.method,
              amount: data.payment.amount,
              providerRef: data.payment.providerRef,
              status: 'completed',
            },
          },
        },
        include: {
          lines: true,
          payments: true,
        },
      });

      for (const line of data.lines) {
        const allocations = await this.allocateInventory(prisma, activeLocationId, line.itemId, line.qty);
        for (const allocation of allocations) {
          await prisma.inventoryBalance.update({
            where: { id: allocation.id },
            data: { onHand: { decrement: allocation.allocate } },
          });

          await prisma.inventoryMovement.create({
            data: {
              tenantId: data.tenantId,
              movementType: 'sale',
              referenceType: 'Sale',
              referenceId: createdSale.id,
              qty: allocation.allocate,
              fromLocationId: activeLocationId,
              toLocationId: null,
              itemId: line.itemId,
              batchLotId: allocation.batchLotId,
            },
          });
        }
      }

      await prisma.auditEvent.create({
        data: {
          tenantId: data.tenantId,
          actorId: data.cashierId,
          action: 'sale_completed',
          entityType: 'Sale',
          entityId: createdSale.id,
          after: JSON.stringify(createdSale),
        },
      });

      await prisma.syncOutbox.create({
        data: {
          tenantId: data.tenantId,
          aggregateType: 'Sale',
          aggregateId: createdSale.id,
          eventType: 'sale.completed',
          payload: JSON.stringify(createdSale),
        },
      });

      return createdSale;
    });

    return sale;
  }
}
