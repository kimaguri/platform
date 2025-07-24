/**
 * Tenant Repository - Functional Repository Pattern
 * Handles all Admin DB operations for tenants
 */

import type { AdminAdapter } from '../adapters/adminAdapter';
import type {
  Tenant,
  TenantConfig,
  CreateTenantData,
  CreateTenantConfigData,
  TenantQueryParams,
} from '../types';

export type TenantRepository = {
  // Tenant operations
  findById: (tenantId: string) => Promise<Tenant | null>;
  findBySlug: (slug: string) => Promise<Tenant | null>;
  findAll: (params?: TenantQueryParams) => Promise<Tenant[]>;
  create: (data: CreateTenantData) => Promise<Tenant>;
  update: (tenantId: string, data: Partial<Tenant>) => Promise<Tenant | null>;
  deactivate: (tenantId: string) => Promise<boolean>;

  // Config operations
  getConfig: (tenantId: string) => Promise<TenantConfig | null>;
  saveConfig: (tenantId: string, config: CreateTenantConfigData) => Promise<TenantConfig>;
  updateConfig: (tenantId: string, config: Partial<TenantConfig>) => Promise<TenantConfig | null>;

  // Count operations
  count: (filter?: Record<string, any>) => Promise<number>;
};

/**
 * Creates tenant repository with functional interface
 */
export const createTenantRepository = (adapter: AdminAdapter): TenantRepository => ({
  findById: async (tenantId: string) => {
    try {
      const result = await adapter.tenants.queryOne(tenantId);
      return result;
    } catch (error) {
      console.error('Error finding tenant by ID:', error);
      return null;
    }
  },

  findBySlug: async (slug: string) => {
    try {
      const [result] = await adapter.tenants.query({ filter: { slug } });
      return result || null;
    } catch (error) {
      console.error('Error finding tenant by slug:', error);
      return null;
    }
  },

  findAll: async (params: TenantQueryParams = {}) => {
    try {
      const { status, limit, offset, orderBy } = params;
      const filter: Record<string, any> = {};

      if (status) {
        filter.status = status;
      }

      let tenants = await adapter.tenants.query({
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        orderBy,
        limit: limit || 1000,
      });

      if (offset) {
        tenants = tenants.slice(offset);
      }

      return tenants;
    } catch (error) {
      console.error('Error finding tenants:', error);
      return [];
    }
  },

  create: async (data: CreateTenantData) => {
    try {
      // Validate required fields
      if (!data.tenant_id || !data.name || !data.slug) {
        throw new Error('Missing required fields: tenant_id, name, slug');
      }

      // Check for existing tenant with same slug or tenant_id
      const existingSlug = await adapter.tenants.query({ filter: { slug: data.slug } });
      if (existingSlug.length > 0) {
        throw new Error(`Tenant with slug "${data.slug}" already exists`);
      }

      const existingId = await adapter.tenants.query({ filter: { tenant_id: data.tenant_id } });
      if (existingId.length > 0) {
        throw new Error(`Tenant with ID "${data.tenant_id}" already exists`);
      }

      const tenant = await adapter.tenants.insert({
        ...data,
        settings: data.settings || {},
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      return tenant;
    } catch (error) {
      console.error('Error creating tenant:', error);
      throw error;
    }
  },

  update: async (tenantId: string, data: Partial<Tenant>) => {
    try {
      // Prevent updating slug to existing one
      if (data.slug) {
        const existing = await adapter.tenants.query({ filter: { slug: data.slug } });
        const current = await adapter.tenants.queryOne(tenantId);

        if (existing.length > 0 && existing[0] && existing[0].id !== current?.id) {
          throw new Error(`Slug "${data.slug}" is already taken`);
        }
      }

      const updated = await adapter.tenants.update(tenantId, {
        ...data,
        updated_at: new Date().toISOString(),
      });

      return updated;
    } catch (error) {
      console.error('Error updating tenant:', error);
      throw error;
    }
  },

  deactivate: async (tenantId: string) => {
    try {
      const result = await adapter.tenants.update(tenantId, {
        status: 'inactive',
        updated_at: new Date().toISOString(),
      });

      return !!result;
    } catch (error) {
      console.error('Error deactivating tenant:', error);
      return false;
    }
  },

  getConfig: async (tenantId: string) => {
    try {
      const [config] = await adapter.configs.query({
        filter: { tenant_id: tenantId },
      });

      return config || null;
    } catch (error) {
      console.error('Error getting tenant config:', error);
      return null;
    }
  },

  saveConfig: async (tenantId: string, config: CreateTenantConfigData) => {
    try {
      // Validate required fields
      if (
        !config.supabase_project_id ||
        !config.supabase_url ||
        !config.anon_key ||
        !config.service_key
      ) {
        throw new Error('Missing required config fields');
      }

      const existing = await adapter.configs.query({
        filter: { tenant_id: tenantId },
      });

      const firstConfig = existing[0];
      if (firstConfig) {
        const updated = await adapter.configs.update(firstConfig.id, {
          ...config,
          updated_at: new Date().toISOString(),
        });
        if (!updated) {
          throw new Error('Failed to update tenant config');
        }
        return updated;
      } else {
        return adapter.configs.insert({
          ...config,
          tenant_id: tenantId,
          plan: config.plan || 'free',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error saving tenant config:', error);
      throw error;
    }
  },

  updateConfig: async (tenantId: string, config: Partial<TenantConfig>) => {
    try {
      const [existing] = await adapter.configs.query({
        filter: { tenant_id: tenantId },
      });

      if (!existing) {
        return null;
      }

      const updated = await adapter.configs.update(existing.id, {
        ...config,
        updated_at: new Date().toISOString(),
      });

      return updated;
    } catch (error) {
      console.error('Error updating tenant config:', error);
      return null;
    }
  },

  count: async (filter?: Record<string, any>) => {
    try {
      return adapter.tenants.count(filter);
    } catch (error) {
      console.error('Error counting tenants:', error);
      return 0;
    }
  },
});
