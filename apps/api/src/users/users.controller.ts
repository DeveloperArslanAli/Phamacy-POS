import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions(Permission.SETTINGS, Permission.LICENSE_MGMT)
  listUsers(@Query('tenantId') tenantId?: string) {
    return this.usersService.listUsers(tenantId);
  }

  @Get(':id')
  @Permissions(Permission.SETTINGS, Permission.LICENSE_MGMT)
  getUser(@Param('id') id: string) {
    return this.usersService.getUser(id);
  }

  @Post()
  @Permissions(Permission.SETTINGS, Permission.LICENSE_MGMT)
  createUser(@Body() body: { tenantId: string; email: string; displayName?: string; role?: string; password?: string }) {
    return this.usersService.createUser(body);
  }

  @Patch(':id/role')
  @Permissions(Permission.SETTINGS)
  updateUserRole(@Param('id') id: string, @Body() body: { role: string }) {
    return this.usersService.updateUserRole(id, body.role);
  }

  @Patch(':id/status')
  @Permissions(Permission.SETTINGS)
  updateUserStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.usersService.updateUserStatus(id, body.status);
  }
}
