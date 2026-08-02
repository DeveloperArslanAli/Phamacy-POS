import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SyncService {
  constructor(private readonly prisma: PrismaService) {}

  async listOutboxEvents(tenantId?: string) {
    return this.prisma.syncOutbox.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createOutboxEvent(data: {
    tenantId: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: any;
  }) {
    return this.prisma.syncOutbox.create({
      data: {
        tenantId: data.tenantId,
        aggregateType: data.aggregateType,
        aggregateId: data.aggregateId,
        eventType: data.eventType,
        payload: JSON.stringify(data.payload),
      },
    });
  }

  async processOutboxEvent(id: string) {
    const event = await this.prisma.syncOutbox.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException('Outbox event not found');
    }

    return this.prisma.syncOutbox.update({
      where: { id },
      data: {
        status: 'processed',
        processedAt: new Date(),
      },
    });
  }
}
