import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { SaleService } from './sale.service';
import { CreateSaleDto } from './sale.dto';

@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
@Permissions(Permission.SALES)
@Controller('sales')
export class SaleController {
  constructor(private readonly saleService: SaleService) {}

  @Get()
  listSales(@Query('tenantId') tenantId?: string) {
    return this.saleService.listSales(tenantId);
  }

  @Post()
  createSale(@Body() body: CreateSaleDto) {
    return this.saleService.createSale(body);
  }
}
