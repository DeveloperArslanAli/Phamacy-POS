import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const VALID_LICENSE_STATUSES = ['active', 'suspended', 'expired', 'revoked'];

@Injectable()
export class LicenseService {
  constructor(private readonly prisma: PrismaService) {}

  async listLicenses(tenantId?: string) {
    return this.prisma.license.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: { tenant: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLicense(id: string) {
    const license = await this.prisma.license.findUnique({ where: { id } });
    if (!license) {
      throw new NotFoundException('License not found');
    }
    return license;
  }

  async getActiveLicense(tenantId: string) {
    return this.prisma.license.findFirst({
      where: {
        tenantId,
        status: 'active',
        expiresAt: { gte: new Date() },
      },
      orderBy: { expiresAt: 'desc' },
    });
  }

  async validateLicense(tenantId: string) {
    const license = await this.getActiveLicense(tenantId);
    if (!license) {
      throw new ForbiddenException('Tenant license is invalid or expired');
    }
    return license;
  }

  async createLicense(data: {
    tenantId: string;
    planCode: string;
    expiresAt: Date;
    offlineGraceUntil?: Date;
  }) {
    if (data.expiresAt <= new Date()) {
      throw new BadRequestException('License expiration must be in the future');
    }

    const license = await this.prisma.license.create({
      data: {
        tenantId: data.tenantId,
        planCode: data.planCode,
        expiresAt: data.expiresAt,
        offlineGraceUntil: data.offlineGraceUntil,
        status: 'active',
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        tenantId: data.tenantId,
        actorId: undefined,
        action: 'license_created',
        entityType: 'License',
        entityId: license.id,
        after: JSON.stringify(license),
      },
    });

    await this.prisma.syncOutbox.create({
      data: {
        tenantId: data.tenantId,
        aggregateType: 'License',
        aggregateId: license.id,
        eventType: 'license.created',
        payload: JSON.stringify(license),
      },
    });

    return license;
  }

  async updateLicenseStatus(id: string, status: string) {
    if (!VALID_LICENSE_STATUSES.includes(status)) {
      throw new BadRequestException('Invalid license status');
    }

    const existing = await this.prisma.license.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('License not found');
    }

    const updated = await this.prisma.license.update({
      where: { id },
      data: { status },
    });

    await this.prisma.auditEvent.create({
      data: {
        tenantId: updated.tenantId,
        actorId: undefined,
        action: 'license_status_updated',
        entityType: 'License',
        entityId: updated.id,
        before: JSON.stringify(existing),
        after: JSON.stringify(updated),
      },
    });

    await this.prisma.syncOutbox.create({
      data: {
        tenantId: updated.tenantId,
        aggregateType: 'License',
        aggregateId: updated.id,
        eventType: `license.${status}`,
        payload: JSON.stringify(updated),
      },
    });

    return updated;
  }

  async updateLicense(id: string, data: { planCode?: string; expiresAt?: Date; shopName?: string; email?: string }) {
    const existing = await this.prisma.license.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('License not found');
    }

    const updated = await this.prisma.license.update({
      where: { id },
      data: {
        planCode: data.planCode,
        expiresAt: data.expiresAt,
      },
    });

    if (data.shopName) {
      await this.prisma.tenant.update({
        where: { id: existing.tenantId },
        data: { pharmacyName: data.shopName },
      });
    }

    if (data.email) {
      const user = await this.prisma.user.findFirst({
        where: { tenantId: existing.tenantId, role: 'pharmacist' },
      });
      if (user) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { email: data.email },
        });
      }
    }

    return updated;
  }

  async deleteLicense(id: string) {
    const existing = await this.prisma.license.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('License not found');
    }
    await this.prisma.license.delete({ where: { id } });
    return { success: true };
  }
}
