export enum Permission {
  // Admin Permissions
  KEY_REGISTRY = 'key_registry',
  SECURITY_LOGS = 'security_logs',
  LICENSE_MGMT = 'license_mgmt',
  TENANT_MGMT = 'tenant_mgmt',

  // Pharmacist/Operations Permissions
  DASHBOARD = 'dashboard',
  POS = 'pos',
  MEDICINES = 'medicines',
  PATIENTS = 'patients',
  SUPPLIERS = 'suppliers',
  PURCHASES = 'purchases',
  SALES = 'sales',
  REPORTS = 'reports',
  INVENTORY = 'inventory',
  SETTINGS = 'settings',
}

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    Permission.KEY_REGISTRY,
    Permission.SECURITY_LOGS,
    Permission.LICENSE_MGMT,
    Permission.TENANT_MGMT,
  ],
  pharmacist: [
    Permission.DASHBOARD,
    Permission.POS,
    Permission.MEDICINES,
    Permission.PATIENTS,
    Permission.SUPPLIERS,
    Permission.PURCHASES,
    Permission.SALES,
    Permission.REPORTS,
    Permission.INVENTORY,
    Permission.SETTINGS,
  ],
  cashier: [
    Permission.POS,
    Permission.PATIENTS,
    Permission.SALES,
  ],
};
