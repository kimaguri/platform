/**
 * Extension Field Definition Model
 * Simplified model for extension field definitions in admin DB
 */

export interface ExtensionFieldDefinition {
  id: number;
  tenant_id: string;
  entity_table: string;
  field_name: string;
  field_type: 'text' | 'number' | 'boolean' | 'date' | 'json' | 'select' | 'multiselect';
  display_name: string;
  description?: string;
  is_required: boolean;
  default_value?: any;
  validation_rules?: Record<string, any>;
  field_options?: string[]; // For select/multiselect types
  created_at: string;
  updated_at: string;
}

export type CreateExtensionFieldRequest = Omit<ExtensionFieldDefinition, 'id' | 'created_at' | 'updated_at'>;
export type UpdateExtensionFieldRequest = Partial<Omit<ExtensionFieldDefinition, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>;
