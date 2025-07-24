/**
 * Extension field definition types
 */

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

export interface ExtensionFieldQueryParams {
  tenant_id?: string;
  entity_table?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}
