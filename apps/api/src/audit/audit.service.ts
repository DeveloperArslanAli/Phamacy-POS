import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async listAuditEvents(tenantId?: string) {
    return this.prisma.auditEvent.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAuditEvent(id: string) {
    const auditEvent = await this.prisma.auditEvent.findUnique({ where: { id } });
    if (!auditEvent) {
      throw new NotFoundException('Audit event not found');
    }
    return auditEvent;
  }
}
