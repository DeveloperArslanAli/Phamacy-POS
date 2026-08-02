import { PrismaService } from './prisma.service';
import { tenantContext } from '../common/tenant-context';

async function test() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  console.log('=== MULTI-TENANT ISOLATION TEST SUITE ===');

  // Test 1: HMAT Central Tenant (Ali Pharmacist)
  console.log('\n[TEST 1] Querying as tenant-hmat (Ali Pharmacist)...');
  await tenantContext.run({ tenantId: 'tenant-hmat', isAdmin: false }, async () => {
    const items = await prisma.item.findMany();
    console.log(`-> Retrieved ${items.length} items.`);
    
    const leak = items.some(i => i.tenantId !== 'tenant-hmat');
    if (leak) {
      console.error('❌ FAIL: Leaked data from other tenants!');
    } else {
      console.log('✅ PASS: Items are strictly isolated.');
    }

    const balances = await prisma.inventoryBalance.findMany();
    console.log(`-> Retrieved ${balances.length} inventory balances.`);
    const balanceLeak = balances.some(b => b.tenantId !== 'tenant-hmat');
    if (balanceLeak) {
      console.error('❌ FAIL: Leaked inventory balances from other tenants!');
    } else {
      console.log('✅ PASS: Inventory balances are strictly isolated.');
    }
  });

  // Test 2: Mart Pharmacy Tenant (Mart Pharmacist)
  console.log('\n[TEST 2] Querying as tenant-mart (Mart Pharmacist)...');
  await tenantContext.run({ tenantId: 'tenant-mart', isAdmin: false }, async () => {
    const items = await prisma.item.findMany();
    console.log(`-> Retrieved ${items.length} items.`);
    
    const leak = items.some(i => i.tenantId !== 'tenant-mart');
    if (leak) {
      console.error('❌ FAIL: Leaked data from other tenants!');
    } else {
      console.log('✅ PASS: Items are strictly isolated.');
    }

    const balances = await prisma.inventoryBalance.findMany();
    console.log(`-> Retrieved ${balances.length} inventory balances.`);
    const balanceLeak = balances.some(b => b.tenantId !== 'tenant-mart');
    if (balanceLeak) {
      console.error('❌ FAIL: Leaked inventory balances from other tenants!');
    } else {
      console.log('✅ PASS: Inventory balances are strictly isolated.');
    }
  });

  console.log('\n=== TEST SUITE COMPLETED ===');
  await prisma.onModuleDestroy();
}

test().catch(console.error);
