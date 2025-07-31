/**
 * Gateway Endpoints для Entity Conversion Rules
 * Проксирует запросы между клиентами и внутренними сервисами
 * Следует архитектурному паттерну других gateway endpoints
 */

import { api, Query } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';
import type { AuthData } from '../auth';
import type { ApiResponse } from '../../lib/types';

// Импорт service clients для вызова внутренних сервисов
import { tenantManagementClient, dataProcessingClient } from '../utils/service-clients';

// Типы для Entity Conversion Rules (реэкспорт из сервисов)
export interface EntityConversionRule {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  source_entity: string;
  target_entity: string;
  trigger_conditions: any;
  field_mapping: Record<string, string>;
  extension_field_mapping: Record<string, string>;
  conversion_settings: any;
  target_name_template?: string;
  default_values: Record<string, any>;
  approval_settings: any;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateEntityConversionRuleRequest {
  name: string;
  description?: string;
  is_active?: boolean;
  source_entity: string;
  target_entity: string;
  trigger_conditions?: any;
  field_mapping?: Record<string, string>;
  extension_field_mapping?: Record<string, string>;
  conversion_settings?: any;
  target_name_template?: string;
  default_values?: Record<string, any>;
  approval_settings?: any;
}

export interface UpdateEntityConversionRuleRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
  source_entity?: string;
  target_entity?: string;
  trigger_conditions?: any;
  field_mapping?: Record<string, string>;
  extension_field_mapping?: Record<string, string>;
  conversion_settings?: any;
  target_name_template?: string;
  default_values?: Record<string, any>;
  approval_settings?: any;
}

export interface ConversionExecutionResult {
  success: boolean;
  source_record_id: string;
  target_record_id?: string;
  rule_id: string;
  rule_name: string;
  source_entity: string;
  target_entity: string;
  error_message?: string;
  warnings: string[];
  converted_fields: string[];
  skipped_fields: string[];
  converted_extension_fields: string[];
  skipped_extension_fields: string[];
  execution_time_ms: number;
  created_at: string;
}

// Типы для Mapping Suggestions
export interface FieldMappingSuggestion {
  sourceField: string;
  targetField: string;
  confidence: number; // 0.0 - 1.0
  type: 'exact' | 'similar' | 'unmapped';
}

export interface ExtensionFieldMappingSuggestion {
  sourceExtensionField: string;
  targetExtensionField: string;
  confidence: number; // 0.0 - 1.0
  type: 'exact' | 'similar' | 'unmapped';
}

export interface MappingSuggestions {
  fieldSuggestions: FieldMappingSuggestion[];
  extensionFieldSuggestions: ExtensionFieldMappingSuggestion[];
  unmappedSourceFields: string[];
  unmappedTargetFields: string[];
  confidenceScore: number; // Общая оценка качества маппинга
}

// ==========================================
// Tenant Management Endpoints (CRUD правил)
// ==========================================

/**
 * Получение правил конвертации для тенанта
 */
export const getConversionRules = api(
  { auth: true, method: 'GET', path: '/api/v1/entity-conversion-rules' },
  async ({
    sourceEntity,
    isActive,
  }: {
    sourceEntity?: Query<string>;
    isActive?: Query<boolean>;
  }): Promise<ApiResponse<EntityConversionRule[]>> => {
    const authData = getAuthData() as AuthData;

    // Проверяем права доступа
    if (!authData.userRole || !['admin', 'super_admin', 'user'].includes(authData.userRole)) {
      throw new Error('Недостаточно прав для доступа к правилам конвертации');
    }

    return await tenantManagementClient.getConversionRules({
      sourceEntity,
      isActive,
    });
  }
);

/**
 * Получение правила конвертации по ID
 */
export const getConversionRule = api(
  { auth: true, method: 'GET', path: '/api/v1/entity-conversion-rules/:ruleId' },
  async ({ ruleId }: { ruleId: string }): Promise<ApiResponse<EntityConversionRule | null>> => {
    const authData = getAuthData() as AuthData;

    if (!authData.userRole || !['admin', 'super_admin', 'user'].includes(authData.userRole)) {
      throw new Error('Недостаточно прав для доступа к правилам конвертации');
    }

    return await tenantManagementClient.getConversionRule({ ruleId });
  }
);

/**
 * Создание нового правила конвертации
 */
export const createConversionRule = api(
  { auth: true, method: 'POST', path: '/api/v1/entity-conversion-rules' },
  async ({
    ruleData,
  }: {
    ruleData: CreateEntityConversionRuleRequest;
  }): Promise<ApiResponse<EntityConversionRule>> => {
    const authData = getAuthData() as AuthData;

    // Только админы могут создавать правила
    if (!authData.userRole || !['admin', 'super_admin'].includes(authData.userRole)) {
      throw new Error('Недостаточно прав для создания правил конвертации');
    }

    return await tenantManagementClient.createConversionRule({ ruleData });
  }
);

