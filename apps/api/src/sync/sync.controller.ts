import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { SyncService } from './sync.service';

@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('outbox')
  listOutboxEvents(@Query('tenantId') tenantId: string) {
    return this.syncService.listOutboxEvents(tenantId);
  }

  @Post('outbox')
  createOutboxEvent(
    @Body()
    body: {
      tenantId: string;
      aggregateType: string;
      aggregateId: string;
      eventType: string;
      payload: any;
    },
  ) {
    return this.syncService.createOutboxEvent(body);
  }

  @Post('outbox/:id/process')
  processOutboxEvent(@Param('id') id: string) {
    return this.syncService.processOutboxEvent(id);
  }
}
