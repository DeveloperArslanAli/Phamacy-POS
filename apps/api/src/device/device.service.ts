import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeviceService {
  constructor(private readonly prisma: PrismaService) {}

  async listDevices(tenantId?: string) {
    return this.prisma.device.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDevice(id: string) {
    const device = await this.prisma.device.findUnique({ where: { id } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    return device;
  }

  async registerDevice(data: { tenantId: string; deviceFingerprint: string; name: string }) {
    const existing = await this.prisma.device.findFirst({
      where: {
        tenantId: data.tenantId,
        deviceFingerprint: data.deviceFingerprint,
      },
    });

    const device = existing
      ? await this.prisma.device.update({
          where: { id: existing.id },
          data: { name: data.name, lastSeenAt: new Date() },
        })
      : await this.prisma.device.create({
          data: {
            tenantId: data.tenantId,
            deviceFingerprint: data.deviceFingerprint,
            name: data.name,
            lastSeenAt: new Date(),
          },
        });

    await this.prisma.auditEvent.create({
      data: {
        tenantId: device.tenantId,
        actorId: undefined,
        action: existing ? 'device_updated' : 'device_registered',
        entityType: 'Device',
        entityId: device.id,
        after: JSON.stringify(device),
      },
    });

    await this.prisma.syncOutbox.create({
      data: {
        tenantId: device.tenantId,
        aggregateType: 'Device',
        aggregateId: device.id,
        eventType: existing ? 'device.updated' : 'device.registered',
        payload: JSON.stringify(device),
      },
    });

    return device;
  }
}
