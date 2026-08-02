import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { TenantService } from './tenant.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Permissions(Permission.TENANT_MGMT)
@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  listTenants() {
    return this.tenantService.listTenants();
  }

  @Post()
  createTenant(@Body() body: { name: string }) {
    return this.tenantService.createTenant(body.name);
  }
}
