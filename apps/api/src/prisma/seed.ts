import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding HMAT Pharmacy Database...');

  // 1. Tenant & Location
  const tenant = await prisma.tenant.upsert({
    where: { id: 'tenant-hmat' },
    update: {},
    create: {
      id: 'tenant-hmat',
      pharmacyName: 'HMAT Pharmacy Central',
      status: 'active',
      timezone: 'UTC',
      locale: 'en-US',
    },
  });

  const location = await prisma.location.upsert({
    where: { tenantId_code: { tenantId: tenant.id, code: 'MAIN' } },
    update: {},
    create: {
      id: 'location-main',
      tenantId: tenant.id,
      code: 'MAIN',
      name: 'Main Counter Store',
      address: '742 Evergreen Terrace',
    },
  });

  // 2. Active License
  await prisma.license.upsert({
    where: { id: 'lic-hmat-active' },
    update: { expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    create: {
      id: 'lic-hmat-active',
      tenantId: tenant.id,
      status: 'active',
      planCode: 'enterprise_pos',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  // 3. Staff Users & Roles
  // Delete the old default admin user
  await prisma.user.deleteMany({
    where: { email: 'admin@hmatpharmacy.local' }
  });

  const sysadminHash = await bcrypt.hash('SysAdmin2026!', 10);
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'sysadmin@hmatpharmacy.local' } },
    update: { passwordHash: sysadminHash, role: 'admin', displayName: 'System Admin' },
    create: {
      id: 'user-sysadmin',
      tenantId: tenant.id,
      email: 'sysadmin@hmatpharmacy.local',
      passwordHash: sysadminHash,
      displayName: 'System Admin',
      role: 'admin',
      status: 'active',
    },
  });

  const passwordHash = await bcrypt.hash('admin1234', 10);

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'pharmacist@hmatpharmacy.local' } },
    update: { passwordHash, role: 'pharmacist', displayName: 'Dr. Alan Grant, PharmD' },
    create: {
      id: 'user-pharmacist',
      tenantId: tenant.id,
      email: 'pharmacist@hmatpharmacy.local',
      passwordHash,
      displayName: 'Dr. Alan Grant, PharmD',
      role: 'pharmacist',
      status: 'active',
    },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'cashier@hmatpharmacy.local' } },
    update: { passwordHash, role: 'cashier', displayName: 'Front Desk Cashier' },
    create: {
      id: 'user-cashier',
      tenantId: tenant.id,
      email: 'cashier@hmatpharmacy.local',
      passwordHash,
      displayName: 'Front Desk Cashier',
      role: 'cashier',
      status: 'active',
    },
  });

  // ========== SECOND TENANT: Mart Pharmacy ==========
  const tenantMart = await prisma.tenant.upsert({
    where: { id: 'tenant-mart' },
    update: {},
    create: {
      id: 'tenant-mart',
      pharmacyName: 'Mart Pharmacy',
      status: 'active',
      timezone: 'UTC',
      locale: 'en-US',
    },
  });

  await prisma.location.upsert({
    where: { tenantId_code: { tenantId: tenantMart.id, code: 'MAIN' } },
    update: {},
    create: {
      id: 'location-mart-main',
      tenantId: tenantMart.id,
      code: 'MAIN',
      name: 'Mart Counter Store',
      address: '101 Commerce Ave',
    },
  });

  await prisma.license.upsert({
    where: { id: 'lic-mart-active' },
    update: { expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    create: {
      id: 'lic-mart-active',
      tenantId: tenantMart.id,
      status: 'active',
      planCode: 'enterprise_pos',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenantMart.id, email: 'pharmacist@martpharmacy.local' } },
    update: { passwordHash, role: 'pharmacist', displayName: 'Mart Pharmacist' },
    create: {
      id: 'user-mart-pharmacist',
      tenantId: tenantMart.id,
      email: 'pharmacist@martpharmacy.local',
      passwordHash,
      displayName: 'Mart Pharmacist',
      role: 'pharmacist',
      status: 'active',
    },
  });

  console.log('Mart Pharmacy tenant seeded successfully.');

  // 4. Patients
  const patient1 = await prisma.patient.upsert({
    where: { mrn: 'MRN-1001' },
    update: {
      preferredName: 'Janie',
      dateOfBirth: new Date('1985-04-12'),
      gender: 'FEMALE',
      email: 'jane.doe@gmail.com',
      addressLine1: '123 Maple Street',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62701',
      smsOptIn: true,
      deceased: false,
      allergies: 'Penicillins, Cephalosporins',
      conditions: 'Hypertension, Asthma',
      weight: 65.5,
      height: 165,
      pregnancyStatus: 'PREGNANT',
      insBin: '004336',
      insPcn: 'ADV',
      insGroup: 'RX1002',
      insMemberId: 'XY987654321',
      insRelationship: '01_CARDHOLDER',
      insCopayPreference: 'PAY_AT_PICKUP',
      hipaaSigned: true,
      hipaaSignedDate: new Date('2025-01-10'),
      safetyCapWaiver: false,
      pickupAuthReps: 'John Doe (Spouse)',
      consentFlags: 'HIPAA_ACKNOWLEDGED',
    },
    create: {
      id: 'patient-jane-doe',
      tenantId: tenant.id,
      mrn: 'MRN-1001',
      name: 'Jane Doe',
      phone: '+1 (555) 019-2831',
      preferredName: 'Janie',
      dateOfBirth: new Date('1985-04-12'),
      gender: 'FEMALE',
      email: 'jane.doe@gmail.com',
      addressLine1: '123 Maple Street',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62701',
      smsOptIn: true,
      deceased: false,
      allergies: 'Penicillins, Cephalosporins',
      conditions: 'Hypertension, Asthma',
      weight: 65.5,
      height: 165,
      pregnancyStatus: 'PREGNANT',
      insBin: '004336',
      insPcn: 'ADV',
      insGroup: 'RX1002',
      insMemberId: 'XY987654321',
      insRelationship: '01_CARDHOLDER',
      insCopayPreference: 'PAY_AT_PICKUP',
      hipaaSigned: true,
      hipaaSignedDate: new Date('2025-01-10'),
      safetyCapWaiver: false,
      pickupAuthReps: 'John Doe (Spouse)',
      consentFlags: 'HIPAA_ACKNOWLEDGED',
    },
  });

  const patient2 = await prisma.patient.upsert({
    where: { mrn: 'MRN-1002' },
    update: {
      dateOfBirth: new Date('1972-11-23'),
      gender: 'MALE',
      email: 'john.smith@yahoo.com',
      addressLine1: '456 Oak Avenue',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60605',
      smsOptIn: true,
      deceased: false,
      allergies: 'Sulfa',
      conditions: 'Type 2 Diabetes, Hyperlipidemia',
      weight: 88.2,
      height: 180,
      pregnancyStatus: 'NOT_PREGNANT',
      insBin: '610014',
      insPcn: 'PRX',
      insGroup: 'DIABETES2',
      insMemberId: 'MEMBER5544',
      insRelationship: '01_CARDHOLDER',
      insCopayPreference: 'AUTO_CHARGE_CARD',
      hipaaSigned: true,
      hipaaSignedDate: new Date('2024-06-15'),
      safetyCapWaiver: true,
      safetyCapWaiverDate: new Date('2024-06-15'),
      pickupAuthReps: 'Mary Smith (Wife), Sarah Smith (Daughter)',
    },
    create: {
      id: 'patient-john-smith',
      tenantId: tenant.id,
      mrn: 'MRN-1002',
      name: 'John Smith',
      phone: '+1 (555) 014-9922',
      dateOfBirth: new Date('1972-11-23'),
      gender: 'MALE',
      email: 'john.smith@yahoo.com',
      addressLine1: '456 Oak Avenue',
      city: 'Chicago',
      state: 'IL',
      postalCode: '60605',
      smsOptIn: true,
      deceased: false,
      allergies: 'Sulfa',
      conditions: 'Type 2 Diabetes, Hyperlipidemia',
      weight: 88.2,
      height: 180,
      pregnancyStatus: 'NOT_PREGNANT',
      insBin: '610014',
      insPcn: 'PRX',
      insGroup: 'DIABETES2',
      insMemberId: 'MEMBER5544',
      insRelationship: '01_CARDHOLDER',
      insCopayPreference: 'AUTO_CHARGE_CARD',
      hipaaSigned: true,
      hipaaSignedDate: new Date('2024-06-15'),
      safetyCapWaiver: true,
      safetyCapWaiverDate: new Date('2024-06-15'),
      pickupAuthReps: 'Mary Smith (Wife), Sarah Smith (Daughter)',
    },
  });

  const patient3 = await prisma.patient.upsert({
    where: { mrn: 'MRN-1003' },
    update: {
      dateOfBirth: new Date('1998-07-04'),
      gender: 'MALE',
      email: 'robert.chen@outlook.com',
      addressLine1: '789 Pine Road',
      city: 'Evanston',
      state: 'IL',
      postalCode: '60201',
      smsOptIn: false,
      deceased: false,
      allergies: 'None Listed',
      conditions: 'Allergic Rhinitis',
      weight: 70.0,
      height: 175,
      pregnancyStatus: 'NOT_PREGNANT',
      insBin: '012815',
      insPcn: 'MEDD',
      insGroup: 'EVANPPO',
      insMemberId: 'RC778811',
      insRelationship: '03_CHILD',
      insCopayPreference: 'PAY_AT_PICKUP',
      hipaaSigned: false,
      safetyCapWaiver: false,
    },
    create: {
      id: 'patient-robert-chen',
      tenantId: tenant.id,
      mrn: 'MRN-1003',
      name: 'Robert Chen',
      phone: '+1 (555) 018-4411',
      dateOfBirth: new Date('1998-07-04'),
      gender: 'MALE',
      email: 'robert.chen@outlook.com',
      addressLine1: '789 Pine Road',
      city: 'Evanston',
      state: 'IL',
      postalCode: '60201',
      smsOptIn: false,
      deceased: false,
      allergies: 'None Listed',
      conditions: 'Allergic Rhinitis',
      weight: 70.0,
      height: 175,
      pregnancyStatus: 'NOT_PREGNANT',
      insBin: '012815',
      insPcn: 'MEDD',
      insGroup: 'EVANPPO',
      insMemberId: 'RC778811',
      insRelationship: '03_CHILD',
      insCopayPreference: 'PAY_AT_PICKUP',
      hipaaSigned: false,
      safetyCapWaiver: false,
    },
  });

  // 5. Pharmaceutical Catalog Items (Enriched with Industrial Fields)
  const itemAmox = await prisma.item.upsert({
    where: { tenantId_sku: { tenantId: tenant.id, sku: 'RX-2001' } },
    update: {
      ndc: '00093-3109-05',
      deaSchedule: 'non_controlled',
      dosageForm: 'capsule',
      strength: '500mg',
      route: 'oral',
      packageSize: 100,
      genericName: 'Amoxicillin Trihydrate',
      category: 'Antibiotics',
      binLocation: 'Aisle 3 - Shelf B1',
      storageCondition: 'room_temp',
      unitPrice: 18.5,
      unitCost: 4.5,
      awpPrice: 24.0,
      wacPrice: 4.5,
      macPrice: 12.0,
      manufacturer: 'Teva Pharmaceuticals',
      reorderPoint: 20,
      maxStockLevel: 500,
      isDscsaTrackable: true,
      is340bEligible: true,
    },
    create: {
      id: 'item-amox-500',
      tenantId: tenant.id,
      sku: 'RX-2001',
      name: 'Amoxicillin 500mg Capsules',
      ndc: '00093-3109-05',
      deaSchedule: 'non_controlled',
      dosageForm: 'capsule',
      strength: '500mg',
      route: 'oral',
      packageSize: 100,
      genericName: 'Amoxicillin Trihydrate',
      category: 'Antibiotics',
      type: 'rx',
      storageCondition: 'room_temp',
      binLocation: 'Aisle 3 - Shelf B1',
      unitPrice: 18.5,
      unitCost: 4.5,
      awpPrice: 24.0,
      wacPrice: 4.5,
      macPrice: 12.0,
      manufacturer: 'Teva Pharmaceuticals',
      taxCode: 'EXEMPT',
      reorderPoint: 20,
      maxStockLevel: 500,
      isDscsaTrackable: true,
      is340bEligible: true,
    },
  });

  const itemAdderall = await prisma.item.upsert({
    where: { tenantId_sku: { tenantId: tenant.id, sku: 'RX-C2-3001' } },
    update: {
      ndc: '55566-020-01',
      deaSchedule: 'c2',
      dosageForm: 'capsule',
      strength: '20mg',
      route: 'oral',
      packageSize: 100,
      genericName: 'Dextroamphetamine-Amphetamine',
      category: 'Central Nervous System',
      binLocation: 'Controlled Vault - Safe 1',
      storageCondition: 'controlled_vault',
      unitPrice: 65.0,
      unitCost: 22.0,
      awpPrice: 88.0,
      wacPrice: 22.0,
      macPrice: 45.0,
      manufacturer: 'Shire / Takeda',
      reorderPoint: 15,
      maxStockLevel: 150,
      isDscsaTrackable: true,
    },
    create: {
      id: 'item-adderall-20',
      tenantId: tenant.id,
      sku: 'RX-C2-3001',
      name: 'Adderall XR 20mg (Controlled C-II)',
      ndc: '55566-020-01',
      deaSchedule: 'c2',
      dosageForm: 'capsule',
      strength: '20mg',
      route: 'oral',
      packageSize: 100,
      genericName: 'Dextroamphetamine-Amphetamine',
      category: 'Central Nervous System',
      type: 'rx',
      storageCondition: 'controlled_vault',
      binLocation: 'Controlled Vault - Safe 1',
      unitPrice: 65.0,
      unitCost: 22.0,
      awpPrice: 88.0,
      wacPrice: 22.0,
      macPrice: 45.0,
      manufacturer: 'Shire / Takeda',
      taxCode: 'EXEMPT',
      reorderPoint: 15,
      maxStockLevel: 150,
      isDscsaTrackable: true,
    },
  });

  const itemLisinopril = await prisma.item.upsert({
    where: { tenantId_sku: { tenantId: tenant.id, sku: 'RX-2002' } },
    update: {
      ndc: '68180-0513-01',
      deaSchedule: 'non_controlled',
      dosageForm: 'tablet',
      strength: '10mg',
      route: 'oral',
      packageSize: 90,
      genericName: 'Lisinopril Dihydrate',
      category: 'Cardiovascular / Blood Pressure',
      binLocation: 'Aisle 1 - Shelf A4',
      storageCondition: 'room_temp',
      unitPrice: 12.0,
      unitCost: 2.1,
      awpPrice: 16.5,
      wacPrice: 2.1,
      macPrice: 8.0,
      manufacturer: 'Lupin Pharmaceuticals',
      reorderPoint: 25,
      maxStockLevel: 300,
      isDscsaTrackable: true,
      is340bEligible: true,
    },
    create: {
      id: 'item-lisinopril-10',
      tenantId: tenant.id,
      sku: 'RX-2002',
      name: 'Lisinopril 10mg Tablets',
      ndc: '68180-0513-01',
      deaSchedule: 'non_controlled',
      dosageForm: 'tablet',
      strength: '10mg',
      route: 'oral',
      packageSize: 90,
      genericName: 'Lisinopril Dihydrate',
      category: 'Cardiovascular / Blood Pressure',
      type: 'rx',
      storageCondition: 'room_temp',
      binLocation: 'Aisle 1 - Shelf A4',
      unitPrice: 12.0,
      unitCost: 2.1,
      awpPrice: 16.5,
      wacPrice: 2.1,
      macPrice: 8.0,
      manufacturer: 'Lupin Pharmaceuticals',
      reorderPoint: 25,
      maxStockLevel: 300,
      isDscsaTrackable: true,
      is340bEligible: true,
    },
  });

  const itemInsulin = await prisma.item.upsert({
    where: { tenantId_sku: { tenantId: tenant.id, sku: 'RX-COLD-4001' } },
    update: {
      ndc: '00024-5901-05',
      deaSchedule: 'non_controlled',
      dosageForm: 'injection',
      strength: '100u/mL',
      route: 'subcutaneous',
      packageSize: 5,
      genericName: 'Insulin Glargine',
      category: 'Endocrine / Diabetes',
      binLocation: 'Cold Refrigerator Unit 2',
      storageCondition: 'refrigerated',
      unitPrice: 120.0,
      unitCost: 55.0,
      awpPrice: 155.0,
      wacPrice: 55.0,
      macPrice: 95.0,
      manufacturer: 'Sanofi-Aventis',
      reorderPoint: 10,
      maxStockLevel: 50,
      isDscsaTrackable: true,
    },
    create: {
      id: 'item-insulin-pen',
      tenantId: tenant.id,
      sku: 'RX-COLD-4001',
      name: 'Lantus SoloStar Insulin Pen 100u/ml',
      ndc: '00024-5901-05',
      deaSchedule: 'non_controlled',
      dosageForm: 'injection',
      strength: '100u/mL',
      route: 'subcutaneous',
      packageSize: 5,
      genericName: 'Insulin Glargine',
      category: 'Endocrine / Diabetes',
      type: 'rx',
      storageCondition: 'refrigerated',
      binLocation: 'Cold Refrigerator Unit 2',
      unitPrice: 120.0,
      unitCost: 55.0,
      awpPrice: 155.0,
      wacPrice: 55.0,
      macPrice: 95.0,
      manufacturer: 'Sanofi-Aventis',
      taxCode: 'EXEMPT',
      reorderPoint: 10,
      maxStockLevel: 50,
      isDscsaTrackable: true,
    },
  });

  const itemOTC = await prisma.item.upsert({
    where: { tenantId_sku: { tenantId: tenant.id, sku: 'OTC-1001' } },
    update: {
      ndc: '50580-0498-08',
      deaSchedule: 'otc',
      dosageForm: 'oral_liquid',
      strength: '160mg/5mL',
      route: 'oral',
      packageSize: 1,
      genericName: 'Acetaminophen / Antihistamine',
      category: 'Over The Counter',
      binLocation: 'Front Counter Stand 3',
      storageCondition: 'room_temp',
      unitPrice: 9.5,
      unitCost: 3.2,
      awpPrice: 11.5,
      wacPrice: 3.2,
      macPrice: 6.0,
      manufacturer: 'McNeil Consumer Healthcare',
      reorderPoint: 30,
      maxStockLevel: 200,
      isDscsaTrackable: false,
    },
    create: {
      id: 'item-otc-pain',
      tenantId: tenant.id,
      sku: 'OTC-1001',
      name: 'Cold & Pain Relief Syrup 250ml',
      ndc: '50580-0498-08',
      deaSchedule: 'otc',
      dosageForm: 'oral_liquid',
      strength: '160mg/5mL',
      route: 'oral',
      packageSize: 1,
      genericName: 'Acetaminophen / Antihistamine',
      category: 'Over The Counter',
      type: 'otc',
      storageCondition: 'room_temp',
      binLocation: 'Front Counter Stand 3',
      unitPrice: 9.5,
      unitCost: 3.2,
      awpPrice: 11.5,
      wacPrice: 3.2,
      macPrice: 6.0,
      manufacturer: 'McNeil Consumer Healthcare',
      reorderPoint: 30,
      maxStockLevel: 200,
      isDscsaTrackable: false,
    },
  });

  // 6. FEFO & DSCSA Batch Lots & Stock Balances
  const batchAmoxNearExp = await prisma.batchLot.upsert({
    where: { itemId_batchNo: { itemId: itemAmox.id, batchNo: 'LOT-AMX-NEAR' } },
    update: {
      serialNumber: 'SN-2026-948102',
      purchaseOrderNo: 'PO-884920',
      invoiceNo: 'INV-MCK-1092',
      cost: 4.5,
      initialQty: 100,
      supplierName: 'AmerisourceBergen',
      receiptTemp: 21.5,
      status: 'expiring_soon',
      dscsaVerified: true,
    },
    create: {
      id: 'batch-amox-near',
      tenantId: tenant.id,
      itemId: itemAmox.id,
      batchNo: 'LOT-AMX-NEAR',
      serialNumber: 'SN-2026-948102',
      purchaseOrderNo: 'PO-884920',
      invoiceNo: 'INV-MCK-1092',
      expiryDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000), // Expiring in 18 days
      cost: 4.5,
      initialQty: 100,
      supplierName: 'AmerisourceBergen',
      receiptTemp: 21.5,
      status: 'expiring_soon',
      dscsaVerified: true,
    },
  });

  await prisma.inventoryBalance.upsert({
    where: {
      locationId_itemId_batchLotId: { locationId: location.id, itemId: itemAmox.id, batchLotId: batchAmoxNearExp.id },
    },
    update: { onHand: 40 },
    create: { tenantId: tenant.id, locationId: location.id, itemId: itemAmox.id, batchLotId: batchAmoxNearExp.id, onHand: 40 },
  });

  // Batch 2: Amoxicillin (Fresh Lot - FEFO Priority 2)
  const batchAmoxFresh = await prisma.batchLot.upsert({
    where: { itemId_batchNo: { itemId: itemAmox.id, batchNo: 'LOT-AMX-2027A' } },
    update: { cost: 4.5, initialQty: 250, supplierName: 'AmerisourceBergen', status: 'active' },
    create: {
      id: 'batch-amox-fresh',
      tenantId: tenant.id,
      itemId: itemAmox.id,
      batchNo: 'LOT-AMX-2027A',
      expiryDate: new Date('2027-10-15'),
      cost: 4.5,
      initialQty: 250,
      supplierName: 'AmerisourceBergen',
      status: 'active',
    },
  });

  await prisma.inventoryBalance.upsert({
    where: {
      locationId_itemId_batchLotId: { locationId: location.id, itemId: itemAmox.id, batchLotId: batchAmoxFresh.id },
    },
    update: { onHand: 210 },
    create: { tenantId: tenant.id, locationId: location.id, itemId: itemAmox.id, batchLotId: batchAmoxFresh.id, onHand: 210 },
  });

  // Batch 3: Insulin Pens Cold Storage
  const batchInsulin = await prisma.batchLot.upsert({
    where: { itemId_batchNo: { itemId: itemInsulin.id, batchNo: 'LOT-INS-COLD' } },
    update: { cost: 55.0, initialQty: 50, supplierName: 'McKesson Specialty', status: 'active' },
    create: {
      id: 'batch-insulin-1',
      tenantId: tenant.id,
      itemId: itemInsulin.id,
      batchNo: 'LOT-INS-COLD',
      expiryDate: new Date('2026-11-30'),
      cost: 55.0,
      initialQty: 50,
      supplierName: 'McKesson Specialty',
      status: 'active',
    },
  });

  await prisma.inventoryBalance.upsert({
    where: {
      locationId_itemId_batchLotId: { locationId: location.id, itemId: itemInsulin.id, batchLotId: batchInsulin.id },
    },
    update: { onHand: 24 },
    create: { tenantId: tenant.id, locationId: location.id, itemId: itemInsulin.id, batchLotId: batchInsulin.id, onHand: 24 },
  });

  // Batch 4: Adderall C-II Vault
  const batchAdderall = await prisma.batchLot.upsert({
    where: { itemId_batchNo: { itemId: itemAdderall.id, batchNo: 'LOT-ADD-VAULT' } },
    update: { cost: 22.0, initialQty: 120, supplierName: 'Cardinal Health', status: 'active' },
    create: {
      id: 'batch-adderall-1',
      tenantId: tenant.id,
      itemId: itemAdderall.id,
      batchNo: 'LOT-ADD-VAULT',
      expiryDate: new Date('2027-06-30'),
      cost: 22.0,
      initialQty: 120,
      supplierName: 'Cardinal Health',
      status: 'active',
    },
  });

  await prisma.inventoryBalance.upsert({
    where: {
      locationId_itemId_batchLotId: { locationId: location.id, itemId: itemAdderall.id, batchLotId: batchAdderall.id },
    },
    update: { onHand: 85 },
    create: { tenantId: tenant.id, locationId: location.id, itemId: itemAdderall.id, batchLotId: batchAdderall.id, onHand: 85 },
  });

  // 7. Clinical Prescription Queue Seeding
  await prisma.prescription.upsert({
    where: { rxNo: 'RX-9001' },
    update: {},
    create: {
      id: 'rx-9001',
      tenantId: tenant.id,
      patientId: patient1.id,
      rxNo: 'RX-9001',
      prescriberName: 'Dr. Sarah Jenkins, MD (NPI 184920491)',
      priority: 'stat',
      scheduleCode: 'legend',
      refillsAllowed: 3,
      refillsFilled: 0,
      status: 'received',
      lines: {
        create: [
          {
            tenantId: tenant.id,
            itemId: itemAmox.id,
            qty: 30,
            dosage: '500mg',
            directions: 'Take 1 capsule by mouth 3 times daily for 10 days with food.',
          },
        ],
      },
    },
  });

  await prisma.prescription.upsert({
    where: { rxNo: 'RX-9002' },
    update: {},
    create: {
      id: 'rx-9002',
      tenantId: tenant.id,
      patientId: patient2.id,
      rxNo: 'RX-9002',
      prescriberName: 'Dr. Michael Vance, MD (NPI 192830192)',
      priority: 'wait_in_store',
      scheduleCode: 'c2',
      refillsAllowed: 0,
      refillsFilled: 0,
      status: 'pending',
      lines: {
        create: [
          {
            tenantId: tenant.id,
            itemId: itemAdderall.id,
            qty: 30,
            dosage: '20mg',
            directions: 'Take 1 capsule by mouth every morning. Controlled C-II schedule.',
          },
        ],
      },
    },
  });

  console.log('Enriched Seeding complete! Catalog Items, Storage Conditions, Bin Locations, and FEFO Batch Lots generated.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
