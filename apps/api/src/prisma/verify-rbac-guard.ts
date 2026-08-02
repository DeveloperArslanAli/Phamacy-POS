import { ROLE_PERMISSIONS, Permission } from '../auth/permissions';

async function test() {
  console.log('=== SIMULATED RBAC ROLE-PERMISSION MAPPING CHECK ===');
  
  // Test permissions for admin
  const adminPermissions = ROLE_PERMISSIONS['admin'] || [];
  console.log('\n[Admin Permissions]:', adminPermissions);
  
  const hasAdminPos = adminPermissions.includes(Permission.POS);
  console.log(`-> Has POS permission: ${hasAdminPos} (Expected: false)`);
  if (!hasAdminPos) console.log('✅ PASS: Admin has NO POS permission.');
  else console.error('❌ FAIL: Admin has POS permission!');
  
  const hasAdminLicense = adminPermissions.includes(Permission.LICENSE_MGMT);
  console.log(`-> Has License Mgmt permission: ${hasAdminLicense} (Expected: true)`);
  if (hasAdminLicense) console.log('✅ PASS: Admin has License Mgmt permission.');
  else console.error('❌ FAIL: Admin lacks License Mgmt permission!');

  // Test permissions for pharmacist
  const pharmacistPermissions = ROLE_PERMISSIONS['pharmacist'] || [];
  console.log('\n[Pharmacist Permissions]:', pharmacistPermissions);
  
  const hasPharmacistPos = pharmacistPermissions.includes(Permission.POS);
  console.log(`-> Has POS permission: ${hasPharmacistPos} (Expected: true)`);
  if (hasPharmacistPos) console.log('✅ PASS: Pharmacist has POS permission.');
  else console.error('❌ FAIL: Pharmacist lacks POS permission!');
  
  const hasPharmacistLicense = pharmacistPermissions.includes(Permission.LICENSE_MGMT);
  console.log(`-> Has License Mgmt permission: ${hasPharmacistLicense} (Expected: false)`);
  if (!hasPharmacistLicense) console.log('✅ PASS: Pharmacist has NO License Mgmt permission.');
  else console.error('❌ FAIL: Pharmacist has License Mgmt permission!');

  console.log('\n=== TEST SUITE COMPLETED ===');
}

test().catch(console.error);
