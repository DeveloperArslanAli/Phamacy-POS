import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPatients(tenantId?: string, search?: string) {
    const query = search?.trim();
    let dobFilter: any = undefined;
    if (query) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(query)) {
        const parsedDate = new Date(query);
        if (!isNaN(parsedDate.getTime())) {
          dobFilter = { dateOfBirth: parsedDate };
        }
      } else if (/^\d{4}$/.test(query)) {
        const year = parseInt(query, 10);
        dobFilter = {
          dateOfBirth: {
            gte: new Date(`${year}-01-01T00:00:00.000Z`),
            lte: new Date(`${year}-12-31T23:59:59.999Z`),
          },
        };
      }
    }

    return this.prisma.patient.findMany({
      where: {
        AND: [
          tenantId ? { tenantId } : undefined,
          query
            ? {
                OR: [
                  { name: { contains: query, mode: 'insensitive' } },
                  { mrn: { contains: query, mode: 'insensitive' } },
                  { phone: { contains: query, mode: 'insensitive' } },
                  dobFilter ? dobFilter : undefined,
                ].filter(Boolean) as any,
              }
            : undefined,
        ].filter(Boolean) as any,
      },
      include: {
        prescriptions: {
          take: 10,
          orderBy: { issuedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPatient(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        prescriptions: {
          include: {
            lines: {
              include: { item: true },
            },
          },
          orderBy: { issuedAt: 'desc' },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    return patient;
  }

  async createPatient(data: CreatePatientDto) {
    let mrn: string = data.mrn?.trim() || '';
    if (!mrn) {
      // Auto-generate a unique MRN
      const count = await this.prisma.patient.count({
        where: { tenantId: data.tenantId }
      });
      let nextNum = count + 1001;
      let unique = false;
      while (!unique) {
        mrn = `MRN-${nextNum}`;
        const check = await this.prisma.patient.findUnique({
          where: { mrn }
        });
        if (!check) {
          unique = true;
        } else {
          nextNum++;
        }
      }
    } else {
      const existing = await this.prisma.patient.findUnique({
        where: { mrn },
      });
      if (existing) {
        throw new BadRequestException(`Patient with MRN ${mrn} already exists`);
      }
    }

    const patient = await this.prisma.patient.create({
      data: {
        tenantId: data.tenantId,
        mrn: mrn,
        name: data.name,
        preferredName: data.preferredName,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender || 'UNSPECIFIED',
        phone: data.phone,
        email: data.email,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        smsOptIn: data.smsOptIn !== undefined ? data.smsOptIn : true,
        deceased: data.deceased !== undefined ? data.deceased : false,
        
        allergies: data.allergies,
        conditions: data.conditions,
        weight: data.weight ? parseFloat(data.weight as any) : null,
        height: data.height ? parseFloat(data.height as any) : null,
        pregnancyStatus: data.pregnancyStatus || 'NOT_PREGNANT',
        
        insBin: data.insBin,
        insPcn: data.insPcn,
        insGroup: data.insGroup,
        insMemberId: data.insMemberId,
        insRelationship: data.insRelationship || '01_CARDHOLDER',
        insCopayPreference: data.insCopayPreference || 'PAY_AT_PICKUP',
        
        hipaaSigned: data.hipaaSigned !== undefined ? data.hipaaSigned : false,
        hipaaSignedDate: data.hipaaSignedDate ? new Date(data.hipaaSignedDate) : null,
        safetyCapWaiver: data.safetyCapWaiver !== undefined ? data.safetyCapWaiver : false,
        safetyCapWaiverDate: data.safetyCapWaiverDate ? new Date(data.safetyCapWaiverDate) : null,
        pickupAuthReps: data.pickupAuthReps,
        consentFlags: data.consentFlags,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        tenantId: data.tenantId,
        action: 'patient_created',
        entityType: 'Patient',
        entityId: patient.id,
        after: JSON.stringify(patient),
      },
    });

    return patient;
  }

  async updatePatient(id: string, data: Partial<CreatePatientDto>) {
    const existing = await this.getPatient(id);

    const updated = await this.prisma.patient.update({
      where: { id },
      data: {
        name: data.name,
        preferredName: data.preferredName,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender,
        phone: data.phone,
        email: data.email,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        smsOptIn: data.smsOptIn,
        deceased: data.deceased,
        
        allergies: data.allergies,
        conditions: data.conditions,
        weight: data.weight ? parseFloat(data.weight as any) : null,
        height: data.height ? parseFloat(data.height as any) : null,
        pregnancyStatus: data.pregnancyStatus,
        
        insBin: data.insBin,
        insPcn: data.insPcn,
        insGroup: data.insGroup,
        insMemberId: data.insMemberId,
        insRelationship: data.insRelationship,
        insCopayPreference: data.insCopayPreference,
        
        hipaaSigned: data.hipaaSigned,
        hipaaSignedDate: data.hipaaSignedDate ? new Date(data.hipaaSignedDate) : null,
        safetyCapWaiver: data.safetyCapWaiver,
        safetyCapWaiverDate: data.safetyCapWaiverDate ? new Date(data.safetyCapWaiverDate) : null,
        pickupAuthReps: data.pickupAuthReps,
        consentFlags: data.consentFlags,
      },
    });

    await this.prisma.auditEvent.create({
      data: {
        tenantId: updated.tenantId,
        action: 'patient_updated',
        entityType: 'Patient',
        entityId: updated.id,
        before: JSON.stringify(existing),
        after: JSON.stringify(updated),
      },
    });

    return updated;
  }
}
