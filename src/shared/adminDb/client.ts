import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  Tenant,
  TenantSupabaseConfig,
  TenantFullInfo,
  LegacyTenantsConfig,
  CreateTenantRequest,
  CreateSupabaseConfigRequest,
  UpdateTenantRequest,
} from './types';

import { getAdminSupabaseUrl, getAdminSupabaseServiceKey } from '../utilities/helpers/secrets';

// Modern configuration using Encore TS secrets
// Fallback to environment variables for backwards compatibility

// Клиент для административной базы данных
let adminClient: SupabaseClient | null = null;

/**
 * Получает клиент для административной базы данных
 */
function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    try {
      const adminUrl = getAdminSupabaseUrl();
      const adminServiceKey = getAdminSupabaseServiceKey();

      if (!adminUrl || adminUrl.includes('your-admin-project')) {
        throw new Error('AdminSupabaseUrl secret is not configured');
      }
      if (!adminServiceKey || adminServiceKey.includes('your-admin-service-key')) {
        throw new Error('AdminSupabaseServiceKey secret is not configured');
      }

      adminClient = createClient(adminUrl, adminServiceKey);
    } catch (error) {
      // Fallback to environment variables for backwards compatibility
      const envUrl = process.env.ADMIN_SUPABASE_URL;
      const envKey = process.env.ADMIN_SUPABASE_SERVICE_KEY;

      if (!envUrl || !envKey) {
        throw new Error(
          'Neither secrets nor environment variables are configured for admin database'
        );
      }

      adminClient = createClient(envUrl, envKey);
    }
  }

  return adminClient;
}

/**
 * Получает конфигурацию тенанта из административной базы данных
 */
export async function getTenantConfigFromDB(
  tenantId: string
): Promise<TenantSupabaseConfig | null> {
  try {
    const client = getAdminClient();

    const { data, error } = await client
      .from('tenant_supabase_configs')
      .select(
        `
        *,
        tenants!inner(tenant_id, status)
      `
      )
      .eq('tenants.tenant_id', tenantId)
      .eq('tenants.status', 'active')
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching tenant config:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Database connection error:', error);
    return null;
  }
}

/**
 * Получает все активные конфигурации тенантов в legacy формате
 */
export async function getAllTenantConfigsLegacy(): Promise<LegacyTenantsConfig> {
  try {
    const client = getAdminClient();

    const { data, error } = await client
      .from('tenant_supabase_configs')
      .select(
        `
        *,
        tenants!inner(tenant_id, status)
      `
      )
      .eq('tenants.status', 'active')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching tenant configs:', error);
      return {};
    }

    // Конвертируем в legacy формат
    const legacyConfigs: LegacyTenantsConfig = {};

    for (const config of data || []) {
      legacyConfigs[config.tenants.tenant_id] = {
        SUPABASE_URL: config.supabase_url,
        ANON_KEY: config.anon_key,
        SERVICE_KEY: config.service_key,
        connector_type: config.connector_type || 'supabase', // Добавляем тип коннектора
      };
    }

    return legacyConfigs;
  } catch (error) {
    console.error('Database connection error:', error);
    return {};
  }
}

/**
 * Получает полную информацию о тенанте
 */
export async function getTenantFullInfo(tenantId: string): Promise<TenantFullInfo | null> {
  try {
    const client = getAdminClient();

    const { data, error } = await client
      .from('tenant_full_info')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      console.error('Error fetching tenant full info:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Database connection error:', error);
    return null;
  }
}

/**
 * Получает список всех активных тенантов
 */
export async function getActiveTenants(): Promise<Tenant[]> {
  try {
    const client = getAdminClient();

    const { data, error } = await client
      .from('tenants')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active tenants:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Database connection error:', error);
    return [];
  }
}

/**
 * Создает нового тенанта
 */
export async function createTenant(tenantData: CreateTenantRequest): Promise<Tenant | null> {
  try {
    const client = getAdminClient();

    const { data, error } = await client.from('tenants').insert([tenantData]).select().single();

    if (error) {
      console.error('Error creating tenant:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Database connection error:', error);
    return null;
  }
}

/**
 * Создает конфигурацию Supabase для тенанта
 */
export async function createSupabaseConfig(
  configData: CreateSupabaseConfigRequest
): Promise<TenantSupabaseConfig | null> {
  try {
    const client = getAdminClient();

    // Сначала найдем ID тенанта по tenant_id
    const { data: tenant, error: tenantError } = await client
      .from('tenants')
      .select('id')
      .eq('tenant_id', configData.tenant_id)
      .single();

    if (tenantError || !tenant) {
      console.error('Tenant not found:', tenantError);
      return null;
    }

    const { data, error } = await client
      .from('tenant_supabase_configs')
      .insert([
        {
          ...configData,
          tenant_id: tenant.id, // Используем UUID вместо строки
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating Supabase config:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Database connection error:', error);
    return null;
  }
}

/**
 * Обновляет тенанта
 */
export async function updateTenant(
  tenantId: string,
  updates: UpdateTenantRequest
): Promise<Tenant | null> {
  try {
    const client = getAdminClient();

    const { data, error } = await client
      .from('tenants')
      .update(updates)
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Error updating tenant:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Database connection error:', error);
    return null;
  }
}

/**
 * Деактивирует тенанта
 */
export async function deactivateTenant(tenantId: string): Promise<boolean> {
  try {
    const client = getAdminClient();

    const { error } = await client
      .from('tenants')
      .update({ status: 'inactive' })
      .eq('tenant_id', tenantId);

    if (error) {
      console.error('Error deactivating tenant:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}

/**
 * Проверяет подключение к административной базе данных
 */
export async function checkAdminConnection(): Promise<boolean> {
  try {
    const client = getAdminClient();
    const { error } = await client.from('tenants').select('count').limit(1);

    return !error;
  } catch (error) {
    console.error('Admin database connection failed:', error);
    return false;
  }
}
