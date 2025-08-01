import { secret } from 'encore.dev/config';
import type { Adapter, AdapterFactory, AdapterConfig } from '../base';
import { getConnectorType } from '../../lib/utils/connector-helper';
import { getTenantConfigById } from '../../lib/utils/tenant-config';
import createSupabaseAdapter from '../supabase';
import createPostgresAdapter from '../postgres';
import createMongoAdapter from '../mongodb';
import {
  getAdminSupabaseServiceKey,
  getAdminSupabaseUrl,
} from '@services/tenant-management/service';

/**
 * Functional Connector Registry
 * Manages adapter factories and creates adapters based on tenant configuration
 * No classes - pure functional approach following Encore.ts best practices
 */

// Registry state - functional approach
interface RegistryState {
  factories: Map<string, AdapterFactory>;
  cache: Map<string, Adapter>;
}

const registryState: RegistryState = {
  factories: new Map(),
  cache: new Map(),
};

/**
 * Initialize the registry with default adapter factories
 */
export function initializeConnectorRegistry(): void {
  // Register Supabase adapter factory
  registryState.factories.set('supabase', (config) =>
    createSupabaseAdapter({
      ...config,
      supabaseUrl: config.supabaseUrl || config.url,
      supabaseKey: config.supabaseKey || config.key,
    })
  );

  // Register PostgreSQL adapter factory
  registryState.factories.set('postgres', (config) =>
    createPostgresAdapter({
      ...config,
      connectionString: config.connectionString || config.url,
    })
  );

  // Register MongoDB adapter factory
  registryState.factories.set('mongodb', (config) =>
    createMongoAdapter({
      ...config,
      uri: config.uri || config.url,
      dbName: config.dbName || config.database,
    })
  );
}

/**
 * Register a new adapter factory
 */
export function registerAdapterFactory(type: string, factory: AdapterFactory): void {
  registryState.factories.set(type, factory);
}

/**
 * Get available connector types
 */
export function getAvailableConnectorTypes(): string[] {
  return Array.from(registryState.factories.keys());
}

/**
 * Get admin adapter for tenant-management operations
 * Uses Encore secrets for admin DB credentials
 */
export function getAdminAdapter(table: string): Adapter {
  const cacheKey = `admin:${table}`;

  const adminSupabaseUrl = getAdminSupabaseUrl();
  const adminSupabaseKey = getAdminSupabaseServiceKey();

  if (registryState.cache.has(cacheKey)) {
    return registryState.cache.get(cacheKey)!;
  }

  if (!adminSupabaseUrl || !adminSupabaseKey) {
    throw new Error('Admin Supabase credentials are not configured properly');
  }

  const adminConfig = {
    type: 'supabase' as const,
    supabaseUrl: adminSupabaseUrl,
    supabaseKey: adminSupabaseKey,
    table,
  };

  const factory = registryState.factories.get('supabase');
  if (!factory) {
    throw new Error('Supabase adapter factory not registered');
  }

  const adapter = factory(adminConfig);
  registryState.cache.set(cacheKey, adapter);
  return adapter;
}

/**
 * Get adapter for tenant - integrates with existing connector-type system
 */
export async function getAdapterForTenant(
  tenantId: string,
  table: string,
  jwtToken?: string
): Promise<Adapter> {
  console.log('[ConnectorRegistry] getAdapterForTenant called with:', {
    tenantId,
    table,
    hasJwtToken: !!jwtToken,
  });

  const cacheKey = `${tenantId}:${table}`;

  // Check cache first - НЕ используем кеш для адаптеров с JWT токеном
  if (!jwtToken && registryState.cache.has(cacheKey)) {
    console.log('[ConnectorRegistry] Using cached adapter (no JWT)');
    return registryState.cache.get(cacheKey)!;
  }

  try {
    // Get connector type from existing system
    const connectorType = await getConnectorType(tenantId);

    // Get tenant configuration
    const tenantConfig = await getTenantConfigById(tenantId);

    if (!tenantConfig) {
      throw new Error(`Tenant configuration not found for tenant: ${tenantId}`);
    }

    // Get adapter factory for connector type
    const factory = registryState.factories.get(connectorType);
    if (!factory) {
      throw new Error(`No adapter factory registered for connector type: ${connectorType}`);
    }

    // Prepare adapter configuration
    const adapterConfig: AdapterConfig & { table: string } = {
      type: connectorType as 'supabase' | 'postgres' | 'mongodb',
      table,
      jwtToken, // Передаем JWT токен для аутентификации операций записи
      // Supabase specific config
      supabaseUrl: tenantConfig.SUPABASE_URL,
      supabaseKey: tenantConfig.ANON_KEY,
      url: tenantConfig.SUPABASE_URL,
      key: tenantConfig.ANON_KEY,
      // PostgreSQL specific config (for future use)
      connectionString: (tenantConfig as any).DATABASE_URL || (tenantConfig as any).POSTGRES_URL,
      // MongoDB specific config (for future use)
      uri: (tenantConfig as any).MONGODB_URI,
      dbName: (tenantConfig as any).MONGODB_DATABASE || (tenantConfig as any).DATABASE_NAME,
      database: (tenantConfig as any).DATABASE_NAME,
    };

    // Create adapter
    const adapter = factory(adapterConfig);

    // Connect adapter
    await adapter.connect();

    // Cache adapter
    registryState.cache.set(cacheKey, adapter);

    return adapter;
  } catch (error) {
    console.error(`Failed to get adapter for tenant ${tenantId}:`, error);
    throw error;
  }
}

/**
 * Clear cache for tenant (useful for configuration changes)
 */
export function clearCacheForTenant(tenantId: string): void {
  const keysToDelete = Array.from(registryState.cache.keys()).filter((key) =>
    key.startsWith(`${tenantId}:`)
  );

  keysToDelete.forEach((key) => registryState.cache.delete(key));
}

/**
 * Clear all cache
 */
export function clearAllCache(): void {
  registryState.cache.clear();
}

/**
 * Get cache stats
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: registryState.cache.size,
    keys: Array.from(registryState.cache.keys()),
  };
}

/**
 * Disconnect all cached adapters
 */
export async function disconnectAllAdapters(): Promise<void> {
  const disconnectPromises = Array.from(registryState.cache.values()).map((adapter) => {
    if (adapter.disconnect) {
      return adapter.disconnect();
    }
    return Promise.resolve();
  });

  await Promise.all(disconnectPromises);
  registryState.cache.clear();
}

// Initialize registry on module load
initializeConnectorRegistry();
