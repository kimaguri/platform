/**
 * Entity Conversion Rules Service для Tenant Management
 * Функциональный подход - только функции, без классов
 * Аналогично extensible-fields.ts - работа с админской БД через коннекторы
 * Кеширование правил конвертации с TTL для оптимизации
 */

import { getAdminSupabaseUrl, getAdminSupabaseServiceKey } from '../service';
import { createClient } from '@supabase/supabase-js';
import type {
  EntityConversionRule,
  CreateEntityConversionRuleRequest,
  UpdateEntityConversionRuleRequest,
  EntityConversionRuleFilter,
  ConversionRuleStats,
  AvailableEntity,
  MappingSuggestions,
  TriggerConditions,
  FieldMapping,
  ExtensionFieldMapping
} from './types/entity-conversion';

// Импорт для публикации событий
import { eventManagementClient } from '../../../gateway/utils/service-clients';

/**
 * Публикация события правила конвертации в Event Management Service
 */
async function publishConversionRuleEvent(
  eventType: 'conversion-rule-created' | 'conversion-rule-updated' | 'conversion-rule-deleted',
  data: {
    tenantId: string;
    ruleId: string;
    ruleName: string;
    sourceEntity: string;
    targetEntity: string;
    performedBy?: string;
    changes?: Record<string, any>;
  }
): Promise<void> {
  try {
    await eventManagementClient.publishConversionEvent({
      eventType: eventType,
      eventData: data,
    });
  } catch (error) {
    console.error('Ошибка публикации события правила конвертации:', error);
    // Не прерываем выполнение операции из-за ошибки публикации события
  }
}

// Кеш для правил конвертации (аналогично fieldDefinitionsCache)
const conversionRulesCache = new Map<
  string,
  { data: EntityConversionRule[]; timestamp: number }
>();

const CACHE_TTL = 5 * 60 * 1000; // 5 минут

/**
 * Получение клиента для работы с админской БД
 */
function getAdminClient() {
  const supabaseUrl = getAdminSupabaseUrl();
  const serviceKey = getAdminSupabaseServiceKey();
  
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Получение правил конвертации для тенанта с кешированием
 */
export async function getConversionRulesForTenant(
  tenantId: string,
  sourceEntity?: string,
  isActive?: boolean
): Promise<EntityConversionRule[]> {
  const cacheKey = `${tenantId}:${sourceEntity || 'all'}:${isActive ?? 'any'}`;
  const cached = conversionRulesCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const adminClient = getAdminClient();
    let query = adminClient
      .from('entity_conversion_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (sourceEntity) {
      query = query.eq('source_entity', sourceEntity);
    }

    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Ошибка получения правил конвертации:', error);
      throw new Error(`Не удалось получить правила конвертации: ${error.message}`);
    }

    const rules = data || [];
    
    // Кешируем результат
    conversionRulesCache.set(cacheKey, {
      data: rules,
      timestamp: Date.now()
    });

    return rules;
  } catch (error) {
    console.error('Ошибка в getConversionRulesForTenant:', error);
    throw error;
  }
}

/**
 * Получение конкретного правила конвертации по ID
 */
