import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { PrescriptionsService } from './prescriptions.service';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
@Permissions(Permission.POS)
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get()
  async listPrescriptions(
    @Query('tenantId') tenantId?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('q') query?: string,
  ) {
    return this.prescriptionsService.listPrescriptions(tenantId, status, priority, query);
  }

  @Get(':id')
  async getPrescription(@Param('id') id: string) {
    return this.prescriptionsService.getPrescription(id);
  }

  @Post()
  async createPrescription(
    @Body()
    body: {
      tenantId: string;
      patientId: string;
      prescriberId?: string;
      prescriberName?: string;
      priority?: string;
      scheduleCode?: string;
      refillsAllowed?: number;
      rxNo: string;
      lines: Array<{ itemId: string; qty: number; dosage?: string; directions?: string }>;
    },
  ) {
    return this.prescriptionsService.createPrescription(body);
  }

  @Post(':id/verify')
  async verifyPrescription(@Param('id') id: string, @Body() body: { pharmacistId: string; notes?: string }) {
    return this.prescriptionsService.verifyPrescription(id, body);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string; reason?: string; actorId?: string }) {
    return this.prescriptionsService.updatePrescriptionStatus(id, body);
  }
}
