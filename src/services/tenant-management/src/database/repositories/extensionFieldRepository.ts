/**
 * Extension Field Repository - Functional Repository Pattern
 * Handles extension field definitions for dynamic schemas
 */

import type { AdminAdapter } from '../adapters/adminAdapter';
import type { ExtensionField, CreateExtensionFieldData } from '../types';

export type ExtensionFieldRepository = {
  findByTenant: (tenantId: string, entityTable?: string) => Promise<ExtensionField[]>;
  findById: (id: number) => Promise<ExtensionField | null>;
  findActive: (tenantId: string, entityTable?: string) => Promise<ExtensionField[]>;
  create: (data: CreateExtensionFieldData) => Promise<ExtensionField>;
  update: (id: number, data: Partial<ExtensionField>) => Promise<ExtensionField | null>;
  deactivate: (id: number) => Promise<boolean>;
  delete: (id: number) => Promise<boolean>;
  
  // Validation helpers
  validateFieldValue: (field: ExtensionField, value: any) => { isValid: boolean; error?: string };
};

/**
 * Creates extension field repository
 */
export const createExtensionFieldRepository = (adapter: AdminAdapter): ExtensionFieldRepository => ({
  findByTenant: async (tenantId: string, entityTable?: string) => {
    try {
      const filter: Record<string, any> = { tenant_id: tenantId };
      if (entityTable) {
        filter.entity_table = entityTable;
      }

      return adapter.extensionFields.query({ filter });
    } catch (error) {
      console.error('Error finding extension fields:', error);
      return [];
    }
  },

  findById: async (id: number) => {
    try {
      return adapter.extensionFields.queryOne(id.toString());
    } catch (error) {
      console.error('Error finding extension field by ID:', error);
      return null;
    }
  },

  findActive: async (tenantId: string, entityTable?: string) => {
    try {
      const filter: Record<string, any> = { 
        tenant_id: tenantId, 
        is_active: true 
      };
      
      if (entityTable) {
        filter.entity_table = entityTable;
      }

      return adapter.extensionFields.query({ filter });
    } catch (error) {
      console.error('Error finding active extension fields:', error);
      return [];
    }
  },

  create: async (data: CreateExtensionFieldData) => {
    try {
      // Validate required fields
      if (!data.tenant_id || !data.entity_table || !data.field_name || !data.display_name) {
        throw new Error('Missing required fields: tenant_id, entity_table, field_name, display_name');
      }

      // Check for existing field with same name for this tenant/entity
      const existing = await adapter.extensionFields.query({
        filter: {
          tenant_id: data.tenant_id,
          entity_table: data.entity_table,
          field_name: data.field_name
        }
      });

      if (existing.length > 0) {
        throw new Error(`Field "${data.field_name}" already exists for ${data.entity_table}`);
      }

      const field = await adapter.extensionFields.insert({
        ...data,
        is_required: data.is_required || false,
        is_searchable: data.is_searchable || false,
        is_filterable: data.is_filterable || false,
        is_sortable: data.is_sortable || false,
        validation_rules: data.validation_rules || {},
        ui_config: data.ui_config || {},
        is_active: true
      });

      return field;
    } catch (error) {
      console.error('Error creating extension field:', error);
      throw error;
    }
  },

  update: async (id: number, data: Partial<ExtensionField>) => {
    try {
      // Prevent duplicate field names
      if (data.field_name) {
        const [current] = await adapter.extensionFields.query({ filter: { id } });
        if (current) {
          const existing = await adapter.extensionFields.query({
            filter: {
              tenant_id: current.tenant_id,
              entity_table: current.entity_table,
              field_name: data.field_name
            }
          });

          const duplicate = existing.find((f: any) => f.id !== id);
          if (duplicate) {
            throw new Error(`Field name "${data.field_name}" already exists`);
          }
        }
      }

      const updated = await adapter.extensionFields.update(id.toString(), {
        ...data,
        updated_at: new Date().toISOString()
      });

      return updated;
    } catch (error) {
      console.error('Error updating extension field:', error);
      throw error;
    }
  },

  deactivate: async (id: number) => {
    try {
      const result = await adapter.extensionFields.update(id.toString(), {
        is_active: false,
        updated_at: new Date().toISOString()
      });

      return !!result;
    } catch (error) {
      console.error('Error deactivating extension field:', error);
      return false;
    }
  },

  delete: async (id: number) => {
    try {
      const result = await adapter.extensionFields.delete(id.toString());
      return result;
    } catch (error) {
      console.error('Error deleting extension field:', error);
      return false;
    }
  },

  validateFieldValue: (field: ExtensionField, value: any) => {
    // Required field validation
    if (field.is_required && (value === undefined || value === null || value === '')) {
      return { isValid: false, error: `${field.display_name} is required` };
    }

    // Skip validation for optional empty values
    if (!field.is_required && (value === undefined || value === null || value === '')) {
      return { isValid: true };
    }

    // Type-specific validation
    switch (field.field_type) {
      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          return { isValid: false, error: `${field.display_name} must be a valid number` };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return { isValid: false, error: `${field.display_name} must be a boolean` };
        }
        break;

      case 'date':
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return { isValid: false, error: `${field.display_name} must be a valid date` };
        }
        break;

      case 'text':
        if (typeof value !== 'string') {
          return { isValid: false, error: `${field.display_name} must be text` };
        }
        break;

      case 'json':
        try {
          if (typeof value === 'string') {
            JSON.parse(value);
          }
        } catch {
          return { isValid: false, error: `${field.display_name} must be valid JSON` };
        }
        break;

      case 'select':
        const options = field.ui_config?.options || [];
        if (!options.includes(value)) {
          return { isValid: false, error: `${field.display_name} must be one of: ${options.join(', ')}` };
        }
        break;
    }

    // Custom validation rules
    if (field.validation_rules && Object.keys(field.validation_rules).length > 0) {
      const rules = field.validation_rules;
      
      // Min/max for numbers
      if (rules.min !== undefined && value < rules.min) {
        return { isValid: false, error: `${field.display_name} must be at least ${rules.min}` };
      }
      
      if (rules.max !== undefined && value > rules.max) {
        return { isValid: false, error: `${field.display_name} must be at most ${rules.max}` };
      }
      
      // Min/max length for text
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        return { isValid: false, error: `${field.display_name} must be at least ${rules.minLength} characters` };
      }
      
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        return { isValid: false, error: `${field.display_name} must be at most ${rules.maxLength} characters` };
      }
      
      // Pattern matching
      if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
        return { isValid: false, error: rules.message || `${field.display_name} format is invalid` };
      }
    }

    return { isValid: true };
  }
});
