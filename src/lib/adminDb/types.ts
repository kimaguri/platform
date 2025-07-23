// Типы для административной базы данных управления тенантами

export interface Tenant {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'inactive';
  contact_email?: string;
  contact_name?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  settings: Record<string, any>;
}

export interface TenantSupabaseConfig {
  id: string;
  tenant_id: string;
  supabase_project_id: string;
  supabase_url: string;
  anon_key: string;
  service_key: string;
  region: string;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantEntityConfig {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_name: string;
  is_enabled: boolean;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TenantCustomField {
  id: string;
  tenant_id: string;
  entity_type: string;
  field_name: string;
  field_label: string;
  field_type: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'text' | 'email' | 'url';
  is_required: boolean;
  default_value?: any;
  validation_rules: Record<string, any>;
  display_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface TenantAuditLog {
  id: string;
  tenant_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  performed_by?: string;
  performed_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface TenantFullInfo {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'inactive';
  contact_email?: string;
  contact_name?: string;
  tenant_settings: Record<string, any>;
  created_at: string;
  updated_at: string;

  // Supabase конфигурация
  supabase_url?: string;
  supabase_project_id?: string;
  region?: string;
  plan?: string;
  supabase_active?: boolean;

  // Статистика
  enabled_entities: number;
  custom_fields_count: number;
}

// Типы для создания/обновления
export interface CreateTenantRequest {
  tenant_id: string;
  name: string;
  slug: string;
  contact_email?: string;
  contact_name?: string;
  settings?: Record<string, any>;
}

export interface CreateSupabaseConfigRequest {
  tenant_id: string;
  supabase_project_id: string;
  supabase_url: string;
  anon_key: string;
  service_key: string;
  region?: string;
  plan?: 'free' | 'pro' | 'team' | 'enterprise';
}

export interface UpdateTenantRequest {
  name?: string;
  slug?: string;
  status?: 'active' | 'suspended' | 'inactive';
  contact_email?: string;
  contact_name?: string;
  settings?: Record<string, any>;
}

// Конвертация для совместимости с текущим API
export interface LegacyTenantConfig {
  SUPABASE_URL: string;
  ANON_KEY: string;
  SERVICE_KEY: string;
  connector_type?: 'supabase' | 'native'; // Тип коннектора
}

export interface LegacyTenantsConfig {
  [tenantId: string]: LegacyTenantConfig;
}
