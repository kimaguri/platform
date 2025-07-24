/**
 * Integration tests for Admin DB connection
 * Tests real operations with simplx_crm_tenant database
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createAdminAdapter } from '../adapters/adminAdapter';
import { createTenantRepository } from '../repositories/tenantRepository';
import { createExtensionFieldRepository } from '../repositories/extensionFieldRepository';
import type { CreateTenantData } from '../types';

describe('Admin DB Integration Tests', () => {
  let tenantRepo: ReturnType<typeof createTenantRepository>;
  let extensionRepo: ReturnType<typeof createExtensionFieldRepository>;

  beforeAll(async () => {
    const adapter = createAdminAdapter();
    
    // Initialize all adapters
    await adapter.tenants.connect();
    await adapter.configs.connect();
    await adapter.extensionFields.connect();
    
    tenantRepo = createTenantRepository(adapter);
    extensionRepo = createExtensionFieldRepository(adapter);
  });

  describe('Tenant Operations', () => {
    it('should connect to admin database', async () => {
      const count = await tenantRepo.count();
      expect(typeof count).toBe('number');
      console.log(`Found ${count} tenants in admin database`);
    });

    it('should list existing tenants', async () => {
      const tenants = await tenantRepo.findAll();
      console.log('Existing tenants:', tenants);
      expect(Array.isArray(tenants)).toBe(true);
    });

    it('should create and retrieve a test tenant', async () => {
      const testTenantData: CreateTenantData = {
        tenant_id: 'test12345678901234567890',
        name: 'Integration Test Tenant',
        slug: 'integration-test-tenant',
        settings: { theme: 'dark', language: 'en' }
      };

      // Clean up if exists
      const existing = await tenantRepo.findBySlug(testTenantData.slug);
      if (existing) {
        await tenantRepo.deactivate(existing.tenant_id);
      }

      // Create new tenant
      const created = await tenantRepo.create(testTenantData);
      expect(created).toBeTruthy();
      expect(created.name).toBe(testTenantData.name);
      expect(created.slug).toBe(testTenantData.slug);

      // Retrieve by ID
      const retrieved = await tenantRepo.findById(created.tenant_id);
      expect(retrieved).toBeTruthy();
      expect(retrieved?.name).toBe(testTenantData.name);

      // Retrieve by slug
      const bySlug = await tenantRepo.findBySlug(testTenantData.slug);
      expect(bySlug).toBeTruthy();
      expect(bySlug?.tenant_id).toBe(created.tenant_id);

      console.log('Test tenant created:', created);
    });

    it('should update tenant settings', async () => {
      const testTenantData: CreateTenantData = {
        tenant_id: 'test12345678901234567891',
        name: 'Update Test Tenant',
        slug: 'update-test-tenant',
        settings: { theme: 'light' }
      };

      // Clean up if exists
      const existing = await tenantRepo.findBySlug(testTenantData.slug);
      if (existing) {
        await tenantRepo.deactivate(existing.tenant_id);
      }

      // Create tenant
      const created = await tenantRepo.create(testTenantData);
      
      // Update settings
      const updated = await tenantRepo.update(created.tenant_id, {
        settings: { theme: 'dark', language: 'ru' }
      });
      
      expect(updated).toBeTruthy();
      expect(updated.settings.theme).toBe('dark');
      expect(updated.settings.language).toBe('ru');

      console.log('Tenant updated:', updated);
    });

    it('should manage tenant config', async () => {
      const tenantId = 'test12345678901234567892';
      
      // Create tenant first
      const testTenantData: CreateTenantData = {
        tenant_id: tenantId,
        name: 'Config Test Tenant',
        slug: 'config-test-tenant'
      };

      const existing = await tenantRepo.findBySlug(testTenantData.slug);
      if (!existing) {
        await tenantRepo.create(testTenantData);
      }

      // Save config
      const config = await tenantRepo.saveConfig(tenantId, {
        supabase_project_id: 'test-project',
        supabase_url: 'https://test.supabase.co',
        anon_key: 'test-anon-key',
        service_key: 'test-service-key'
      });

      expect(config).toBeTruthy();
      expect(config.supabase_project_id).toBe('test-project');

      // Get config
      const retrievedConfig = await tenantRepo.getConfig(tenantId);
      expect(retrievedConfig).toBeTruthy();
      expect(retrievedConfig?.supabase_project_id).toBe('test-project');

      console.log('Config saved and retrieved:', retrievedConfig);
    });
  });

  describe('Extension Field Operations', () => {
    it('should create extension field definition', async () => {
      const tenantId = 'test12345678901234567893';
      
      // Create tenant first
      const testTenantData: CreateTenantData = {
        tenant_id: tenantId,
        name: 'Extension Field Test Tenant',
        slug: 'extension-field-test-tenant'
      };

      const existing = await tenantRepo.findBySlug(testTenantData.slug);
      if (!existing) {
        await tenantRepo.create(testTenantData);
      }

      // Create extension field
      const field = await extensionRepo.create(tenantId, {
        entity_table: 'contacts',
        field_name: 'custom_notes',
        field_type: 'textarea',
        display_name: 'Custom Notes',
        description: 'Additional notes for contacts',
        is_required: false,
        default_value: '',
        validation_rules: { max_length: 1000 },
        options: {}
      });

      expect(field).toBeTruthy();
      expect(field.field_name).toBe('custom_notes');
      expect(field.entity_table).toBe('contacts');

      console.log('Extension field created:', field);

      // List fields for tenant
      const fields = await extensionRepo.findByTenant(tenantId);
      expect(Array.isArray(fields)).toBe(true);
      expect(fields.length).toBeGreaterThan(0);

      console.log('Extension fields for tenant:', fields);
    });

    it('should handle tenant lifecycle', async () => {
      const tenantId = 'test12345678901234567894';
      
      // Create tenant
      const testTenantData: CreateTenantData = {
        tenant_id: tenantId,
        name: 'Lifecycle Test Tenant',
        slug: 'lifecycle-test-tenant'
      };

      const existing = await tenantRepo.findBySlug(testTenantData.slug);
      if (existing) {
        await tenantRepo.deactivate(existing.tenant_id);
      }

      const created = await tenantRepo.create(testTenantData);
      expect(created.status).toBe('active');

      // Deactivate
      const deactivated = await tenantRepo.deactivate(tenantId);
      expect(deactivated).toBe(true);

      // Verify status
      const retrieved = await tenantRepo.findById(tenantId);
      expect(retrieved?.status).toBe('inactive');

      console.log('Tenant lifecycle test completed:', retrieved);
    });
  });

  describe('Database Health Check', () => {
    it('should verify all tables exist', async () => {
      const tenantCount = await tenantRepo.count();
      const extensionCount = await extensionRepo.count();
      
      console.log(`Health check: ${tenantCount} tenants, ${extensionCount} extension fields`);
      
      expect(typeof tenantCount).toBe('number');
      expect(typeof extensionCount).toBe('number');
    });

    it('should test connection to all tables', async () => {
      // Test tenants table
      const tenants = await tenantRepo.findAll();
      expect(Array.isArray(tenants)).toBe(true);
      
      // Test extension fields table
      const extensions = await extensionRepo.findByTenant('test-tenant');
      expect(Array.isArray(extensions)).toBe(true);
      
      console.log('All table connections verified');
    });
  });
});
