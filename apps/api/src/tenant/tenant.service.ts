import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async listTenants() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: { locations: true },
    });
  }

  async createTenant(pharmacyName: string) {
    return this.prisma.tenant.create({
      data: {
        pharmacyName,
        status: 'active',
        timezone: 'UTC',
        locale: 'en-US',
      },
    });
  }
}
