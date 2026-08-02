import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto } from './sale.dto';

@Injectable()
export class SaleService {
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

  async listSales(tenantId?: string) {
    return this.prisma.sale.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: { lines: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSale(data: CreateSaleDto) {
    await this.ensureLicenseActive(data.tenantId);

    const sale = await this.prisma.sale.create({
      data: {
        tenantId: data.tenantId,
        locationId: data.locationId,
        cashierId: data.cashierId,
        totals: data.totals,
        status: data.status ?? 'completed',
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        tenantId: data.tenantId,
        actorId: data.cashierId,
        action: 'sale_recorded',
        entityType: 'Sale',
        entityId: sale.id,
        after: JSON.stringify(sale),
      },
    });

    await this.prisma.syncOutbox.create({
      data: {
        tenantId: data.tenantId,
        aggregateType: 'Sale',
        aggregateId: sale.id,
        eventType: 'sale.recorded',
        payload: JSON.stringify(sale),
      },
    });

    return sale;
  }
}
