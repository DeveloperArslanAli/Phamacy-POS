const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting SaaS Multi-Tenant Database Migration...');

  await prisma.$transaction(async (tx: any) => {
    // 1. Rename name to pharmacyName in Tenant
    console.log('Renaming name to pharmacyName in Tenant table...');
    await tx.$executeRawUnsafe(`ALTER TABLE "Tenant" RENAME COLUMN "name" TO "pharmacyName";`);

    // 2. Add nullable columns
    console.log('Adding nullable tenantId columns to business tables...');
    await tx.$executeRawUnsafe(`ALTER TABLE "ItemVariant" ADD COLUMN "tenantId" TEXT;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "BatchLot" ADD COLUMN "tenantId" TEXT;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "InventoryBalance" ADD COLUMN "tenantId" TEXT;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "InventoryMovement" ADD COLUMN "tenantId" TEXT;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "PrescriptionLine" ADD COLUMN "tenantId" TEXT;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "SaleLine" ADD COLUMN "tenantId" TEXT;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN "tenantId" TEXT;`);

    // 3. Backfill tenantId values based on parent relationships
    console.log('Backfilling tenantId values...');
    await tx.$executeRawUnsafe(`UPDATE "ItemVariant" iv SET "tenantId" = i."tenantId" FROM "Item" i WHERE iv."itemId" = i."id";`);
    await tx.$executeRawUnsafe(`UPDATE "BatchLot" bl SET "tenantId" = i."tenantId" FROM "Item" i WHERE bl."itemId" = i."id";`);
    await tx.$executeRawUnsafe(`UPDATE "InventoryBalance" ib SET "tenantId" = i."tenantId" FROM "Item" i WHERE ib."itemId" = i."id";`);
    await tx.$executeRawUnsafe(`UPDATE "InventoryMovement" im SET "tenantId" = i."tenantId" FROM "Item" i WHERE im."itemId" = i."id" AND im."tenantId" IS NULL;`);
    await tx.$executeRawUnsafe(`UPDATE "InventoryMovement" im SET "tenantId" = l."tenantId" FROM "Location" l WHERE im."fromLocationId" = l."id" AND im."tenantId" IS NULL;`);
    await tx.$executeRawUnsafe(`UPDATE "InventoryMovement" im SET "tenantId" = l."tenantId" FROM "Location" l WHERE im."toLocationId" = l."id" AND im."tenantId" IS NULL;`);
    await tx.$executeRawUnsafe(`UPDATE "PrescriptionLine" pl SET "tenantId" = p."tenantId" FROM "Prescription" p WHERE pl."prescriptionId" = p."id";`);
    await tx.$executeRawUnsafe(`UPDATE "SaleLine" sl SET "tenantId" = s."tenantId" FROM "Sale" s WHERE sl."saleId" = s."id";`);
    await tx.$executeRawUnsafe(`UPDATE "Payment" pay SET "tenantId" = s."tenantId" FROM "Sale" s WHERE pay."saleId" = s."id";`);

    // 4. Default backfills for safety
    await tx.$executeRawUnsafe(`UPDATE "ItemVariant" SET "tenantId" = 'tenant-hmat' WHERE "tenantId" IS NULL;`);
    await tx.$executeRawUnsafe(`UPDATE "BatchLot" SET "tenantId" = 'tenant-hmat' WHERE "tenantId" IS NULL;`);
    await tx.$executeRawUnsafe(`UPDATE "InventoryBalance" SET "tenantId" = 'tenant-hmat' WHERE "tenantId" IS NULL;`);
    await tx.$executeRawUnsafe(`UPDATE "InventoryMovement" SET "tenantId" = 'tenant-hmat' WHERE "tenantId" IS NULL;`);
    await tx.$executeRawUnsafe(`UPDATE "PrescriptionLine" SET "tenantId" = 'tenant-hmat' WHERE "tenantId" IS NULL;`);
    await tx.$executeRawUnsafe(`UPDATE "SaleLine" SET "tenantId" = 'tenant-hmat' WHERE "tenantId" IS NULL;`);
    await tx.$executeRawUnsafe(`UPDATE "Payment" SET "tenantId" = 'tenant-hmat' WHERE "tenantId" IS NULL;`);

    // 5. Make columns NOT NULL
    console.log('Marking tenantId columns as NOT NULL...');
    await tx.$executeRawUnsafe(`ALTER TABLE "ItemVariant" ALTER COLUMN "tenantId" SET NOT NULL;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "BatchLot" ALTER COLUMN "tenantId" SET NOT NULL;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "InventoryBalance" ALTER COLUMN "tenantId" SET NOT NULL;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "InventoryMovement" ALTER COLUMN "tenantId" SET NOT NULL;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "PrescriptionLine" ALTER COLUMN "tenantId" SET NOT NULL;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "SaleLine" ALTER COLUMN "tenantId" SET NOT NULL;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "Payment" ALTER COLUMN "tenantId" SET NOT NULL;`);

    // 6. Add Tenant table new SaaS fields
    console.log('Adding SaaS columns to Tenant table...');
    await tx.$executeRawUnsafe(`ALTER TABLE "Tenant" ADD COLUMN "ownerName" TEXT;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "Tenant" ADD COLUMN "email" TEXT;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "Tenant" ADD COLUMN "phone" TEXT;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "Tenant" ADD COLUMN "address" TEXT;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "Tenant" ADD COLUMN "licenseKey" TEXT;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "Tenant" ADD COLUMN "subscriptionPlan" TEXT NOT NULL DEFAULT 'standard';`);
    await tx.$executeRawUnsafe(`ALTER TABLE "Tenant" ADD COLUMN "expiryDate" TIMESTAMP(3);`);

    // 7. Create indexes and constraints
    console.log('Creating unique constraints, indexes and foreign key references...');
    await tx.$executeRawUnsafe(`CREATE INDEX "BatchLot_tenantId_idx" ON "BatchLot"("tenantId");`);
    await tx.$executeRawUnsafe(`CREATE INDEX "InventoryBalance_tenantId_idx" ON "InventoryBalance"("tenantId");`);
    await tx.$executeRawUnsafe(`CREATE INDEX "InventoryMovement_tenantId_idx" ON "InventoryMovement"("tenantId");`);
    await tx.$executeRawUnsafe(`CREATE INDEX "Payment_tenantId_idx" ON "Payment"("tenantId");`);
    await tx.$executeRawUnsafe(`CREATE INDEX "PrescriptionLine_tenantId_idx" ON "PrescriptionLine"("tenantId");`);
    await tx.$executeRawUnsafe(`CREATE INDEX "SaleLine_tenantId_idx" ON "SaleLine"("tenantId");`);
    await tx.$executeRawUnsafe(`CREATE UNIQUE INDEX "Tenant_licenseKey_key" ON "Tenant"("licenseKey");`);

    await tx.$executeRawUnsafe(`ALTER TABLE "ItemVariant" ADD CONSTRAINT "ItemVariant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "BatchLot" ADD CONSTRAINT "BatchLot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "PrescriptionLine" ADD CONSTRAINT "PrescriptionLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "SaleLine" ADD CONSTRAINT "SaleLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`);
    await tx.$executeRawUnsafe(`ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;`);
  });

  console.log('Migration completed successfully without any data loss!');
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
