import { api, Query } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';
import type { AuthData } from '../../gateway/auth';
import type { ApiResponse } from '../../lib/types';
import type {
  Tenant,
  TenantFullInfo,
  CreateTenantRequest,
  UpdateTenantRequest,
  CreateSupabaseConfigRequest,
  TenantConfig,
} from './src/models/tenant';
import type { ExtensionFieldDefinition } from './src/extensible-fields';
import * as TenantService from './service';

/**
 * Tenant Management API Endpoints
 * RPC endpoints called internally by API Gateway
 * Functional approach - no classes, only pure functions
 */

/**
 * List all tenants (admin only)
 */
export const listTenants = api(
  { auth: true, method: 'GET', path: '/tenants/list' },
  async ({
    limit,
    offset,
  }: {
    limit?: Query<number>;
    offset?: Query<number>;
  }): Promise<ApiResponse<Tenant[]>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.getTenantList({
      limit: limit || 50,
      offset: offset || 0,
    });
  }
);

/**
 * Get tenant by ID
 */
export const getTenant = api(
  { auth: true, method: 'GET', path: '/tenants/:tenantId' },
  async ({ tenantId }: { tenantId: string }): Promise<ApiResponse<TenantFullInfo>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.getTenantById(tenantId);
  }
);

/**
 * Create new tenant
 */
export const createTenant = api(
  { auth: true, method: 'POST', path: '/tenants/create' },
  async ({ data }: { data: CreateTenantRequest }): Promise<ApiResponse<Tenant>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.createTenant(data);
  }
);

/**
 * Update tenant
 */
export const updateTenant = api(
  { auth: true, method: 'PUT', path: '/tenants/:tenantId' },
  async ({
    tenantId,
    data,
  }: {
    tenantId: string;
    data: UpdateTenantRequest;
  }): Promise<ApiResponse<Tenant>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.updateTenant(tenantId, data);
  }
);

/**
 * Deactivate tenant
 */
export const deactivateTenant = api(
  { auth: true, method: 'DELETE', path: '/tenants/:tenantId' },
  async ({ tenantId }: { tenantId: string }): Promise<ApiResponse<boolean>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.deactivateTenant(tenantId);
  }
);

/**
 * Create Supabase configuration for tenant
 */
export const createSupabaseConfig = api(
  { auth: true, method: 'POST', path: '/tenants/:tenantId/supabase-config' },
  async ({
    tenantId,
    data,
  }: {
    tenantId: string;
    data: CreateSupabaseConfigRequest;
  }): Promise<ApiResponse<TenantConfig>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.createSupabaseConfig(tenantId, data);
  }
);

// ===== EXTENSIBLE FIELDS ENDPOINTS =====

/**
 * Получение определений полей для тенанта и сущности
 * Используется Content Management Service для получения метаданных
 */
export const getFieldDefinitions = api(
  { auth: true, method: 'GET', path: '/tenants/:tenantId/fields/:entityTable' },
  async ({
    tenantId,
    entityTable,
  }: {
    tenantId: string;
    entityTable: string;
  }): Promise<ApiResponse<ExtensionFieldDefinition[]>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.getFieldDefinitionsForTenant(tenantId, entityTable);
  }
);

/**
 * Получение всех определений полей для тенанта
 */
export const getAllFieldDefinitions = api(
  { auth: true, method: 'GET', path: '/tenants/:tenantId/fields' },
  async ({
    tenantId,
  }: {
    tenantId: string;
  }): Promise<ApiResponse<Record<string, ExtensionFieldDefinition[]>>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.getAllFieldDefinitionsForTenant(tenantId);
  }
);

/**
 * Создание нового определения поля
 */
export const createFieldDefinition = api(
  { auth: true, method: 'POST', path: '/tenants/:tenantId/fields' },
  async ({
    tenantId,
    fieldDefinition,
  }: {
    tenantId: string;
    fieldDefinition: Omit<
      ExtensionFieldDefinition,
      'id' | 'tenant_id' | 'created_at' | 'updated_at'
    >;
  }): Promise<ApiResponse<ExtensionFieldDefinition>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.createFieldDefinition(tenantId, fieldDefinition);
  }
);

/**
 * Обновление определения поля
 */
export const updateFieldDefinition = api(
  { auth: true, method: 'PUT', path: '/tenants/fields/:fieldId' },
  async ({
    fieldId,
    updates,
  }: {
    fieldId: number;
    updates: Partial<
      Omit<ExtensionFieldDefinition, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>
    >;
  }): Promise<ApiResponse<ExtensionFieldDefinition>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.updateFieldDefinition(fieldId, updates);
  }
);

/**
 * Удаление определения поля
 */
export const deleteFieldDefinition = api(
  { auth: true, method: 'DELETE', path: '/tenants/fields/:fieldId' },
  async ({ fieldId }: { fieldId: number }): Promise<ApiResponse<boolean>> => {
    const authData = getAuthData() as AuthData;
    return TenantService.deleteFieldDefinition(fieldId);
  }
);

/**
 * Получение статистики использования extensible fields
 */
export const getExtensibleFieldsStats = api(
  { auth: true, method: 'GET', path: '/tenants/extensible-fields/stats' },
  async (): Promise<
    ApiResponse<{
      totalTenants: number;
      totalFields: number;
      fieldsByTenant: Record<string, number>;
      fieldsByEntity: Record<string, number>;
    }>
  > => {
    const authData = getAuthData() as AuthData;
    return TenantService.getExtensibleFieldsStats();
  }
);

/**
 * Получение списка поддерживаемых сущностей
 */
export const getSupportedEntities = api(
  { auth: true, method: 'GET', path: '/tenants/extensible-fields/supported-entities' },
  async (): Promise<ApiResponse<string[]>> => {
    return TenantService.getSupportedEntities();
  }
);
