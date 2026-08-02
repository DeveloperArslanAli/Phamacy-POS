import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RefundService {
  constructor(private readonly prisma: PrismaService) {}

  async listRefunds(tenantId?: string) {
    return this.prisma.refund.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRefund(id: string) {
    const refund = await this.prisma.refund.findUnique({ where: { id } });
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }
    return refund;
  }

  async requestRefund(data: { tenantId: string; saleId: string; amount: number; reason: string }) {
    const sale = await this.prisma.sale.findUnique({ where: { id: data.saleId } });
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    if (data.amount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }

    if (data.amount > sale.totals) {
      throw new BadRequestException('Refund amount cannot exceed sale total');
    }

    const refund = await this.prisma.refund.create({
      data: {
        tenantId: data.tenantId,
        saleId: data.saleId,
        amount: data.amount,
        reason: data.reason,
        status: 'approved',
      },
    });

    // Update corresponding Sale status to 'refunded'
    await this.prisma.sale.update({
      where: { id: data.saleId },
      data: { status: 'refunded' },
    });

    await this.prisma.auditEvent.create({
      data: {
        tenantId: data.tenantId,
        actorId: undefined,
        action: 'refund_approved',
        entityType: 'Refund',
        entityId: refund.id,
        after: JSON.stringify(refund),
      },
    });

    await this.prisma.syncOutbox.create({
      data: {
        tenantId: data.tenantId,
        aggregateType: 'Refund',
        aggregateId: refund.id,
        eventType: 'refund.approved',
        payload: JSON.stringify(refund),
      },
    });

    return refund;
  }

  async approveRefund(id: string) {
    const refund = await this.prisma.refund.findUnique({ where: { id } });
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    const approved = await this.prisma.refund.update({
      where: { id },
      data: { status: 'approved' },
    });

    await this.prisma.auditEvent.create({
      data: {
        tenantId: approved.tenantId,
        actorId: undefined,
        action: 'refund_approved',
        entityType: 'Refund',
        entityId: approved.id,
        before: JSON.stringify(refund),
        after: JSON.stringify(approved),
      },
    });

    await this.prisma.syncOutbox.create({
      data: {
        tenantId: approved.tenantId,
        aggregateType: 'Refund',
        aggregateId: approved.id,
        eventType: 'refund.approved',
        payload: JSON.stringify(approved),
      },
    });

    return approved;
  }
}
