import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PRESCRIPTION_STATUS_TRANSITIONS: Record<string, string[]> = {
  received: ['pending', 'verified', 'cancelled'],
  pending: ['verified', 'cancelled'],
  verified: ['dispensed', 'reversed', 'cancelled'],
  dispensed: ['picked_up', 'reversed'],
  picked_up: ['reversed'],
  reversed: [],
  cancelled: [],
};

@Injectable()
export class PrescriptionsService {
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

  async listPrescriptions(tenantId?: string, status?: string, priority?: string, search?: string) {
    const query = search?.trim();

    return this.prisma.prescription.findMany({
      where: {
        AND: [
          tenantId ? { tenantId } : undefined,
          status && status !== 'all' ? { status } : undefined,
          priority && priority !== 'all' ? { priority } : undefined,
          query
            ? {
                OR: [
                  { rxNo: { contains: query, mode: 'insensitive' } },
                  { prescriberName: { contains: query, mode: 'insensitive' } },
                  { patient: { name: { contains: query, mode: 'insensitive' } } },
                  { patient: { mrn: { contains: query, mode: 'insensitive' } } },
                ],
              }
            : undefined,
        ].filter(Boolean) as any,
      },
      include: {
        patient: true,
        lines: {
          include: {
            item: true,
          },
        },
      },
      orderBy: [
        { priority: 'asc' }, // stat > urgent > wait_in_store > routine
        { issuedAt: 'desc' },
      ],
    });
  }

  async getPrescription(id: string) {
    const prescription = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        patient: true,
        lines: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    return prescription;
  }

  async createPrescription(data: {
    tenantId: string;
    patientId: string;
    prescriberId?: string;
    prescriberName?: string;
    priority?: string;
    scheduleCode?: string;
    refillsAllowed?: number;
    rxNo: string;
    lines: Array<{ itemId: string; qty: number; dosage?: string; directions?: string }>;
  }) {
    await this.ensureLicenseActive(data.tenantId);

    const existing = await this.prisma.prescription.findUnique({
      where: { rxNo: data.rxNo },
    });
    if (existing) {
      throw new BadRequestException(`Prescription with RX No ${data.rxNo} already exists`);
    }

    return this.prisma.$transaction(async (prisma) => {
      const prescription = await prisma.prescription.create({
        data: {
          tenantId: data.tenantId,
          patientId: data.patientId,
          prescriberId: data.prescriberId,
          prescriberName: data.prescriberName || 'Staff Doctor',
          priority: data.priority || 'routine',
          scheduleCode: data.scheduleCode || 'legend',
          refillsAllowed: data.refillsAllowed || 0,
          refillsFilled: 0,
          rxNo: data.rxNo,
          status: 'received',
          lines: {
            create: data.lines.map((line) => ({
              tenantId: data.tenantId,
              itemId: line.itemId,
              qty: line.qty,
              dosage: line.dosage,
              directions: line.directions,
            })),
          },
        },
        include: {
          patient: true,
          lines: {
            include: { item: true },
          },
        },
      });

      await prisma.auditEvent.create({
        data: {
          tenantId: data.tenantId,
          actorId: data.prescriberId,
          action: 'prescription_created',
          entityType: 'Prescription',
          entityId: prescription.id,
          after: JSON.stringify(prescription),
        },
      });

      await prisma.syncOutbox.create({
        data: {
          tenantId: data.tenantId,
          aggregateType: 'Prescription',
          aggregateId: prescription.id,
          eventType: 'prescription.created',
          payload: JSON.stringify(prescription),
        },
      });

      return prescription;
    });
  }

  async verifyPrescription(id: string, data: { pharmacistId: string; notes?: string }) {
    const prescription = await this.getPrescription(id);

    if (prescription.status !== 'received' && prescription.status !== 'pending') {
      throw new BadRequestException(`Cannot verify prescription in status '${prescription.status}'`);
    }

    return this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.prescription.update({
        where: { id },
        data: {
          status: 'verified',
          verificationPharmacistId: data.pharmacistId,
          pharmacistNotes: data.notes || 'Pharmacist verified clinical appropriateness & dosage.',
          verifiedAt: new Date(),
        },
        include: {
          patient: true,
          lines: { include: { item: true } },
        },
      });

      await prisma.auditEvent.create({
        data: {
          tenantId: updated.tenantId,
          actorId: data.pharmacistId,
          action: 'prescription_pharmacist_verified',
          entityType: 'Prescription',
          entityId: updated.id,
          before: JSON.stringify(prescription),
          after: JSON.stringify(updated),
        },
      });

      await prisma.syncOutbox.create({
        data: {
          tenantId: updated.tenantId,
          aggregateType: 'Prescription',
          aggregateId: updated.id,
          eventType: 'prescription.verified',
          payload: JSON.stringify(updated),
        },
      });

      return updated;
    });
  }

  async updatePrescriptionStatus(id: string, data: { status: string; reason?: string; actorId?: string }) {
    const prescription = await this.prisma.prescription.findUnique({ where: { id } });
    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    const allowed = PRESCRIPTION_STATUS_TRANSITIONS[prescription.status] || [];
    if (!allowed.includes(data.status)) {
      throw new BadRequestException(`Cannot transition prescription from ${prescription.status} to ${data.status}`);
    }

    return this.prisma.$transaction(async (prisma) => {
      const updated = await prisma.prescription.update({
        where: { id },
        data: {
          status: data.status,
          ...(data.status === 'dispensed' ? { refillsFilled: { increment: 1 } } : {}),
        },
        include: {
          patient: true,
          lines: {
            include: { item: true },
          },
        },
      });

      await prisma.auditEvent.create({
        data: {
          tenantId: updated.tenantId,
          actorId: data.actorId,
          action: `prescription_status_updated_${data.status}`,
          entityType: 'Prescription',
          entityId: updated.id,
          before: JSON.stringify(prescription),
          after: JSON.stringify(updated),
        },
      });

      await prisma.syncOutbox.create({
        data: {
          tenantId: updated.tenantId,
          aggregateType: 'Prescription',
          aggregateId: updated.id,
          eventType: `prescription.${data.status}`,
          payload: JSON.stringify(updated),
        },
      });

      return updated;
    });
  }
}