export async function getConversionRuleById(
  ruleId: string
): Promise<EntityConversionRule | null> {
  try {
    const adminClient = getAdminClient();
    const { data, error } = await adminClient
      .from('entity_conversion_rules')
      .select('*')
      .eq('id', ruleId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Правило не найдено
      }
      console.error('Ошибка получения правила конвертации:', error);
      throw new Error(`Не удалось получить правило конвертации: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Ошибка в getConversionRuleById:', error);
    throw error;
  }
}

/**
 * Создание нового правила конвертации
 */
export async function createConversionRule(
  tenantId: string,
  ruleData: CreateEntityConversionRuleRequest,
  createdBy?: string
): Promise<EntityConversionRule> {
  try {
    // Валидация входных данных
    if (!ruleData.name || !ruleData.source_entity || !ruleData.target_entity) {
      throw new Error('Обязательные поля: name, source_entity, target_entity');
    }

    if (ruleData.source_entity === ruleData.target_entity) {
      throw new Error('Исходная и целевая сущности не могут быть одинаковыми');
    }

    const adminClient = getAdminClient();
    
    // Проверяем уникальность имени в рамках тенанта
    const { data: existing } = await adminClient
      .from('entity_conversion_rules')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('name', ruleData.name)
      .single();

    if (existing) {
      throw new Error(`Правило с именем "${ruleData.name}" уже существует`);
    }

    const newRule = {
      tenant_id: tenantId,
      name: ruleData.name,
      description: ruleData.description || null,
      is_active: ruleData.is_active ?? true,
      source_entity: ruleData.source_entity,
      target_entity: ruleData.target_entity,
      trigger_conditions: ruleData.trigger_conditions || {},
      field_mapping: ruleData.field_mapping || {},
      extension_field_mapping: ruleData.extension_field_mapping || {},
      conversion_settings: ruleData.conversion_settings || {
        preserve_source: true,
        allow_rollback: false,
        copy_activities: false,
        copy_watchers: false,
        auto_conversion_enabled: false,
        manual_conversion_enabled: true
      },
      target_name_template: ruleData.target_name_template || null,
      default_values: ruleData.default_values || {},
      approval_settings: ruleData.approval_settings || {
        requires_approval: false,
        approval_roles: [],
        approval_workflow_id: null
      },
      created_by: createdBy || null
    };

    const { data, error } = await adminClient
      .from('entity_conversion_rules')
      .insert(newRule)
      .select()
      .single();

    if (error) {
      console.error('Ошибка создания правила конвертации:', error);
      throw new Error(`Не удалось создать правило конвертации: ${error.message}`);
    }

    // Инвалидируем кеш для тенанта
    invalidateConversionRulesCache(tenantId);

    // Публикуем событие создания правила конвертации
    await publishConversionRuleEvent('conversion-rule-created', {
      tenantId,
      ruleId: data.id,
      ruleName: data.name,
      sourceEntity: data.source_entity,
      targetEntity: data.target_entity,
      performedBy: createdBy
    });

    return data;
  } catch (error) {
    console.error('Ошибка в createConversionRule:', error);
    throw error;
  }
}

/**
 * Обновление правила конвертации
 */
export async function updateConversionRule(
  ruleId: string,
  ruleData: UpdateEntityConversionRuleRequest
): Promise<EntityConversionRule | null> {
  try {
    // Валидация
    if (ruleData.source_entity && ruleData.target_entity && 
        ruleData.source_entity === ruleData.target_entity) {
      throw new Error('Исходная и целевая сущности не могут быть одинаковыми');
    }

    const adminClient = getAdminClient();

    // Получаем текущее правило для проверки tenant_id
    const currentRule = await getConversionRuleById(ruleId);
    if (!currentRule) {
      return null;
    }

    // Проверяем уникальность имени, если оно изменяется
    if (ruleData.name && ruleData.name !== currentRule.name) {
      const { data: existing } = await adminClient
        .from('entity_conversion_rules')
        .select('id')
        .eq('tenant_id', currentRule.tenant_id)
        .eq('name', ruleData.name)
        .single();

      if (existing) {
        throw new Error(`Правило с именем "${ruleData.name}" уже существует`);
      }
    }

    const { data, error } = await adminClient
      .from('entity_conversion_rules')
      .update(ruleData)
      .eq('id', ruleId)
      .select()
      .single();

    if (error) {
      console.error('Ошибка обновления правила конвертации:', error);
      throw new Error(`Не удалось обновить правило конвертации: ${error.message}`);
    }

    // Инвалидируем кеш для тенанта
    invalidateConversionRulesCache(currentRule.tenant_id);

    // Публикуем событие обновления правила конвертации
    await publishConversionRuleEvent('conversion-rule-updated', {
      tenantId: currentRule.tenant_id,
      ruleId: data.id,
      ruleName: data.name,
      sourceEntity: data.source_entity,
      targetEntity: data.target_entity,
      changes: ruleData
    });

    return data;
  } catch (error) {
    console.error('Ошибка в updateConversionRule:', error);
    throw error;
  }
}

/**
 * Удаление правила конвертации (мягкое удаление - деактивация)
 */
export async function deleteConversionRule(
  ruleId: string,
  softDelete: boolean = true
): Promise<boolean> {
  try {
    const adminClient = getAdminClient();

    // Получаем текущее правило для проверки tenant_id
    const currentRule = await getConversionRuleById(ruleId);
    if (!currentRule) {
      return false;
    }

    if (softDelete) {
      // Мягкое удаление - деактивация
      const { error } = await adminClient
        .from('entity_conversion_rules')
        .update({ is_active: false })
        .eq('id', ruleId);

      if (error) {
        console.error('Ошибка деактивации правила конвертации:', error);
        throw new Error(`Не удалось деактивировать правило конвертации: ${error.message}`);
      }
    } else {
      // Жесткое удаление
      const { error } = await adminClient
        .from('entity_conversion_rules')
        .delete()
        .eq('id', ruleId);

      if (error) {
        console.error('Ошибка удаления правила конвертации:', error);
        throw new Error(`Не удалось удалить правило конвертации: ${error.message}`);
      }
    }

    // Инвалидируем кеш для тенанта
    invalidateConversionRulesCache(currentRule.tenant_id);

    // Публикуем событие удаления правила конвертации
    await publishConversionRuleEvent('conversion-rule-deleted', {
      tenantId: currentRule.tenant_id,
      ruleId: currentRule.id,
      ruleName: currentRule.name,
      sourceEntity: currentRule.source_entity,
      targetEntity: currentRule.target_entity
    });

    return true;
  } catch (error) {
    console.error('Ошибка в deleteConversionRule:', error);
    throw error;
  }
}

/**
 * Получение статистики использования правил конвертации
 * TODO: Реализовать после создания таблицы conversion_history
 */
export async function getConversionRulesStats(
  tenantId: string
): Promise<ConversionRuleStats[]> {
  // Заглушка для будущей реализации
  return [];
}

/**
 * Валидация условий срабатывания правила
 */
export function validateTriggerConditions(
  conditions: TriggerConditions,
  availableFields: string[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  function validateCondition(condition: any, path: string = ''): void {
    if (condition.and || condition.or) {
      // Логическое условие
      const logicalKey = condition.and ? 'and' : 'or';
      const subConditions = condition[logicalKey];
      
      if (!Array.isArray(subConditions) || subConditions.length === 0) {
        errors.push(`${path}${logicalKey}: должен содержать массив условий`);
        return;
      }

      subConditions.forEach((subCondition, index) => {
        validateCondition(subCondition, `${path}${logicalKey}[${index}].`);
      });
    } else {
      // Простое условие
      if (!condition.field) {
        errors.push(`${path}field: обязательное поле`);
      } else if (!availableFields.includes(condition.field)) {
        errors.push(`${path}field: поле "${condition.field}" не найдено в доступных полях`);
      }

      if (!condition.operator) {
        errors.push(`${path}operator: обязательное поле`);
      } else {
        const validOperators = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'like', 'in', 'not_in', 'is_null', 'is_not_null'];
        if (!validOperators.includes(condition.operator)) {
          errors.push(`${path}operator: недопустимый оператор "${condition.operator}"`);
        }
      }

      // Проверяем наличие value для операторов, которые его требуют
      const operatorsRequiringValue = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'like', 'in', 'not_in'];
      if (operatorsRequiringValue.includes(condition.operator) && condition.value === undefined) {
        errors.push(`${path}value: обязательное поле для оператора "${condition.operator}"`);
      }
    }
  }

  try {
    validateCondition(conditions);
  } catch (error) {
    errors.push(`Ошибка валидации: ${error}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Инвалидация кеша правил конвертации
 */
export function invalidateConversionRulesCache(tenantId?: string): void {
  if (tenantId) {
    // Удаляем все записи для конкретного тенанта
    for (const [key] of conversionRulesCache) {
      if (key.startsWith(`${tenantId}:`)) {
        conversionRulesCache.delete(key);
      }
    }
  } else {
    // Очищаем весь кеш
    conversionRulesCache.clear();
  }
}

/**
 * Получение статистики кеша
 */
export function getConversionRulesCacheStats(): { size: number; entries: string[] } {
  return {
    size: conversionRulesCache.size,
    entries: Array.from(conversionRulesCache.keys())
  };
}
