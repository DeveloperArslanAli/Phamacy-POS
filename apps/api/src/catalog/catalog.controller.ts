import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { CatalogService } from './catalog.service';

@Controller('catalog')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('search')
  async search(
    @Query('q') q: string,
    @Query('tenantId') tenantId?: string,
    @Query('type') type?: string,
  ) {
    return this.catalogService.searchItems(q, tenantId, type);
  }
}
