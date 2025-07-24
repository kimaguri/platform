/**
 * Tenant Service - Business Logic Layer
 * Uses functional repositories for Admin DB operations
 */

import type { TenantRepository } from '../database/repositories/tenantRepository';
import type { ExtensionFieldRepository } from '../database/repositories/extensionFieldRepository';
import type { 
  Tenant, 
  TenantConfig, 
  CreateTenantData, 
  CreateTenantConfigData,
  TenantQueryParams 
} from '../database/types';

export type TenantService = {
  // Tenant operations
  getTenantList: (params?: TenantQueryParams) => Promise<Tenant[]>;
  getTenantById: (tenantId: string) => Promise<Tenant | null>;
  getTenantBySlug: (slug: string) => Promise<Tenant | null>;
  createTenant: (data: CreateTenantData) => Promise<Tenant>;
  updateTenant: (tenantId: string, data: Partial<Tenant>) => Promise<Tenant | null>;
  deactivateTenant: (tenantId: string) => Promise<boolean>;
  
  // Config operations
  getTenantConfig: (tenantId: string) => Promise<TenantConfig | null>;
  saveTenantConfig: (tenantId: string, config: CreateTenantConfigData) => Promise<TenantConfig>;
  updateTenantConfig: (tenantId: string, config: Partial<TenantConfig>) => Promise<TenantConfig | null>;
  
  // Extension fields
  getExtensionFields: (tenantId: string, entityTable?: string) => Promise<any[]>;
  
  // Utility operations
  getTenantCount: (status?: string) => Promise<number>;
  validateTenantSlug: (slug: string, excludeTenantId?: string) => Promise<boolean>;
};

/**
 * Creates tenant service with functional dependency injection
 */
export const createTenantService = (
  tenantRepo: TenantRepository,
  extensionRepo?: ExtensionFieldRepository
): TenantService => ({
  getTenantList: async (params: TenantQueryParams = {}) => {
    return tenantRepo.findAll(params);
  },

  getTenantById: async (tenantId: string) => {
    return tenantRepo.findById(tenantId);
  },

  getTenantBySlug: async (slug: string) => {
    return tenantRepo.findBySlug(slug);
  },

  createTenant: async (data: CreateTenantData) => {
    try {
      // Validate slug format
      if (!/^[a-z0-9-]+$/.test(data.slug)) {
        throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
      }

      // Validate tenant_id format
      if (!/^[a-z0-9]{20}$/.test(data.tenant_id)) {
        throw new Error('Tenant ID must be exactly 20 lowercase alphanumeric characters');
      }

      // Check if slug is available
      const existingSlug = await tenantRepo.findBySlug(data.slug);
      if (existingSlug) {
        throw new Error(`Slug "${data.slug}" is already taken`);
      }

      // Check if tenant_id is available
      const existingId = await tenantRepo.findById(data.tenant_id);
      if (existingId) {
        throw new Error(`Tenant ID "${data.tenant_id}" is already taken`);
      }

      const tenant = await tenantRepo.create(data);
      return tenant;
    } catch (error) {
      console.error('Error creating tenant:', error);
      throw error;
    }
  },

  updateTenant: async (tenantId: string, data: Partial<Tenant>) => {
    try {
      // Validate slug if provided
      if (data.slug && !/^[a-z0-9-]+$/.test(data.slug)) {
        throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
      }

      const updated = await tenantRepo.update(tenantId, data);
      if (!updated) {
        throw new Error(`Tenant ${tenantId} not found`);
      }

      return updated;
    } catch (error) {
      console.error('Error updating tenant:', error);
      throw error;
    }
  },

  deactivateTenant: async (tenantId: string) => {
    try {
      const success = await tenantRepo.deactivate(tenantId);
      if (!success) {
        throw new Error(`Failed to deactivate tenant ${tenantId}`);
      }
      return success;
    } catch (error) {
      console.error('Error deactivating tenant:', error);
      throw error;
    }
  },

  getTenantConfig: async (tenantId: string) => {
    return tenantRepo.getConfig(tenantId);
  },

  saveTenantConfig: async (tenantId: string, config: CreateTenantConfigData) => {
    try {
      // Validate required config fields
      if (!config.supabase_project_id || !config.supabase_url || 
          !config.anon_key || !config.service_key) {
        throw new Error('Missing required configuration fields');
      }

      // Validate URL format
      try {
        new URL(config.supabase_url);
      } catch {
        throw new Error('Invalid Supabase URL format');
      }

      const savedConfig = await tenantRepo.saveConfig(tenantId, config);
      return savedConfig;
    } catch (error) {
      console.error('Error saving tenant config:', error);
      throw error;
    }
  },

  updateTenantConfig: async (tenantId: string, config: Partial<TenantConfig>) => {
    try {
      // Validate URL if provided
      if (config.supabase_url) {
        try {
          new URL(config.supabase_url);
        } catch {
          throw new Error('Invalid Supabase URL format');
        }
      }

      const updatedConfig = await tenantRepo.updateConfig(tenantId, config);
      if (!updatedConfig) {
        throw new Error(`Tenant config for ${tenantId} not found`);
      }

      return updatedConfig;
    } catch (error) {
      console.error('Error updating tenant config:', error);
      throw error;
    }
  },

  getExtensionFields: async (tenantId: string, entityTable?: string) => {
    if (!extensionRepo) {
      console.warn('Extension field repository not provided');
      return [];
    }

    try {
      return extensionRepo.findActive(tenantId, entityTable);
    } catch (error) {
      console.error('Error getting extension fields:', error);
      return [];
    }
  },

  getTenantCount: async (status?: string) => {
    const filter = status ? { status } : undefined;
    return tenantRepo.count(filter);
  },

  validateTenantSlug: async (slug: string, excludeTenantId?: string) => {
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return false;
    }

    const existing = await tenantRepo.findBySlug(slug);
    if (!existing) {
      return true;
    }

    // Allow the same slug for the same tenant (for updates)
    return excludeTenantId ? existing.tenant_id === excludeTenantId : false;
  }
});

/**
 * Factory function for creating service with Encore secrets
 */
export const createTenantServiceFromSecrets = () => {
  const supabaseUrl = process.env.ADMIN_SUPABASE_URL || 'https://simplx-crm-tenant.supabase.co';
  const serviceKey = process.env.ADMIN_SERVICE_KEY || '';
  
  if (!serviceKey) {
    throw new Error('ADMIN_SERVICE_KEY environment variable is required');
  }

  const { createAdminAdapter } = require('../adapters/adminAdapter');
  const { createTenantRepository, createExtensionFieldRepository } = require('../repositories');

  const adapter = createAdminAdapter({ supabaseUrl, serviceKey });
  const tenantRepo = createTenantRepository(adapter);
  const extensionRepo = createExtensionFieldRepository(adapter);

  return createTenantService(tenantRepo, extensionRepo);
};
