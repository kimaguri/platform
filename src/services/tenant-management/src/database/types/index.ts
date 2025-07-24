/**
 * Admin DB Types for Tenant Management
 * Based on existing schema in simplx_crm_tenant
 */

// Core tenant entity
export interface Tenant {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive' | 'suspended';
  contact_email?: string;
  contact_name?: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Tenant Supabase configuration
export interface TenantConfig {
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

// Extension field definitions for dynamic fields
export interface ExtensionField {
  id: number;
  tenant_id: string;
  entity_table: string;
  field_name: string;
  field_type: 'text' | 'number' | 'boolean' | 'date' | 'json' | 'select';
  display_name: string;
  description?: string;
  is_required: boolean;
  is_searchable: boolean;
  is_filterable: boolean;
  is_sortable: boolean;
  default_value?: string;
  validation_rules: Record<string, any>;
  ui_config: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExtensionFieldDefinition {
  id: number;
  tenant_id: string;
  entity_table: string;
  field_name: string;
  field_type: string;
  display_name: string;
  description?: string;
  is_required: boolean;
  is_active: boolean;
  default_value?: string;
  validation_rules?: Record<string, any>;
  options?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CreateExtensionFieldData {
  tenant_id: string;
  entity_table: string;
  field_name: string;
  field_type: string;
  display_name: string;
  description?: string;
  is_required?: boolean;
  default_value?: string;
  validation_rules?: Record<string, any>;
  options?: Record<string, any>;
}

// Input types for creation
export interface CreateTenantData {
  tenant_id: string;
  name: string;
  slug: string;
  contact_email?: string;
  contact_name?: string;
  settings?: Record<string, any>;
}

export interface CreateTenantConfigData {
  tenant_id: string;
  supabase_project_id: string;
  supabase_url: string;
  anon_key: string;
  service_key: string;
  region: string;
  plan?: 'free' | 'pro' | 'team' | 'enterprise';
}

// Query parameters for filtering
export interface TenantQueryParams {
  status?: string;
  limit?: number;
  offset?: number;
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
}