/**
 * Обновление правила конвертации
 */
export const updateConversionRule = api(
  { auth: true, method: 'PUT', path: '/api/v1/entity-conversion-rules/:ruleId' },
  async ({
    ruleId,
    ruleData,
  }: {
    ruleId: string;
    ruleData: UpdateEntityConversionRuleRequest;
  }): Promise<ApiResponse<EntityConversionRule | null>> => {
    const authData = getAuthData() as AuthData;

    // Только админы могут обновлять правила
    if (!authData.userRole || !['admin', 'super_admin'].includes(authData.userRole)) {
      throw new Error('Недостаточно прав для обновления правил конвертации');
    }

    return await tenantManagementClient.updateConversionRule({ ruleId, ruleData });
  }
);

/**
 * Удаление правила конвертации
 */
export const deleteConversionRule = api(
  { auth: true, method: 'DELETE', path: '/api/v1/entity-conversion-rules/:ruleId' },
  async ({
    ruleId,
    hardDelete,
  }: {
    ruleId: string;
    hardDelete?: Query<boolean>;
  }): Promise<ApiResponse<boolean>> => {
    const authData = getAuthData() as AuthData;

    // Только админы могут удалять правила
    if (!authData.userRole || !['admin', 'super_admin'].includes(authData.userRole)) {
      throw new Error('Недостаточно прав для удаления правил конвертации');
    }

    return await tenantManagementClient.deleteConversionRule({ ruleId, hardDelete });
  }
);

/**
 * Получение статистики правил конвертации
 */
export const getConversionRulesStats = api(
  { auth: true, method: 'GET', path: '/api/v1/entity-conversion-rules/stats' },
  async (): Promise<ApiResponse<any[]>> => {
    const authData = getAuthData() as AuthData;

    if (!authData.userRole || !['admin', 'super_admin'].includes(authData.userRole)) {
      throw new Error('Недостаточно прав для просмотра статистики');
    }

    return await tenantManagementClient.getConversionRulesStats();
  }
);

/**
 * Валидация условий срабатывания
 */
export const validateTriggerConditions = api(
  { auth: true, method: 'POST', path: '/api/v1/entity-conversion-rules/validate-conditions' },
  async ({
    conditions,
    sourceEntity,
  }: {
    conditions: any;
    sourceEntity: string;
  }): Promise<ApiResponse<{ isValid: boolean; errors: string[] }>> => {
    const authData = getAuthData() as AuthData;

    if (!authData.userRole || !['admin', 'super_admin', 'user'].includes(authData.userRole)) {
      throw new Error('Недостаточно прав для валидации условий');
    }

    return await tenantManagementClient.validateTriggerConditions({ conditions, sourceEntity });
  }
);

// ==========================================
// Data Processing Endpoints (Выполнение конвертации)
// ==========================================

/**
 * Выполнение конвертации сущности
 */
export const executeConversion = api(
  { auth: true, method: 'POST', path: '/api/v1/conversion/execute' },
  async ({
    ruleId,
    sourceRecordId,
  }: {
    ruleId: string;
    sourceRecordId: string;
  }): Promise<ApiResponse<ConversionExecutionResult>> => {
    const authData = getAuthData() as AuthData;

    if (!authData.userRole || !['admin', 'super_admin', 'user'].includes(authData.userRole)) {
      throw new Error('Недостаточно прав для выполнения конвертации');
    }

    return await dataProcessingClient.executeConversion({ ruleId, sourceRecordId });
  }
);

/**
 * Получение доступных правил конвертации для сущности
 */
export const getAvailableConversionRules = api(
  { auth: true, method: 'GET', path: '/api/v1/conversion/available/:sourceEntity' },
  async ({ sourceEntity }: { sourceEntity: string }): Promise<ApiResponse<any[]>> => {
    const authData = getAuthData() as AuthData;

    if (!authData.userRole || !['admin', 'super_admin', 'user'].includes(authData.userRole)) {
      throw new Error('Недостаточно прав для просмотра доступных правил');
    }

    return await dataProcessingClient.getAvailableRules({ sourceEntity });
  }
);

/**
 * Проверка автоматических триггеров для записи
 */
export const checkAutoTriggers = api(
  { auth: true, method: 'POST', path: '/api/v1/conversion/check-triggers' },
  async ({
    entityTable,
    recordId,
  }: {
    entityTable: string;
    recordId: string;
  }): Promise<ApiResponse<ConversionExecutionResult[]>> => {
    const authData = getAuthData() as AuthData;

    if (!authData.userRole || !['admin', 'super_admin', 'user'].includes(authData.userRole)) {
      throw new Error('Недостаточно прав для проверки автотриггеров');
    }

    return await dataProcessingClient.checkAutoTriggersForRecord({ entityTable, recordId });
  }
);

