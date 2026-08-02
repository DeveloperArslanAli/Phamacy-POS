import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContextPayload {
  tenantId: string;
  isAdmin: boolean;
}

export const tenantContext = new AsyncLocalStorage<TenantContextPayload>();
