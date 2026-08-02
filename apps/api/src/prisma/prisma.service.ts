import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { tenantContext } from '../common/tenant-context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private _extendedClient: any;

  constructor() {
    super();

    const tenantBoundModels = [
      'User',
      'Location',
      'Patient',
      'Item',
      'ItemVariant',
      'BatchLot',
      'InventoryBalance',
      'InventoryMovement',
      'Prescription',
      'PrescriptionLine',
      'Sale',
      'SaleLine',
      'Payment',
      'AuditEvent',
      'Refund',
      'License',
      'Device',
      'SyncOutbox',
      'Setting'
    ];

    this._extendedClient = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (tenantBoundModels.includes(model)) {
              const ctx = tenantContext.getStore();
              if (ctx) {
                const activeTenantId = ctx.tenantId;
                const isPlatformModel = ['User', 'License', 'AuditEvent'].includes(model);

                // If user is admin, bypass tenant isolation for platform administrative models
                if (!(ctx.isAdmin && isPlatformModel)) {
                  const anyArgs = args as any;
                  // Apply automatic filtering for reads
                  if (['findMany', 'findUnique', 'findFirst', 'count', 'aggregate', 'groupBy'].includes(operation)) {
                    anyArgs.where = anyArgs.where || {};
                    anyArgs.where.tenantId = activeTenantId;
                  }
                  // Apply automatic injection for creations
                  if (['create', 'createMany'].includes(operation)) {
                    if (operation === 'create') {
                      anyArgs.data = anyArgs.data || {};
                      anyArgs.data.tenantId = activeTenantId;
                    } else if (operation === 'createMany') {
                      anyArgs.data = anyArgs.data || [];
                      if (Array.isArray(anyArgs.data)) {
                        anyArgs.data.forEach((item: any) => {
                          item.tenantId = activeTenantId;
                        });
                      } else {
                        anyArgs.data.tenantId = activeTenantId;
                      }
                    }
                  }
                  // Apply automatic filtering for updates and deletes
                  if (['update', 'updateMany', 'delete', 'deleteMany', 'upsert'].includes(operation)) {
                    anyArgs.where = anyArgs.where || {};
                    anyArgs.where.tenantId = activeTenantId;
                    if (operation === 'upsert') {
                      anyArgs.create = anyArgs.create || {};
                      anyArgs.create.tenantId = activeTenantId;
                      anyArgs.update = anyArgs.update || {};
                      anyArgs.update.tenantId = activeTenantId;
                    }
                  }
                }
              }
            }

            return query(args);
          },
        },
      },
    });

    return new Proxy(this, {
      get: (target, prop) => {
        if (prop in target._extendedClient) {
          return target._extendedClient[prop];
        }
        return (target as any)[prop];
      },
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      console.warn('Prisma connection unavailable:', error);
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch {
      // Ignore
    }
  }
}
