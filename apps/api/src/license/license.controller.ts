import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { LicenseService } from './license.service';
import { CreateLicenseDto } from './dto/create-license.dto';
import { UpdateLicenseStatusDto } from './dto/update-license-status.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('licenses')
export class LicenseController {
  constructor(private readonly licenseService: LicenseService) {}

  @Get()
  @Permissions(Permission.LICENSE_MGMT)
  listLicenses(@Query('tenantId') tenantId: string) {
    return this.licenseService.listLicenses(tenantId);
  }

  @Get('tenant/:tenantId/validate')
  validateTenantLicense(@Param('tenantId') tenantId: string) {
    return this.licenseService.validateLicense(tenantId);
  }

  @Get(':id')
  @Permissions(Permission.LICENSE_MGMT)
  getLicense(@Param('id') id: string) {
    return this.licenseService.getLicense(id);
  }

  @Post()
  @Permissions(Permission.LICENSE_MGMT)
  createLicense(@Body() body: CreateLicenseDto) {
    return this.licenseService.createLicense(body);
  }

  @Patch(':id/status')
  @Permissions(Permission.LICENSE_MGMT)
  updateLicenseStatus(@Param('id') id: string, @Body() body: UpdateLicenseStatusDto) {
    return this.licenseService.updateLicenseStatus(id, body.status);
  }

  @Patch(':id')
  @Permissions(Permission.LICENSE_MGMT)
  updateLicense(
    @Param('id') id: string,
    @Body() body: { planCode?: string; expiresAt?: string; shopName?: string; email?: string }
  ) {
    return this.licenseService.updateLicense(id, {
      planCode: body.planCode,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      shopName: body.shopName,
      email: body.email,
    });
  }

  @Delete(':id')
  @Permissions(Permission.LICENSE_MGMT)
  deleteLicense(@Param('id') id: string) {
    return this.licenseService.deleteLicense(id);
  }
}
