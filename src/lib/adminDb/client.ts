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
import { getAdminSupabaseUrl, getAdminSupabaseServiceKey } from '../utils/helpers/secrets';

// Admin database configuration using helper functions (fallback to environment variables)

// Клиент для административной базы данных
let adminClient: SupabaseClient | null = null;

/**
 * Получает клиент для административной базы данных
 */
function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    // Get admin database credentials from helper functions
    const adminUrl = getAdminSupabaseUrl();
    const adminServiceKey = getAdminSupabaseServiceKey();

    // Fallback to hardcoded values if environment variables are not set
    const finalAdminUrl = adminUrl || 'https://zshakbdzhwxfxzyqtizl.supabase.co';
    const finalAdminServiceKey = adminServiceKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzaGFrYmR6aHd4Znh6eXF0aXpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzExMzk0OSwiZXhwIjoyMDY4Njg5OTQ5fQ.c67jAz_5TLnq7GY9hega04v1M7Jv0OiTrVfBlPBiEPI';

    adminClient = createClient(finalAdminUrl, finalAdminServiceKey);
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
        tenants!inner(id, status)
      `
      )
      .eq('tenant_id', tenantId)
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
