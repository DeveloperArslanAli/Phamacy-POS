import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.auditEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.inventoryBalance.deleteMany();
  await prisma.batchLot.deleteMany();
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
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1980-05-15'),
      phone: '+1-555-0101',
      email: 'john.doe@email.com',
      status: 'active',
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      tenantId: tenant.id,
      firstName: 'Jane',
      lastName: 'Smith',
      dateOfBirth: new Date('1995-08-22'),
      phone: '+1-555-0102',
      email: 'jane.smith@email.com',
      status: 'active',
    },
  });

  console.log(`✅ Patients created: ${patient1.id}, ${patient2.id}`);

  // Create Items (Medications)
  const itemAmoxicillin = await prisma.item.create({
    data: {
      tenantId: tenant.id,
      sku: 'MED-001',
      name: 'Amoxicillin 500mg',
      category: 'Antibiotic',
      strength: '500mg',
      form: 'Capsule',
      packSize: 30,
      unitPrice: 15.99,
      status: 'active',
    },
  });

  const itemIbuprofen = await prisma.item.create({
    data: {
      tenantId: tenant.id,
      sku: 'MED-002',
      name: 'Ibuprofen 200mg',
      category: 'Pain Relief',
      strength: '200mg',
      form: 'Tablet',
      packSize: 100,
      unitPrice: 8.99,
      status: 'active',
    },
  });

  const itemMetformin = await prisma.item.create({
    data: {
      tenantId: tenant.id,
      sku: 'MED-003',
      name: 'Metformin 500mg',
      category: 'Diabetes',
      strength: '500mg',
      form: 'Tablet',
      packSize: 60,
      unitPrice: 12.50,
      status: 'active',
    },
  });

  const itemLisinopril = await prisma.item.create({
    data: {
      tenantId: tenant.id,
      sku: 'MED-004',
      name: 'Lisinopril 10mg',
      category: 'Blood Pressure',
      strength: '10mg',
      form: 'Tablet',
      packSize: 90,
      unitPrice: 18.75,
      status: 'active',
    },
  });

  const itemOmeprazole = await prisma.item.create({
    data: {
      tenantId: tenant.id,
      sku: 'MED-005',
      name: 'Omeprazole 20mg',
      category: 'GI Health',
      strength: '20mg',
      form: 'Capsule',
      packSize: 30,
      unitPrice: 22.99,
      status: 'active',
    },
  });

  console.log(
    `✅ Items created: ${itemAmoxicillin.id}, ${itemIbuprofen.id}, ${itemMetformin.id}, ${itemLisinopril.id}, ${itemOmeprazole.id}`,
  );

  // Create Batch Lots
  const batchAmox1 = await prisma.batchLot.create({
    data: {
      itemId: itemAmoxicillin.id,
      lotNumber: 'LOT-2026-001-A',
      manufacturerId: 'PHARM-MFG-001',
      manufacturerName: 'PharmaCorp Inc',
      mfgDate: new Date('2024-01-15'),
      expireDate: new Date('2026-01-15'),
      quantity: 500,
      cost: 7.50,
      status: 'active',
    },
  });

  const batchIbup1 = await prisma.batchLot.create({
    data: {
      itemId: itemIbuprofen.id,
      lotNumber: 'LOT-2026-002-B',
      manufacturerId: 'PHARM-MFG-002',
      manufacturerName: 'MediSupply Ltd',
      mfgDate: new Date('2024-03-20'),
      expireDate: new Date('2026-03-20'),
      quantity: 1000,
      cost: 4.50,
      status: 'active',
    },
  });

  const batchMet1 = await prisma.batchLot.create({
    data: {
      itemId: itemMetformin.id,
      lotNumber: 'LOT-2026-003-C',
      manufacturerId: 'PHARM-MFG-003',
      manufacturerName: 'GloboPharm',
      mfgDate: new Date('2024-02-10'),
      expireDate: new Date('2026-02-10'),
      quantity: 800,
      cost: 6.25,
      status: 'active',
    },
  });

  const batchLis1 = await prisma.batchLot.create({
    data: {
      itemId: itemLisinopril.id,
      lotNumber: 'LOT-2026-004-D',
      manufacturerId: 'PHARM-MFG-001',
      manufacturerName: 'PharmaCorp Inc',
      mfgDate: new Date('2024-04-05'),
      expireDate: new Date('2026-04-05'),
      quantity: 600,
      cost: 9.00,
      status: 'active',
    },
  });

  const batchOme1 = await prisma.batchLot.create({
    data: {
      itemId: itemOmeprazole.id,
      lotNumber: 'LOT-2026-005-E',
      manufacturerId: 'PHARM-MFG-002',
      manufacturerName: 'MediSupply Ltd',
      mfgDate: new Date('2024-05-12'),
      expireDate: new Date('2026-05-12'),
      quantity: 400,
      cost: 11.50,
      status: 'active',
    },
  });

  console.log(
    `✅ Batch Lots created: ${batchAmox1.id}, ${batchIbup1.id}, ${batchMet1.id}, ${batchLis1.id}, ${batchOme1.id}`,
  );

  // Create Inventory Balances
  const invBalAmox = await prisma.inventoryBalance.create({
    data: {
      itemId: itemAmoxicillin.id,
      locationId: locationMain.id,
      batchLotId: batchAmox1.id,
      onHand: 150,
      reserved: 10,
    },
  });

  const invBalIbup = await prisma.inventoryBalance.create({
    data: {
      itemId: itemIbuprofen.id,
      locationId: locationMain.id,
      batchLotId: batchIbup1.id,
      onHand: 500,
      reserved: 50,
    },
  });

  const invBalMet = await prisma.inventoryBalance.create({
    data: {
      itemId: itemMetformin.id,
      locationId: locationMain.id,
      batchLotId: batchMet1.id,
      onHand: 200,
      reserved: 20,
    },
  });

  const invBalLis = await prisma.inventoryBalance.create({
    data: {
      itemId: itemLisinopril.id,
      locationId: locationMain.id,
      batchLotId: batchLis1.id,
      onHand: 300,
      reserved: 30,
    },
  });

  const invBalOme = await prisma.inventoryBalance.create({
    data: {
      itemId: itemOmeprazole.id,
      locationId: locationMain.id,
      batchLotId: batchOme1.id,
      onHand: 100,
      reserved: 5,
    },
  });

  console.log(
    `✅ Inventory Balances created for main location: ${invBalAmox.id}, ${invBalIbup.id}, ${invBalMet.id}, ${invBalLis.id}, ${invBalOme.id}`,
  );

  // Create Prescriptions
  const prescription1 = await prisma.prescription.create({
    data: {
      patientId: patient1.id,
      itemId: itemAmoxicillin.id,
      prescribedByUserId: pharmacist.id,
      quantity: 30,
      dosage: '500mg',
      frequency: 'Three times daily',
      durationDays: 10,
      instructions: 'Take with food',
      status: 'pending',
      issuedDate: new Date(),
    },
  });

  const prescription2 = await prisma.prescription.create({
    data: {
      patientId: patient2.id,
      itemId: itemMetformin.id,
      prescribedByUserId: pharmacist.id,
      quantity: 60,
      dosage: '500mg',
      frequency: 'Twice daily',
      durationDays: 30,
      instructions: 'Take before meals',
      status: 'pending',
      issuedDate: new Date(),
    },
  });

  const prescription3 = await prisma.prescription.create({
    data: {
      patientId: patient1.id,
      itemId: itemLisinopril.id,
      prescribedByUserId: pharmacist.id,
      quantity: 30,
      dosage: '10mg',
      frequency: 'Once daily',
      durationDays: 30,
      instructions: 'Take in the morning',
      status: 'fulfilled',
      issuedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
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
      patientId: patient1.id,
      subtotal: 47.97,
      tax: 3.84,
      total: 51.81,
      status: 'completed',
      saleDate: new Date(),
      items: {
        create: [
          {
            itemId: itemAmoxicillin.id,
            quantity: 1,
            unitPrice: 15.99,
            discount: 0,
            lineTotal: 15.99,
          },
          {
            itemId: itemIbuprofen.id,
            quantity: 2,
            unitPrice: 8.99,
            discount: 0,
            lineTotal: 17.98,
          },
          {
            itemId: itemOmeprazole.id,
            quantity: 1,
            unitPrice: 22.99,
            discount: 5.99,
            lineTotal: 17.00,
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
      patientId: patient2.id,
      subtotal: 61.25,
      tax: 4.90,
      total: 66.15,
      status: 'completed',
      saleDate: new Date(),
      items: {
        create: [
          {
            itemId: itemMetformin.id,
            quantity: 2,
            unitPrice: 12.50,
            discount: 0,
            lineTotal: 25.00,
          },
          {
            itemId: itemLisinopril.id,
            quantity: 3,
            unitPrice: 18.75,
            discount: 0,
            lineTotal: 56.25,
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
      transactionId: 'TXN-2026-0001',
    },
  });

  const payment2 = await prisma.payment.create({
    data: {
      saleId: sale2.id,
      amount: 66.15,
      method: 'card',
      status: 'completed',
      transactionId: 'TXN-2026-0002',
    },
  });

  console.log(`✅ Payments created: ${payment1.id}, ${payment2.id}`);

  // Create Audit Events
  await prisma.auditEvent.create({
    data: {
      tenantId: tenant.id,
      userId: admin.id,
      action: 'DATABASE_INIT',
      resource: 'Database',
      details: 'Seeded initial pharmacy data for testing',
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
