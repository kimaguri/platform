import { getAdminAdapter } from '../../../connectors/registry/connector-registry';
import type { Adapter, QueryParams } from '../../../connectors/base';
import type { Tenant, TenantConfig, TenantFullInfo } from './models/tenant';
import type { ExtensionFieldDefinition } from './models/extensionField';

/**
 * Admin Operations Module
 * Functional approach using connector-registry for admin DB operations
 * Follows the same pattern as user-management and content-management services
 */

/**
 * Generic admin resource operations
 */
export async function queryAdminResource<T = any>(
  resource: string,
  params?: QueryParams
): Promise<T[]> {
  const adapter = getAdminAdapter(resource);
  await adapter.connect();
  return await adapter.query(params) as T[];
}

export async function getAdminResource<T = any>(
  resource: string,
  id: string
): Promise<T | null> {
  const adapter = getAdminAdapter(resource);
  await adapter.connect();
  return adapter.queryOne(id) as Promise<T | null>;
}

export async function createAdminResource<T = any>(
  resource: string,
  data: Omit<T, 'id'>
): Promise<T> {
  const adapter = getAdminAdapter(resource);
  await adapter.connect();
  return adapter.insert(data) as Promise<T>;
}

export async function updateAdminResource<T = any>(
  resource: string,
  id: string,
  data: Partial<T>
): Promise<T | null> {
  const adapter = getAdminAdapter(resource);
  await adapter.connect();
  return adapter.update(id, data) as Promise<T | null>;
}

export async function deleteAdminResource(
  resource: string,
  id: string
): Promise<boolean> {
  const adapter = getAdminAdapter(resource);
  await adapter.connect();
  return adapter.delete(id);
}

export async function countAdminResources(
  resource: string,
  filter?: Record<string, any>
): Promise<number> {
  const adapter = getAdminAdapter(resource);
  await adapter.connect();
  return adapter.count(filter);
}

/**
 * Tenant-specific operations
 */
export async function getAllTenants(params?: QueryParams): Promise<Tenant[]> {
  return queryAdminResource<Tenant>('tenants', params);
}

/**
 * Получает список всех активных тенантов
 */
export async function getActiveTenants(): Promise<Tenant[]> {
  return queryAdminResource<Tenant>('tenants', {
    filter: { status: 'active' },
    orderBy: [{ field: 'created_at', direction: 'desc' }]
  });
}

/**
 * Получает полную информацию о тенанте
 */
export async function getTenantFullInfo(tenantId: string): Promise<TenantFullInfo | null> {
  try {
    const adapter = getAdminAdapter('tenant_full_info');
    await adapter.connect();
    const results = await adapter.query({
      filter: { tenant_id: tenantId },
      limit: 1
    }) as TenantFullInfo[];
    
    return results && results.length > 0 ? (results[0] || null) : null;
  } catch (error) {
    console.error('Error fetching tenant full info:', error);
    return null;
  }
}

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  return getAdminResource<Tenant>('tenants', tenantId);
}

export async function createTenant(data: Omit<Tenant, 'id'>): Promise<Tenant> {
  return createAdminResource<Tenant>('tenants', data);
}

export async function updateTenant(
  tenantId: string,
  data: Partial<Tenant>
): Promise<Tenant | null> {
  return updateAdminResource<Tenant>('tenants', tenantId, data);
}

export async function deleteTenant(tenantId: string): Promise<boolean> {
  return deleteAdminResource('tenants', tenantId);
}

/**
 * Tenant Config operations
 */
export async function getAllTenantConfigs(): Promise<TenantConfig[]> {
  return queryAdminResource<TenantConfig>('tenant_supabase_configs');
}

export async function getTenantConfigById(tenantId: string): Promise<TenantConfig | null> {
  const configs = await queryAdminResource<TenantConfig>('tenant_supabase_configs', {
    filter: { tenant_id: tenantId }
  });
  return configs.length > 0 ? (configs[0] || null) : null;
}

export async function createTenantConfig(data: Omit<TenantConfig, 'id'>): Promise<TenantConfig> {
  return createAdminResource<TenantConfig>('tenant_supabase_configs', data);
}

export async function updateTenantConfig(
  configId: string,
  data: Partial<TenantConfig>
): Promise<TenantConfig | null> {
  return updateAdminResource<TenantConfig>('tenant_supabase_configs', configId, data);
}

/**
 * Extension Field operations
 */
export async function getAllExtensionFields(): Promise<ExtensionFieldDefinition[]> {
  return queryAdminResource<ExtensionFieldDefinition>('extension_field_definitions');
}

export async function getExtensionFieldsByTenant(tenantId: string): Promise<ExtensionFieldDefinition[]> {
  return queryAdminResource<ExtensionFieldDefinition>('extension_field_definitions', {
    filter: { tenant_id: tenantId }
  });
}

export async function getExtensionFieldsByTenantAndEntity(
  tenantId: string,
  entityTable: string
): Promise<ExtensionFieldDefinition[]> {
  return queryAdminResource<ExtensionFieldDefinition>('extension_field_definitions', {
    filter: { tenant_id: tenantId, entity_table: entityTable }
  });
}

export async function createExtensionField(
  data: Omit<ExtensionFieldDefinition, 'id'>
): Promise<ExtensionFieldDefinition> {
  return createAdminResource<ExtensionFieldDefinition>('extension_field_definitions', data);
}

export async function updateExtensionField(
  fieldId: number,
  data: Partial<ExtensionFieldDefinition>
): Promise<ExtensionFieldDefinition | null> {
  return updateAdminResource<ExtensionFieldDefinition>('extension_field_definitions', fieldId.toString(), data);
}

export async function deleteExtensionField(fieldId: number): Promise<boolean> {
  return deleteAdminResource('extension_field_definitions', fieldId.toString());
}

/**
 * Health check for admin DB connection
 */
export async function checkAdminConnection(): Promise<boolean> {
  try {
    await queryAdminResource('tenants', { limit: 1 });
    return true;
  } catch (error) {
    console.error('Admin DB connection failed:', error);
    return false;
  }
}
