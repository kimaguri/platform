/**
 * Unit tests for TenantRepository
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTenantRepository } from '../tenantRepository';
import type { AdminAdapter } from '../../adapters/adminAdapter';
import type { Tenant, CreateTenantData, TenantConfig } from '../../types';

// Mock adapter
const mockAdapter: AdminAdapter = {
  tenants: {
    query: vi.fn(),
    queryOne: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  configs: {
    query: vi.fn(),
    queryOne: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  extensionFields: {
    query: vi.fn(),
    queryOne: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
};

describe('TenantRepository', () => {
  let tenantRepo: ReturnType<typeof createTenantRepository>;

  beforeEach(() => {
    tenantRepo = createTenantRepository(mockAdapter);
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should return tenant when found', async () => {
      const mockTenant: Tenant = {
        id: 'uuid-1',
        tenant_id: 'test12345678901234567890',
        name: 'Test Tenant',
        slug: 'test-tenant',
        status: 'active',
        settings: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      (mockAdapter.tenants.queryOne as any).mockResolvedValue(mockTenant);

      const result = await tenantRepo.findById('test12345678901234567890');

      expect(result).toEqual(mockTenant);
      expect(mockAdapter.tenants.queryOne).toHaveBeenCalledWith('test12345678901234567890');
    });

    it('should return null when tenant not found', async () => {
      (mockAdapter.tenants.queryOne as any).mockResolvedValue(null);

      const result = await tenantRepo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      (mockAdapter.tenants.queryOne as any).mockRejectedValue(new Error('DB Error'));

      const result = await tenantRepo.findById('test-id');

      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should return tenant when found by slug', async () => {
      const mockTenant: Tenant = {
        id: 'uuid-1',
        tenant_id: 'test12345678901234567890',
        name: 'Test Tenant',
        slug: 'test-tenant',
        status: 'active',
        settings: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      (mockAdapter.tenants.query as any).mockResolvedValue([mockTenant]);

      const result = await tenantRepo.findBySlug('test-tenant');

      expect(result).toEqual(mockTenant);
      expect(mockAdapter.tenants.query).toHaveBeenCalledWith({ filter: { slug: 'test-tenant' } });
    });

    it('should return null when slug not found', async () => {
      (mockAdapter.tenants.query as any).mockResolvedValue([]);

      const result = await tenantRepo.findBySlug('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create tenant successfully', async () => {
      const createData: CreateTenantData = {
        tenant_id: 'test12345678901234567890',
        name: 'Test Tenant',
        slug: 'test-tenant',
        settings: { theme: 'dark' },
      };

      const mockCreatedTenant: Tenant = {
        ...createData,
        id: 'uuid-1',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Mock checks for existing tenant
      (mockAdapter.tenants.query as any)
        .mockResolvedValueOnce([]) // No existing slug
        .mockResolvedValueOnce([]); // No existing tenant_id

      (mockAdapter.tenants.insert as any).mockResolvedValue(mockCreatedTenant);

      const result = await tenantRepo.create(createData);

      expect(result).toEqual(mockCreatedTenant);
      expect(mockAdapter.tenants.insert).toHaveBeenCalledWith({
        ...createData,
        settings: { theme: 'dark' },
        status: 'active',
      });
    });

    it('should throw error for duplicate slug', async () => {
      const createData: CreateTenantData = {
        tenant_id: 'test12345678901234567890',
        name: 'Test Tenant',
        slug: 'existing-slug',
      };

      const existingTenant: Tenant = {
        id: 'uuid-2',
        tenant_id: 'other12345678901234567890',
        name: 'Other Tenant',
        slug: 'existing-slug',
        status: 'active',
        settings: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      (mockAdapter.tenants.query as jest.Mock).mockResolvedValue([existingTenant]);

      await expect(tenantRepo.create(createData)).rejects.toThrow(
        'Tenant with slug "existing-slug" already exists'
      );
    });

    it('should throw error for missing required fields', async () => {
      const invalidData = {
        name: 'Test Tenant',
        // Missing tenant_id and slug
      } as CreateTenantData;

      await expect(tenantRepo.create(invalidData)).rejects.toThrow(
        'Missing required fields: tenant_id, name, slug'
      );
    });
  });

  describe('update', () => {
    it('should update tenant successfully', async () => {
      const updateData = { name: 'Updated Name' };
      const updatedTenant: Tenant = {
        id: 'uuid-1',
        tenant_id: 'test12345678901234567890',
        name: 'Updated Name',
        slug: 'test-tenant',
        status: 'active',
        settings: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      (mockAdapter.tenants.update as jest.Mock).mockResolvedValue(updatedTenant);

      const result = await tenantRepo.update('test12345678901234567890', updateData);

      expect(result).toEqual(updatedTenant);
      expect(mockAdapter.tenants.update).toHaveBeenCalledWith(
        'test12345678901234567890',
        expect.objectContaining({
          ...updateData,
          updated_at: expect.any(String),
        })
      );
    });

    it('should prevent slug conflicts', async () => {
      const updateData = { slug: 'existing-slug' };
      const existingTenant: Tenant = {
        id: 'uuid-2',
        tenant_id: 'other12345678901234567890',
        name: 'Other Tenant',
        slug: 'existing-slug',
        status: 'active',
        settings: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const currentTenant: Tenant = {
        id: 'uuid-1',
        tenant_id: 'test12345678901234567890',
        name: 'Test Tenant',
        slug: 'test-tenant',
        status: 'active',
        settings: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      (mockAdapter.tenants.query as any).mockResolvedValue([existingTenant]);
      (mockAdapter.tenants.queryOne as any).mockResolvedValue(currentTenant);

      await expect(tenantRepo.update('test12345678901234567890', updateData)).rejects.toThrow(
        'Slug "existing-slug" is already taken'
      );
    });
  });

  describe('deactivate', () => {
    it('should deactivate tenant successfully', async () => {
      const updatedTenant: Tenant = {
        id: 'uuid-1',
        tenant_id: 'test12345678901234567890',
        name: 'Test Tenant',
        slug: 'test-tenant',
        status: 'inactive',
        settings: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      (mockAdapter.tenants.update as jest.Mock).mockResolvedValue(updatedTenant);

      const result = await tenantRepo.deactivate('test12345678901234567890');

      expect(result).toBe(true);
      expect(mockAdapter.tenants.update).toHaveBeenCalledWith(
        'test12345678901234567890',
        expect.objectContaining({
          status: 'inactive',
          updated_at: expect.any(String),
        })
      );
    });

    it('should return false on failure', async () => {
      (mockAdapter.tenants.update as any).mockRejectedValue(new Error('Update failed'));

      const result = await tenantRepo.deactivate('test12345678901234567890');

      expect(result).toBe(false);
    });
  });

  describe('config operations', () => {
    const mockConfig: TenantConfig = {
      id: 'config-uuid-1',
      tenant_id: 'test12345678901234567890',
      supabase_project_id: 'test-project',
      supabase_url: 'https://test.supabase.co',
      anon_key: 'test-anon-key',
      service_key: 'test-service-key',
      plan: 'free',
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    describe('getConfig', () => {
      it('should return config when found', async () => {
        (mockAdapter.configs.query as jest.Mock).mockResolvedValue([mockConfig]);

        const result = await tenantRepo.getConfig('test12345678901234567890');

        expect(result).toEqual(mockConfig);
        expect(mockAdapter.configs.query).toHaveBeenCalledWith({
          filter: { tenant_id: 'test12345678901234567890' },
        });
      });

      it('should return null when config not found', async () => {
        (mockAdapter.configs.query as jest.Mock).mockResolvedValue([]);

        const result = await tenantRepo.getConfig('test12345678901234567890');

        expect(result).toBeNull();
      });
    });

    describe('saveConfig', () => {
      it('should create new config', async () => {
        const configData = {
          supabase_project_id: 'test-project',
          supabase_url: 'https://test.supabase.co',
          anon_key: 'test-anon-key',
          service_key: 'test-service-key',
        };

        (mockAdapter.configs.query as any).mockResolvedValue([]); // No existing config
        (mockAdapter.configs.insert as any).mockResolvedValue(mockConfig);

        const result = await tenantRepo.saveConfig('test12345678901234567890', configData);

        expect(result).toEqual(mockConfig);
        expect(mockAdapter.configs.insert).toHaveBeenCalledWith({
          ...configData,
          tenant_id: 'test12345678901234567890',
          plan: 'free',
          is_active: true,
        });
      });

      it('should update existing config', async () => {
        const configData = {
          supabase_project_id: 'updated-project',
          supabase_url: 'https://updated.supabase.co',
          anon_key: 'updated-anon-key',
          service_key: 'updated-service-key',
        };

        const updatedConfig = { ...mockConfig, ...configData };

        (mockAdapter.configs.query as any).mockResolvedValue([mockConfig]); // Existing config
        (mockAdapter.configs.update as any).mockResolvedValue(updatedConfig);

        const result = await tenantRepo.saveConfig('test12345678901234567890', configData);

        expect(result).toEqual(updatedConfig);
        expect(mockAdapter.configs.update).toHaveBeenCalledWith(
          mockConfig.id,
          expect.objectContaining({
            ...configData,
            updated_at: expect.any(String),
          })
        );
      });

      it('should throw error for missing required fields', async () => {
        const invalidConfigData = {
          supabase_project_id: 'test-project',
          // Missing required fields
        } as any;

        await expect(
          tenantRepo.saveConfig('test12345678901234567890', invalidConfigData)
        ).rejects.toThrow('Missing required config fields');
      });
    });
  });

  describe('count', () => {
    it('should return tenant count', async () => {
      (mockAdapter.tenants.count as any).mockResolvedValue(5);

      const result = await tenantRepo.count();

      expect(result).toBe(5);
      expect(mockAdapter.tenants.count).toHaveBeenCalledWith(undefined);
    });

    it('should return tenant count with filter', async () => {
      (mockAdapter.tenants.count as any).mockResolvedValue(3);

      const result = await tenantRepo.count({ status: 'active' });

      expect(result).toBe(3);
      expect(mockAdapter.tenants.count).toHaveBeenCalledWith({ status: 'active' });
    });

    it('should return 0 on error', async () => {
      (mockAdapter.tenants.count as any).mockRejectedValue(new Error('Count failed'));

      const result = await tenantRepo.count();

      expect(result).toBe(0);
    });
  });
});
