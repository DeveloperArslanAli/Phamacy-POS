import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { AuditService } from './audit.service';

@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
@Permissions(Permission.SECURITY_LOGS)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  listAuditEvents(@Query('tenantId') tenantId: string) {
    return this.auditService.listAuditEvents(tenantId);
  }

  @Get(':id')
  getAuditEvent(@Param('id') id: string) {
    return this.auditService.getAuditEvent(id);
  }
}
