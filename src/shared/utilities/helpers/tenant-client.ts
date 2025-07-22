import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getTenantConfigById, hasTenantConfig } from '../tenant-config';

const clientCache = new Map<string, SupabaseClient>();

/**
 * Получает Supabase клиент для тенанта
 * @param tenantId ID тенанта
 * @param useServiceKey Использовать service key вместо anon key
 * @returns Supabase клиент
 */
export async function getSupabaseClient(
  tenantId: string,
  useServiceKey = false
): Promise<SupabaseClient> {
  if (!(await hasTenantConfig(tenantId))) {
    throw new Error(`Configuration for tenant '${tenantId}' not found.`);
  }

  const config = await getTenantConfigById(tenantId);
  const key = useServiceKey ? 'service' : 'anon';
  const cacheKey = `${tenantId}-${key}`;

  if (clientCache.has(cacheKey)) {
    return clientCache.get(cacheKey)!;
  }

  const apiKey = useServiceKey ? config.SERVICE_KEY : config.ANON_KEY;
  const client = createClient(config.SUPABASE_URL, apiKey);

  clientCache.set(cacheKey, client);
  return client;
}

/**
 * Получает анонимный клиент для тенанта
 */
export async function getSupabaseAnonClient(tenantId: string): Promise<SupabaseClient> {
  return getSupabaseClient(tenantId, false);
}

/**
 * Получает service клиент для тенанта
 */
export async function getSupabaseServiceClient(tenantId: string): Promise<SupabaseClient> {
  return getSupabaseClient(tenantId, true);
}

/**
 * Очищает кэш клиентов
 */
export function clearClientCache(): void {
  clientCache.clear();
}

/**
 * Получает конфигурацию для фронтенда
 */
export async function getFrontendConfig(
  tenantId: string
): Promise<{ url: string; anonKey: string }> {
  if (!(await hasTenantConfig(tenantId))) {
    throw new Error(`Configuration for tenant '${tenantId}' not found.`);
  }

  const config = await getTenantConfigById(tenantId);
  return {
    url: config.SUPABASE_URL,
    anonKey: config.ANON_KEY,
  };
}
