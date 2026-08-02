import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';

@Controller('patients')
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
@Permissions(Permission.PATIENTS)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  listPatients(@Query('tenantId') tenantId?: string, @Query('q') query?: string) {
    return this.patientsService.listPatients(tenantId, query);
  }

  @Get(':id')
  getPatient(@Param('id') id: string) {
    return this.patientsService.getPatient(id);
  }

  @Post()
  createPatient(@Body() body: CreatePatientDto) {
    return this.patientsService.createPatient(body);
  }

  @Patch(':id')
  updatePatient(@Param('id') id: string, @Body() body: Partial<CreatePatientDto>) {
    return this.patientsService.updatePatient(id, body);
  }
}
