import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { DeviceService } from './device.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
@Controller('devices')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get()
  @Permissions(Permission.KEY_REGISTRY)
  listDevices(@Query('tenantId') tenantId: string) {
    return this.deviceService.listDevices(tenantId);
  }

  @Get(':id')
  @Permissions(Permission.KEY_REGISTRY)
  getDevice(@Param('id') id: string) {
    return this.deviceService.getDevice(id);
  }

  @Post()
  @Permissions(Permission.KEY_REGISTRY)
  registerDevice(@Body() body: RegisterDeviceDto) {
    return this.deviceService.registerDevice(body);
  }
}
