import { Module } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { AppController } from './app.controller';
import { HealthController } from './modules/health/health.controller';
import { TenantController } from './tenant/tenant.controller';
import { TenantService } from './tenant/tenant.service';
import { InventoryController } from './inventory/inventory.controller';
import { InventoryService } from './inventory/inventory.service';
import { SaleController } from './sale/sale.controller';
import { SaleService } from './sale/sale.service';
import { AuthModule } from './auth/auth.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { CheckoutModule } from './checkout/checkout.module';
import { CatalogModule } from './catalog/catalog.module';
import { LicenseModule } from './license/license.module';
import { DeviceModule } from './device/device.module';
import { RefundModule } from './refund/refund.module';
import { AuditModule } from './audit/audit.module';
import { SyncModule } from './sync/sync.module';
import { PatientsModule } from './patients/patients.module';
import { UsersModule } from './users/users.module';
import { AnalyticsModule } from './analytics/analytics.module';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantInterceptor } from './auth/tenant.interceptor';

@Module({
  imports: [
    AuthModule,
    PrescriptionsModule,
    CheckoutModule,
    CatalogModule,
    LicenseModule,
    DeviceModule,
    RefundModule,
    AuditModule,
    SyncModule,
    PatientsModule,
    UsersModule,
    AnalyticsModule,
  ],
  controllers: [AppController, HealthController, TenantController, InventoryController, SaleController],
  providers: [
    PrismaService,
    TenantService,
    InventoryService,
    SaleService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule {}
