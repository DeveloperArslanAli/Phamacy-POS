import { PrismaService } from './prisma.service';
import { tenantContext } from '../common/tenant-context';
import { AnalyticsService } from '../analytics/analytics.service';

async function test() {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  
  const analyticsService = new AnalyticsService(prisma);

  console.log('=== VERIFY TODAY ANALYTICS TEST SUITE ===');

  const tenantId = 'tenant-hmat';

  // Retrieve existing main location and pharmacist user
  const location = await prisma.location.findFirst({ where: { tenantId } });
  const user = await prisma.user.findFirst({ where: { tenantId, role: 'pharmacist' } });

  if (!location || !user) {
    console.error('❌ FAIL: Seed location or user not found!');
    await prisma.onModuleDestroy();
    return;
  }

  // Define local today boundaries
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // 1. Fetch baseline summary
  let baselineOrders = 0;
  let baselineRevenue = 0;

  await tenantContext.run({ tenantId, isAdmin: false }, async () => {
    const summary = await analyticsService.getSummary(startOfToday, endOfToday, tenantId);
    baselineOrders = summary.financials.transactionCount;
    baselineRevenue = summary.financials.revenue;
    console.log(`[Baseline] Today's Orders: ${baselineOrders}, Today's Revenue: Rs. ${baselineRevenue}`);
  });

  // 2. Create a test sale created NOW (today)
  console.log('\nCreating a test sale transaction for today...');
  const testSale = await prisma.sale.create({
    data: {
      tenantId,
      locationId: location.id,
      cashierId: user.id,
      totals: 1500.0,
      status: 'completed',
      payments: {
        create: {
          tenantId,
          method: 'CASH',
          amount: 1500.0,
          status: 'completed',
        }
      }
    }
  });

  // 3. Fetch summary again and check if sale is included
  await tenantContext.run({ tenantId, isAdmin: false }, async () => {
    const summary = await analyticsService.getSummary(startOfToday, endOfToday, tenantId);
    const newOrders = summary.financials.transactionCount;
    const newRevenue = summary.financials.revenue;
    
    console.log(`[After Sale] Today's Orders: ${newOrders}, Today's Revenue: Rs. ${newRevenue}`);

    const orderDiff = newOrders - baselineOrders;
    const revenueDiff = newRevenue - baselineRevenue;

    console.log(`\nVerification Check:`);
    console.log(`-> Order Difference: ${orderDiff} (Expected: 1)`);
    console.log(`-> Revenue Difference: Rs. ${revenueDiff} (Expected: Rs. 1500)`);

    if (orderDiff === 1 && revenueDiff === 1500) {
      console.log('✅ SUCCESS: Today\'s sales are immediately and correctly captured in Daily Analytics!');
    } else {
      console.error('❌ FAIL: Today\'s sales were NOT captured in Daily Analytics!');
    }
  });

  // 4. Cleanup
  console.log('\nCleaning up test sale...');
  await prisma.payment.deleteMany({ where: { saleId: testSale.id } });
  await prisma.sale.delete({ where: { id: testSale.id } });
  console.log('Cleanup finished.');

  console.log('\n=== TEST SUITE COMPLETED ===');
  await prisma.onModuleDestroy();
}

test().catch(console.error);
