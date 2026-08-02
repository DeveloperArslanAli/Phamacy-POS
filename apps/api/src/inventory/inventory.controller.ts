import { Body, Controller, Get, Param, Post, Query, UseGuards, Delete } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { TenantGuard } from '../auth/tenant.guard';
import { Permissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';
import { InventoryService } from './inventory.service';

@UseGuards(JwtAuthGuard, PermissionsGuard, TenantGuard)
@Permissions(Permission.INVENTORY)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('items')
  listItems(@Query('tenantId') tenantId?: string) {
    return this.inventoryService.listItems(tenantId);
  }

  @Get('items/:id')
  getItem(@Param('id') id: string) {
    return this.inventoryService.getItem(id);
  }

  @Delete('items/:id')
  deleteItem(@Param('id') id: string) {
    return this.inventoryService.deleteItem(id);
  }

  @Post('items')
  createItem(
    @Body()
    body: {
      tenantId: string;
      sku: string;
      name: string;
      ndc?: string;
      deaSchedule?: string;
      dosageForm?: string;
      strength?: string;
      route?: string;
      packageSize?: number;
      genericName?: string;
      category?: string;
      type?: string;
      storageCondition?: string;
      binLocation?: string;
      unitPrice?: number;
      unitCost?: number;
      awpPrice?: number;
      wacPrice?: number;
      macPrice?: number;
      manufacturer?: string;
      taxCode?: string;
      reorderPoint?: number;
      maxStockLevel?: number;
      isDscsaTrackable?: boolean;
      is340bEligible?: boolean;
      isHazardous?: boolean;
      barcode?: string;
      initialBatchNo?: string;
      initialExpiryDate?: string;
      initialQty?: number;
    },
  ) {
    return this.inventoryService.createItem(body);
  }

  @Get('balances')
  listBalances(@Query('locationId') locationId?: string) {
    return this.inventoryService.listBalances(locationId);
  }

  @Get('batches')
  listBatchLots(@Query('itemId') itemId?: string) {
    return this.inventoryService.listBatchLots(itemId);
  }

  @Post('batches')
  createBatchLot(
    @Body()
    body: {
      itemId: string;
      batchNo: string;
      serialNumber?: string;
      purchaseOrderNo?: string;
      invoiceNo?: string;
      expiryDate: string;
      cost?: number;
      initialQty?: number;
      supplierName?: string;
      receiptTemp?: number;
      locationId?: string;
    },
  ) {
    return this.inventoryService.createBatchLot(body);
  }

  @Post('adjustments')
  adjustStock(
    @Body()
    body: {
      tenantId: string;
      locationId: string;
      itemId: string;
      batchLotId: string;
      adjustmentType?: 'add' | 'deduct' | 'quarantine';
      reasonCode?: string;
      adjustmentQty: number;
      reason: string;
    },
  ) {
    return this.inventoryService.adjustStock(body);
  }

  @Get('movements')
  listMovements() {
    return this.inventoryService.listMovements();
  }

  @Get('valuation')
  getInventoryValuation(@Query('tenantId') tenantId?: string) {
    return this.inventoryService.getInventoryValuation(tenantId);
  }

  @Get('kpis')
  getPharmacyKpis(@Query('tenantId') tenantId?: string) {
    return this.inventoryService.getPharmacyKpis(tenantId);
  }

  @Get('expiry-alerts')
  getExpiryAlerts(@Query('tenantId') tenantId?: string) {
    return this.inventoryService.getExpiryAlerts(tenantId);
  }

  @Get('reorder-alerts')
  getReorderAlerts(@Query('tenantId') tenantId?: string) {
    return this.inventoryService.getReorderAlerts(tenantId);
  }
}
