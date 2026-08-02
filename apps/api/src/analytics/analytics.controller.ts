import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
@Permissions(Permission.REPORTS)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  async getSummary(
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const start = new Date(`${startDateStr}T00:00:00`);
    const end = new Date(`${endDateStr}T23:59:59.999`);
    return this.analyticsService.getSummary(start, end, tenantId);
  }

  @Get('reconciliation')
  async getReconciliation(@Query('tenantId') tenantId?: string) {
    return this.analyticsService.runReconciliationVerification(tenantId);
  }

  @Get('export/sales')
  async getSalesExport(
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
    @Query('tenantId') tenantId?: string,
  ) {
    const start = new Date(`${startDateStr}T00:00:00`);
    const end = new Date(`${endDateStr}T23:59:59.999`);
    return this.analyticsService.getSalesExportData(start, end, tenantId);
  }

  @Post('close-day')
  async closeDay(@Body('tenantId') tenantId: string) {
    return this.analyticsService.closeDayReport(tenantId);
  }
}