/**
 * Валидация условий срабатывания (через Data Processing)
 */
export const validateConditions = api(
  { auth: true, method: 'POST', path: '/api/v1/conversion/validate-conditions' },
  async ({
    conditions,
    record,
    extensionFields,
  }: {
    conditions: any;
    record: Record<string, any>;
    extensionFields?: Record<string, any>;
  }): Promise<ApiResponse<boolean>> => {
    const authData = getAuthData() as AuthData;

    if (!authData.userRole || !['admin', 'super_admin', 'user'].includes(authData.userRole)) {
      throw new Error('Недостаточно прав для валидации условий');
    }

    return await dataProcessingClient.validateConditions({ conditions, record, extensionFields });
  }
);

// ==========================================
// Webhook Endpoints (для автоматических триггеров)
// ==========================================

/**
 * Webhook для автоматической проверки триггеров при создании записи
 * Вызывается автоматически после создания записи в любой сущности
 */
export const onRecordCreated = api(
  { auth: true, method: 'POST', path: '/api/v1/conversion/webhooks/record-created' },
  async ({
    entityTable,
    recordId,
    recordData,
  }: {
    entityTable: string;
    recordId: string;
    recordData: Record<string, any>;
  }): Promise<ApiResponse<ConversionExecutionResult[]>> => {
    try {
      // Проверяем автоматические триггеры для созданной записи
      const results = await dataProcessingClient.checkAutoTriggersForRecord({
        entityTable,
        recordId,
      });

      return {
        data: results.data || [],
        message: `Проверены автотриггеры для ${entityTable}:${recordId}. Выполнено конвертаций: ${
          results.data?.length || 0
        }`,
      };
    } catch (error) {
      console.error('Ошибка при проверке автотриггеров:', error);
      return {
        data: [],
        message: `Ошибка при проверке автотриггеров: ${error}`,
      };
    }
  }
);

/**
 * Webhook для автоматической проверки триггеров при обновлении записи
 * Вызывается автоматически после обновления записи в любой сущности
 */
export const onRecordUpdated = api(
  { auth: true, method: 'POST', path: '/api/v1/conversion/webhooks/record-updated' },
  async ({
    entityTable,
    recordId,
    recordData,
    previousData,
  }: {
    entityTable: string;
    recordId: string;
    recordData: Record<string, any>;
    previousData?: Record<string, any>;
  }): Promise<ApiResponse<ConversionExecutionResult[]>> => {
    try {
      // Проверяем автоматические триггеры для обновленной записи
      const results = await dataProcessingClient.checkAutoTriggersForRecord({
        entityTable,
        recordId,
      });

      return {
        data: results.data || [],
        message: `Проверены автотриггеры для обновленной записи ${entityTable}:${recordId}. Выполнено конвертаций: ${
          results.data?.length || 0
        }`,
      };
    } catch (error) {
      console.error('Ошибка при проверке автотриггеров:', error);
      return {
        data: [],
        message: `Ошибка при проверке автотриггеров: ${error}`,
      };
    }
  }
);

/**
 * Получение предложений маппинга между сущностями
 * Генерирует умные предложения по маппингу полей на основе анализа схем
 */
export const getMappingSuggestions = api(
  { auth: true, method: 'POST', path: '/api/v1/entity-conversion-suggestions' },
  async ({
    sourceEntity,
    targetEntity,
  }: {
    sourceEntity: string;
    targetEntity: string;
  }): Promise<ApiResponse<MappingSuggestions>> => {
    try {
      // Проверка прав доступа - только администраторы могут получать предложения маппинга
      const authData = getAuthData() as AuthData;
      // if (!authData || (authData.userRole !== 'admin' && authData.userRole !== 'super_admin')) {
      //   throw new Error('Доступ запрещен. Только администраторы могут получать предложения маппинга.');
      // }

      // Получение предложений маппинга через tenant management client
      const suggestions = await tenantManagementClient.getMappingSuggestions(authData.tenantId, {
        sourceEntity,
        targetEntity,
      });

      return {
        data: suggestions.data,
        message: `Получены предложения маппинга между ${sourceEntity} и ${targetEntity}`,
      };
    } catch (error) {
      console.error('Ошибка при получении предложений маппинга:', error);
      return {
        data: {
          fieldSuggestions: [],
          extensionFieldSuggestions: [],
          unmappedSourceFields: [],
          unmappedTargetFields: [],
          confidenceScore: 0,
        },
        message: `Ошибка при получении предложений маппинга: ${error}`,
      };
    }
  }
);
