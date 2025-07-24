/**
 * Admin DB Adapter for Tenant Management
 * Uses existing connectors from /src/connectors/
 */

import createSupabaseAdapter from '../../../../../connectors/supabase';
import type { Adapter } from '../../../../../connectors/base';
import type { Tenant, TenantConfig, ExtensionField } from '../types';

// Configuration
export interface AdminAdapterConfig {
  supabaseUrl?: string;
  serviceKey?: string;
}

// Admin DB Adapter type
export type AdminAdapter = {
  tenants: Adapter<Tenant>;
  configs: Adapter<TenantConfig>;
  extensionFields: Adapter<ExtensionField>;
};

/**
 * Creates Admin DB adapter with hardcoded credentials for simplx_crm_tenant
 */
export const createAdminAdapter = (config?: AdminAdapterConfig): AdminAdapter => {
  // Hardcoded values for simplx_crm_tenant project
  const supabaseUrl = config?.supabaseUrl || 'https://zshakbdzhwxfxzyqtizl.supabase.co';
  const serviceKey =
    config?.serviceKey ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzaGFrYmR6aHd4Znh6eXF0aXpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzExMzk0OSwiZXhwIjoyMDY4Njg5OTQ5fQ.c67jAz_5TLnq7GY9hega04v1M7Jv0OiTrVfBlPBiEPI';

  return {
    tenants: createSupabaseAdapter({
      type: 'supabase',
      supabaseUrl,
      supabaseKey: serviceKey,
      table: 'tenants',
    }),

    configs: createSupabaseAdapter({
      type: 'supabase',
      supabaseUrl,
      supabaseKey: serviceKey,
      table: 'tenant_supabase_configs',
    }),

    extensionFields: createSupabaseAdapter({
      type: 'supabase',
      supabaseUrl,
      supabaseKey: serviceKey,
      table: 'extension_field_definitions',
    }),
  };
};
