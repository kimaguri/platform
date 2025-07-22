// Tenant data models and interfaces - compatible with existing adminDb types

export interface Tenant {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface TenantConfig {
  id: string;
  tenant_id: string;
  supabase_url: string;
  supabase_anon_key: string;
  supabase_service_key: string;
  created_at: string;
  updated_at: string;
}

export interface TenantFullInfo {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  supabase_url?: string;
  supabase_anon_key?: string;
  supabase_service_key?: string;
}

export interface CreateTenantRequest {
  tenant_id: string;
  name: string;
  slug: string;
}

export interface UpdateTenantRequest {
  name?: string;
  slug?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface CreateSupabaseConfigRequest {
  tenant_id: string;
  supabase_url: string;
  supabase_anon_key: string;
  supabase_service_key: string;
}

// Response interfaces
export interface TenantResponse {
  data?: Tenant;
  error?: string;
  message: string;
}

export interface TenantsListResponse {
  data?: Tenant[];
  error?: string;
  message: string;
}

export interface TenantFullInfoResponse {
  data?: TenantFullInfo;
  error?: string;
  message: string;
}

export interface TenantConfigResponse {
  data?: TenantConfig;
  error?: string;
  message: string;
}

export interface HealthCheckResponse {
  data?: {
    admin_db_connected: boolean;
    timestamp: string;
  };
  error?: string;
  message: string;
}
