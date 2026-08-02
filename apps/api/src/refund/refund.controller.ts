import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { RefundService } from './refund.service';
import { CreateRefundDto } from './dto/create-refund.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
@Permissions(Permission.SALES)
@Controller('refunds')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Get()
  listRefunds(@Query('tenantId') tenantId: string) {
    return this.refundService.listRefunds(tenantId);
  }

  @Get(':id')
  getRefund(@Param('id') id: string) {
    return this.refundService.getRefund(id);
  }

  @Post()
  requestRefund(@Body() body: CreateRefundDto) {
    return this.refundService.requestRefund(body);
  }

  @Post(':id/approve')
  approveRefund(@Param('id') id: string) {
    return this.refundService.approveRefund(id);
  }
}
