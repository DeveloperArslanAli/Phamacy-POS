import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(tenantId?: string) {
    return this.prisma.user.findMany({
      where: tenantId ? { tenantId } : undefined,
      select: {
        id: true,
        tenantId: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async createUser(data: { tenantId: string; email: string; displayName?: string; role?: string; password?: string }) {
    const existing = await this.prisma.user.findFirst({
      where: { tenantId: data.tenantId, email: data.email },
    });

    if (existing) {
      throw new BadRequestException('User with this email already exists in tenant');
    }

    const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : 'seeded_hash';
    const user = await this.prisma.user.create({
      data: {
        tenantId: data.tenantId,
        email: data.email,
        displayName: data.displayName || data.email.split('@')[0],
        role: data.role || 'staff',
        status: 'active',
        passwordHash: hashedPassword,
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        tenantId: data.tenantId,
        action: 'user_created',
        entityType: 'User',
        entityId: user.id,
        after: JSON.stringify(user),
      },
    });

    return user;
  }

  async updateUserRole(id: string, role: string) {
    const validRoles = ['admin', 'manager', 'pharmacist', 'cashier', 'staff'];
    if (!validRoles.includes(role)) {
      throw new BadRequestException(`Invalid role ${role}. Valid roles: ${validRoles.join(', ')}`);
    }

    const user = await this.getUser(id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        tenantId: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        action: 'user_role_updated',
        entityType: 'User',
        entityId: user.id,
        before: JSON.stringify(user),
        after: JSON.stringify(updated),
      },
    });

    return updated;
  }

  async updateUserStatus(id: string, status: string) {
    const user = await this.getUser(id);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        tenantId: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        tenantId: user.tenantId,
        action: `user_status_${status}`,
        entityType: 'User',
        entityId: user.id,
        before: JSON.stringify(user),
        after: JSON.stringify(updated),
      },
    });

    return updated;
  }
}
