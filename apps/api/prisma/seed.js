const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.auditEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.saleLine.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.prescriptionLine.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.inventoryBalance.deleteMany();
  await prisma.batchLot.deleteMany();
  await prisma.itemVariant.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.item.deleteMany();
  await prisma.user.deleteMany();
  await prisma.location.deleteMany();
  await prisma.tenant.deleteMany();

  // Create Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'HMAT Pharmacy Network',
      status: 'active',
      timezone: 'America/New_York',
      locale: 'en-US',
    },
  });

  console.log(`✅ Tenant created: ${tenant.id}`);

  // Create Locations
  const locationMain = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      code: 'LOC-001',
      name: 'Main Pharmacy',
      address: '123 Medical Ave, New York, NY 10001',
    },
  });

  const locationBranch = await prisma.location.create({
    data: {
      tenantId: tenant.id,
      code: 'LOC-002',
      name: 'Downtown Branch',
      address: '456 Health St, New York, NY 10002',
    },
  });

  console.log(`✅ Locations created: ${locationMain.id}, ${locationBranch.id}`);

  // Create Users
  const adminPasswordHash = await bcrypt.hash('admin1234', 10);
  const staffPasswordHash = await bcrypt.hash('staff1234', 10);

  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@hmatpharmacy.local',
      passwordHash: adminPasswordHash,
      displayName: 'System Admin',
      role: 'admin',
      status: 'active',
    },
  });

  const pharmacist = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'pharmacist@hmatpharmacy.local',
      passwordHash: staffPasswordHash,
      displayName: 'John Pharmacist',
      role: 'pharmacist',
      status: 'active',
    },
  });

  const cashier = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'cashier@hmatpharmacy.local',
      passwordHash: staffPasswordHash,
      displayName: 'Mary Cashier',
      role: 'cashier',
      status: 'active',
    },
  });

  console.log(`✅ Users created: ${admin.id}, ${pharmacist.id}, ${cashier.id}`);

  // Create Patients
  const patient1 = await prisma.patient.create({
    data: {
      tenantId: tenant.id,
      mrn: 'MRN-001',
      name: 'John Doe',
      phone: '+1-555-0101',
      allergies: 'Penicillin',
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      tenantId: tenant.id,
      mrn: 'MRN-002',
      name: 'Jane Smith',
      phone: '+1-555-0102',
      allergies: 'None',
    },
  });

  console.log(`✅ Patients created: ${patient1.id}, ${patient2.id}`);

  // Create Items (Medications)
  const itemAmoxicillin = await prisma.item.create({
    data: {
      tenantId: tenant.id,
      sku: 'MED-001',
      name: 'Amoxicillin 500mg',
      type: 'rx',
      taxCode: 'RX001',
      reorderPoint: 50,
    },
  });

  const itemIbuprofen = await prisma.item.create({
    data: {
      tenantId: tenant.id,
      sku: 'MED-002',
      name: 'Ibuprofen 200mg',
      type: 'otc',
      reorderPoint: 100,
    },
  });

  const itemMetformin = await prisma.item.create({
    data: {
      tenantId: tenant.id,
      sku: 'MED-003',
      name: 'Metformin 500mg',
      type: 'rx',
      taxCode: 'RX003',
      reorderPoint: 50,
    },
  });

  const itemLisinopril = await prisma.item.create({
    data: {
      tenantId: tenant.id,
      sku: 'MED-004',
      name: 'Lisinopril 10mg',
      type: 'rx',
      taxCode: 'RX004',
      reorderPoint: 40,
    },
  });

  const itemOmeprazole = await prisma.item.create({
    data: {
      tenantId: tenant.id,
      sku: 'MED-005',
      name: 'Omeprazole 20mg',
      type: 'rx',
      taxCode: 'RX005',
      reorderPoint: 30,
    },
  });

  console.log(
    `✅ Items created: ${itemAmoxicillin.id}, ${itemIbuprofen.id}, ${itemMetformin.id}, ${itemLisinopril.id}, ${itemOmeprazole.id}`,
  );

  // Create Item Variants
  const variantAmox = await prisma.itemVariant.create({
    data: {
      itemId: itemAmoxicillin.id,
      unitSize: '30 capsules',
      barcode: 'BAR-001001',
      uom: 'box',
    },
  });

  const variantIbup = await prisma.itemVariant.create({
    data: {
      itemId: itemIbuprofen.id,
      unitSize: '100 tablets',
      barcode: 'BAR-001002',
      uom: 'box',
    },
  });

  const variantMet = await prisma.itemVariant.create({
    data: {
      itemId: itemMetformin.id,
      unitSize: '60 tablets',
      barcode: 'BAR-001003',
      uom: 'box',
    },
  });

  const variantLis = await prisma.itemVariant.create({
    data: {
      itemId: itemLisinopril.id,
      unitSize: '90 tablets',
      barcode: 'BAR-001004',
      uom: 'box',
    },
  });

  const variantOme = await prisma.itemVariant.create({
    data: {
      itemId: itemOmeprazole.id,
      unitSize: '30 capsules',
      barcode: 'BAR-001005',
      uom: 'box',
    },
  });

  console.log(
    `✅ Item Variants created: ${variantAmox.id}, ${variantIbup.id}, ${variantMet.id}, ${variantLis.id}, ${variantOme.id}`,
  );

  // Create Batch Lots
  const batchAmox1 = await prisma.batchLot.create({
    data: {
      itemId: itemAmoxicillin.id,
      batchNo: 'LOT-2026-001-A',
      expiryDate: new Date('2026-01-15'),
      cost: 7.50,
      supplierId: 'SUPP-001',
    },
  });

  const batchIbup1 = await prisma.batchLot.create({
    data: {
      itemId: itemIbuprofen.id,
      batchNo: 'LOT-2026-002-B',
      expiryDate: new Date('2026-03-20'),
      cost: 4.50,
      supplierId: 'SUPP-002',
    },
  });

  const batchMet1 = await prisma.batchLot.create({
    data: {
      itemId: itemMetformin.id,
      batchNo: 'LOT-2026-003-C',
      expiryDate: new Date('2026-02-10'),
      cost: 6.25,
      supplierId: 'SUPP-003',
    },
  });

  const batchLis1 = await prisma.batchLot.create({
    data: {
      itemId: itemLisinopril.id,
      batchNo: 'LOT-2026-004-D',
      expiryDate: new Date('2026-04-05'),
      cost: 9.00,
      supplierId: 'SUPP-001',
    },
  });

  const batchOme1 = await prisma.batchLot.create({
    data: {
      itemId: itemOmeprazole.id,
      batchNo: 'LOT-2026-005-E',
      expiryDate: new Date('2026-05-12'),
      cost: 11.50,
      supplierId: 'SUPP-002',
    },
  });

  console.log(
    `✅ Batch Lots created: ${batchAmox1.id}, ${batchIbup1.id}, ${batchMet1.id}, ${batchLis1.id}, ${batchOme1.id}`,
  );

  // Create Inventory Balances
  const invBalAmox = await prisma.inventoryBalance.create({
    data: {
      locationId: locationMain.id,
      itemId: itemAmoxicillin.id,
      batchLotId: batchAmox1.id,
      onHand: 150,
      reserved: 10,
      quarantined: 0,
    },
  });

  const invBalIbup = await prisma.inventoryBalance.create({
    data: {
      locationId: locationMain.id,
      itemId: itemIbuprofen.id,
      batchLotId: batchIbup1.id,
      onHand: 500,
      reserved: 50,
      quarantined: 0,
    },
  });

  const invBalMet = await prisma.inventoryBalance.create({
    data: {
      locationId: locationMain.id,
      itemId: itemMetformin.id,
      batchLotId: batchMet1.id,
      onHand: 200,
      reserved: 20,
      quarantined: 0,
    },
  });

  const invBalLis = await prisma.inventoryBalance.create({
    data: {
      locationId: locationMain.id,
      itemId: itemLisinopril.id,
      batchLotId: batchLis1.id,
      onHand: 300,
      reserved: 30,
      quarantined: 0,
    },
  });

  const invBalOme = await prisma.inventoryBalance.create({
    data: {
      locationId: locationMain.id,
      itemId: itemOmeprazole.id,
      batchLotId: batchOme1.id,
      onHand: 100,
      reserved: 5,
      quarantined: 0,
    },
  });

  console.log(
    `✅ Inventory Balances created for main location: ${invBalAmox.id}, ${invBalIbup.id}, ${invBalMet.id}, ${invBalLis.id}, ${invBalOme.id}`,
  );

  // Create Prescriptions
  const prescription1 = await prisma.prescription.create({
    data: {
      tenantId: tenant.id,
      patientId: patient1.id,
      prescriberId: pharmacist.id,
      rxNo: 'RX-2026-001',
      status: 'received',
      issuedAt: new Date(),
      lines: {
        create: [
          {
            itemId: itemAmoxicillin.id,
            qty: 30,
            dosage: '500mg',
            directions: 'Take three times daily for 10 days',
          },
        ],
      },
    },
  });

  const prescription2 = await prisma.prescription.create({
    data: {
      tenantId: tenant.id,
      patientId: patient2.id,
      prescriberId: pharmacist.id,
      rxNo: 'RX-2026-002',
      status: 'received',
      issuedAt: new Date(),
      lines: {
        create: [
          {
            itemId: itemMetformin.id,
            qty: 60,
            dosage: '500mg',
            directions: 'Take twice daily before meals',
          },
        ],
      },
    },
  });

  const prescription3 = await prisma.prescription.create({
    data: {
      tenantId: tenant.id,
      patientId: patient1.id,
      prescriberId: pharmacist.id,
      rxNo: 'RX-2026-003',
      status: 'received',
      issuedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      lines: {
        create: [
          {
            itemId: itemLisinopril.id,
            qty: 30,
            dosage: '10mg',
            directions: 'Take once daily in the morning',
          },
        ],
      },
    },
  });

  console.log(
    `✅ Prescriptions created: ${prescription1.id}, ${prescription2.id}, ${prescription3.id}`,
  );

  // Create Sales
  const sale1 = await prisma.sale.create({
    data: {
      tenantId: tenant.id,
      locationId: locationMain.id,
      cashierId: cashier.id,
      status: 'completed',
      totals: 51.81,
      tenderedAt: new Date(),
      lines: {
        create: [
          {
            itemId: itemAmoxicillin.id,
            qty: 1,
            unitPrice: 15.99,
            discount: 0,
            tax: 1.28,
          },
          {
            itemId: itemIbuprofen.id,
            qty: 2,
            unitPrice: 8.99,
            discount: 0,
            tax: 1.44,
          },
          {
            itemId: itemOmeprazole.id,
            qty: 1,
            unitPrice: 22.99,
            discount: 5.99,
            tax: 1.12,
          },
        ],
      },
    },
  });

  const sale2 = await prisma.sale.create({
    data: {
      tenantId: tenant.id,
      locationId: locationMain.id,
      cashierId: cashier.id,
      status: 'completed',
      totals: 66.15,
      tenderedAt: new Date(),
      lines: {
        create: [
          {
            itemId: itemMetformin.id,
            qty: 2,
            unitPrice: 12.50,
            discount: 0,
            tax: 2.00,
          },
          {
            itemId: itemLisinopril.id,
            qty: 3,
            unitPrice: 18.75,
            discount: 0,
            tax: 4.50,
          },
        ],
      },
    },
  });

  console.log(`✅ Sales created: ${sale1.id}, ${sale2.id}`);

  // Create Payments
  const payment1 = await prisma.payment.create({
    data: {
      saleId: sale1.id,
      amount: 51.81,
      method: 'cash',
      status: 'completed',
    },
  });

  const payment2 = await prisma.payment.create({
    data: {
      saleId: sale2.id,
      amount: 66.15,
      method: 'card',
      status: 'completed',
      providerRef: 'CARD-TXN-2026-0002',
    },
  });

  console.log(`✅ Payments created: ${payment1.id}, ${payment2.id}`);

  // Create Audit Events
  await prisma.auditEvent.create({
    data: {
      tenantId: tenant.id,
      actorId: admin.id,
      action: 'DATABASE_INIT',
      entityType: 'Database',
      entityId: tenant.id,
      after: JSON.stringify({ status: 'initialized', recordCount: 15 }),
    },
  });

  console.log('✅ Audit events created');

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
