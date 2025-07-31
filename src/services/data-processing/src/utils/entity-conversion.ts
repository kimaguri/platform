/**
 * Entity Conversion Service для Data Processing
 * Функциональный подход - только функции, без классов
 * Аналогично extensible-fields.ts - использование getAdapterForTenant()
 * Интеграция с системой extensible fields для конвертации расширяемых полей
 */

import { getAdapterForTenant } from '../../../../connectors/registry/connector-registry';
import type { Adapter } from '../../../../connectors/base';
import {
  getFieldDefinitionsFromTenantService,
  parseExtensionFieldValues,
  type ExtensionFieldValue,
  type EntityWithExtensions
} from './extensible-fields';
import type { ExtensionFieldDefinition } from '../../../tenant-management/src/extensible-fields';

// Импорт типов из Tenant Management Service
import type {
  EntityConversionRule,
  TriggerConditions,
  TriggerCondition,
  LogicalCondition,
  FieldMapping,
  ExtensionFieldMapping,
  ConversionResult,
  DefaultValues
} from '../../../tenant-management/src/types/entity-conversion';

// Импорт для публикации событий
import { eventManagementClient } from '../../../../gateway/utils/service-clients';

/**
 * Публикация события конвертации в Event Management Service
 */
async function publishConversionEvent(
  eventType: 'entity-converted' | 'auto-conversion-triggered',
  data: {
    tenantId: string;
    ruleId: string;
    ruleName: string;
    sourceEntity: string;
    targetEntity: string;
    sourceRecordId: string;
    targetRecordId?: string;
    conversionType: 'manual' | 'automatic';
    performedBy?: string;
    fieldMappings: Record<string, any>;
    extensionFieldMappings: Record<string, any>;
    triggerConditions?: Record<string, any>;
    triggerData?: Record<string, any>;
  }
): Promise<void> {
  try {
    await eventManagementClient.publishConversionEvent({
      eventType: eventType,
      eventData: data,
    });
  } catch (error) {
    console.error('Ошибка публикации события конвертации:', error);
    // Не прерываем выполнение конвертации из-за ошибки публикации события
  }
}

/**
 * Результат выполнения конвертации с детальной информацией
 */
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

/**
 * Контекст выполнения конвертации
 */
interface ConversionContext {
  tenantId: string;
  rule: EntityConversionRule;
  sourceRecord: Record<string, any>;
  sourceExtensionFields: ExtensionFieldValue;
  targetExtensionFieldDefinitions: ExtensionFieldDefinition[];
  jwtToken?: string;
}

/**
 * Получение правил конвертации от Tenant Management Service
 */
async function getConversionRulesFromTenantService(
  tenantId: string,
  sourceEntity?: string,
  isActive?: boolean
): Promise<EntityConversionRule[]> {
  try {
    // TODO: Реализовать вызов Tenant Management Service через RPC
    // Пока возвращаем пустой массив как заглушку
    console.log(`Получение правил конвертации для тенанта ${tenantId}, сущность: ${sourceEntity}`);
    return [];
  } catch (error) {
    console.error('Ошибка получения правил конвертации:', error);
    throw new Error(`Не удалось получить правила конвертации: ${error}`);
  }
}

/**
 * Получение конкретного правила конвертации по ID
 */
async function getConversionRuleById(ruleId: string): Promise<EntityConversionRule | null> {
  try {
    // TODO: Реализовать вызов Tenant Management Service через RPC
    console.log(`Получение правила конвертации ${ruleId}`);
    return null;
  } catch (error) {
    console.error('Ошибка получения правила конвертации:', error);
    throw new Error(`Не удалось получить правило конвертации: ${error}`);
  }
}

/**
 * Проверка условий срабатывания правила конвертации
 */
export function checkTriggerConditions(
  conditions: TriggerConditions,
  record: Record<string, any>,
  extensionFields: ExtensionFieldValue = {}
): boolean {
  try {
    return evaluateCondition(conditions, record, extensionFields);
  } catch (error) {
    console.error('Ошибка проверки условий срабатывания:', error);
    return false;
  }
}

/**
 * Рекурсивная оценка условий (поддержка AND/OR логики)
 */
function evaluateCondition(
  condition: TriggerConditions,
  record: Record<string, any>,
  extensionFields: ExtensionFieldValue
): boolean {
  // Проверяем, является ли это логическим условием
  const logicalCondition = condition as LogicalCondition;
  
  if (logicalCondition.and) {
    // Все условия должны быть истинными (AND)
    return logicalCondition.and.every(subCondition => 
      evaluateCondition(subCondition, record, extensionFields)
    );
  }
  
  if (logicalCondition.or) {
    // Хотя бы одно условие должно быть истинным (OR)
    return logicalCondition.or.some(subCondition => 
      evaluateCondition(subCondition, record, extensionFields)
    );
  }
  
  // Простое условие
  const simpleCondition = condition as TriggerCondition;
  return evaluateSimpleCondition(simpleCondition, record, extensionFields);
}

/**
 * Оценка простого условия
 */
function evaluateSimpleCondition(
  condition: TriggerCondition,
  record: Record<string, any>,
  extensionFields: ExtensionFieldValue
): boolean {
  const { field, operator, value } = condition;
  
  // Получаем значение поля (сначала из основных полей, потом из extension fields)
  let fieldValue = record[field];
  if (fieldValue === undefined && extensionFields[field] !== undefined) {
    fieldValue = extensionFields[field];
  }
  
  switch (operator) {
    case 'eq':
      return fieldValue === value;
    case 'ne':
      return fieldValue !== value;
    case 'gt':
      return fieldValue > value;
    case 'gte':
      return fieldValue >= value;
    case 'lt':
      return fieldValue < value;
    case 'lte':
      return fieldValue <= value;
    case 'like':
      return typeof fieldValue === 'string' && 
             typeof value === 'string' && 
             fieldValue.toLowerCase().includes(value.toLowerCase());
    case 'in':
      return Array.isArray(value) && value.includes(fieldValue);
    case 'not_in':
      return Array.isArray(value) && !value.includes(fieldValue);
    case 'is_null':
      return fieldValue === null || fieldValue === undefined;
    case 'is_not_null':
      return fieldValue !== null && fieldValue !== undefined;
    default:
      console.warn(`Неизвестный оператор: ${operator}`);
      return false;
  }
}

/**
 * Применение маппинга полей
 */
function applyFieldMapping(
  sourceRecord: Record<string, any>,
  fieldMapping: FieldMapping,
  defaultValues: DefaultValues = {}
): { mappedData: Record<string, any>; convertedFields: string[]; skippedFields: string[] } {
  const mappedData: Record<string, any> = { ...defaultValues };
  const convertedFields: string[] = [];
  const skippedFields: string[] = [];
  
  // Применяем маппинг полей
  for (const [sourceField, targetField] of Object.entries(fieldMapping)) {
    if (sourceRecord[sourceField] !== undefined) {
      mappedData[targetField] = sourceRecord[sourceField];
      convertedFields.push(`${sourceField} → ${targetField}`);
    } else {
      skippedFields.push(sourceField);
    }
  }
  
  return { mappedData, convertedFields, skippedFields };
}

/**
 * Применение маппинга расширяемых полей
 */
function applyExtensionFieldMapping(
  sourceExtensionFields: ExtensionFieldValue,
  extensionFieldMapping: ExtensionFieldMapping,
  targetExtensionFieldDefinitions: ExtensionFieldDefinition[]
): { 
  mappedExtensionFields: ExtensionFieldValue; 
  convertedExtensionFields: string[]; 
  skippedExtensionFields: string[] 
} {
  const mappedExtensionFields: ExtensionFieldValue = {};
  const convertedExtensionFields: string[] = [];
  const skippedExtensionFields: string[] = [];
  
  // Создаем карту определений полей для быстрого поиска
  const fieldDefinitionsMap = new Map<string, ExtensionFieldDefinition>();
  targetExtensionFieldDefinitions.forEach(def => {
    fieldDefinitionsMap.set(def.field_name, def);
  });
  
  // Применяем маппинг расширяемых полей
  for (const [sourceField, targetField] of Object.entries(extensionFieldMapping)) {
    if (sourceExtensionFields[sourceField] !== undefined) {
      const targetFieldDef = fieldDefinitionsMap.get(targetField);
      if (targetFieldDef) {
        // Валидируем и преобразуем значение согласно типу целевого поля
        try {
          const validatedValue = validateAndTransformExtensionFieldValue(
            sourceExtensionFields[sourceField],
            targetFieldDef
          );
          mappedExtensionFields[targetField] = validatedValue;
          convertedExtensionFields.push(`${sourceField} → ${targetField}`);
        } catch (error) {
          console.warn(`Ошибка преобразования extension field ${sourceField} → ${targetField}:`, error);
          skippedExtensionFields.push(sourceField);
        }
      } else {
        console.warn(`Определение для целевого extension field ${targetField} не найдено`);
        skippedExtensionFields.push(sourceField);
      }
    } else {
      skippedExtensionFields.push(sourceField);
    }
  }
  
  return { mappedExtensionFields, convertedExtensionFields, skippedExtensionFields };
}

/**
 * Валидация и преобразование значения extension field
 */
function validateAndTransformExtensionFieldValue(
  value: any,
  fieldDefinition: ExtensionFieldDefinition
): any {
  const { field_type } = fieldDefinition;
  // validation поле может отсутствовать в некоторых версиях ExtensionFieldDefinition
  
  // Базовое преобразование по типу
  switch (field_type) {
    case 'text':
      return String(value);
    case 'number':
      const numValue = Number(value);
      if (isNaN(numValue)) {
        throw new Error(`Значение "${value}" не может быть преобразовано в число`);
      }
      return numValue;
    case 'boolean':
      return Boolean(value);
    case 'date':
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === 'string') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error(`Значение "${value}" не является валидной датой`);
        }
        return date.toISOString();
      }
      throw new Error(`Значение "${value}" не может быть преобразовано в дату`);
    case 'json':
      if (typeof value === 'object') {
        return value;
      }
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          throw new Error(`Значение "${value}" не является валидным JSON`);
        }
      }
      return value;
    case 'select':
    case 'multiselect':
      return value; // Возвращаем как есть для select полей
    default:
      return String(value); // По умолчанию преобразуем в строку
  }
}

/**
 * Применение шаблона имени для целевой записи
 */
function applyNameTemplate(
  template: string | undefined,
  sourceRecord: Record<string, any>,
  sourceExtensionFields: ExtensionFieldValue
): string | undefined {
  if (!template) {
    return undefined;
  }
  
  try {
    // Простая замена переменных в формате {field_name}
    let result = template;
    
    // Заменяем переменные из основных полей
    result = result.replace(/\{source\.(\w+)\}/g, (match, fieldName) => {
      return String(sourceRecord[fieldName] || match);
    });
    
    // Заменяем переменные из extension fields
    result = result.replace(/\{extension\.(\w+)\}/g, (match, fieldName) => {
      return String(sourceExtensionFields[fieldName] || match);
    });
    
    return result;
  } catch (error) {
    console.warn('Ошибка применения шаблона имени:', error);
    return undefined;
  }
}

/**
 * Основная функция выполнения конвертации сущности
 */
export async function executeEntityConversion(
  tenantId: string,
  ruleId: string,
  sourceRecordId: string,
  jwtToken?: string
): Promise<ConversionExecutionResult> {
  const startTime = Date.now();
  
  try {
    // Получаем правило конвертации
    const rule = await getConversionRuleById(ruleId);
    if (!rule) {
      throw new Error(`Правило конвертации ${ruleId} не найдено`);
    }
    
    if (!rule.is_active) {
      throw new Error(`Правило конвертации ${rule.name} неактивно`);
    }
    
    // Получаем адаптер для работы с тенантской БД
    const sourceAdapter = await getAdapterForTenant(tenantId, rule.source_entity, jwtToken);
    const targetAdapter = await getAdapterForTenant(tenantId, rule.target_entity, jwtToken);
    
    // Получаем исходную запись с extension fields
    const sourceResult = await sourceAdapter.query({
      filter: { id: sourceRecordId },
      limit: 1
    });
    const sourceRecord = Array.isArray(sourceResult) ? sourceResult[0] : sourceResult;
    if (!sourceRecord) {
      throw new Error(`Исходная запись ${sourceRecordId} не найдена в ${rule.source_entity}`);
    }
    
    // Получаем extension fields для исходной записи
    const sourceExtensionFieldDefinitions = await getFieldDefinitionsFromTenantService(
      tenantId,
      rule.source_entity
    );
    
    // Получаем extension fields для целевой сущности
    const targetExtensionFieldDefinitions = await getFieldDefinitionsFromTenantService(
      tenantId,
      rule.target_entity
    );
    
    // Парсим extension fields исходной записи
    const sourceExtensionFields = parseExtensionFieldValues(
      sourceRecord.extension_fields || {},
      sourceExtensionFieldDefinitions
    );
    
    // Проверяем условия срабатывания
    if (!checkTriggerConditions(rule.trigger_conditions, sourceRecord, sourceExtensionFields)) {
      throw new Error('Условия срабатывания правила не выполнены');
    }
    
    // Применяем маппинг основных полей
    const { mappedData, convertedFields, skippedFields } = applyFieldMapping(
      sourceRecord,
      rule.field_mapping,
      rule.default_values
    );
    
    // Применяем маппинг extension fields
    const { 
      mappedExtensionFields, 
      convertedExtensionFields, 
      skippedExtensionFields 
    } = applyExtensionFieldMapping(
      sourceExtensionFields,
      rule.extension_field_mapping,
      targetExtensionFieldDefinitions
    );
    
    // Применяем шаблон имени
    const generatedName = applyNameTemplate(
      rule.target_name_template,
      sourceRecord,
      sourceExtensionFields
    );
    
    if (generatedName) {
      mappedData.name = generatedName;
    }
    
    // Создаем целевую запись через extensible-fields функции
    // TODO: Использовать createEntityWithExtensions для создания записи с extension fields
    const targetRecordData = {
      ...mappedData,
      extension_fields: mappedExtensionFields
    };
    
    // Временно используем простое создание через адаптер
    const createResult = await targetAdapter.query({
      filter: {},
      limit: 1,
      // Передаем данные через meta для создания
      meta: { action: 'create', data: targetRecordData }
    });
    const targetRecord = Array.isArray(createResult) ? createResult[0] : createResult;
    // Устанавливаем ID если его нет
    if (!targetRecord.id) {
      targetRecord.id = `temp_${Date.now()}`;
    }
    
    const executionTime = Date.now() - startTime;
    
    // Публикуем событие успешной конвертации
    await publishConversionEvent('entity-converted', {
      tenantId,
      ruleId,
      ruleName: rule.name,
      sourceEntity: rule.source_entity,
      targetEntity: rule.target_entity,
      sourceRecordId: sourceRecordId,
      targetRecordId: targetRecord.id,
      conversionType: 'manual', // TODO: Определять тип конвертации
      performedBy: jwtToken, // TODO: Извлекать ID пользователя из токена
      fieldMappings: rule.field_mapping,
      extensionFieldMappings: rule.extension_field_mapping,
    });

    return {
      success: true,
      source_record_id: sourceRecordId,
      target_record_id: targetRecord.id, // Предполагаем, что ID возвращается
      rule_id: ruleId,
      rule_name: rule.name,
      source_entity: rule.source_entity,
      target_entity: rule.target_entity,
      warnings: [], // TODO: Добавить сбор предупреждений
      converted_fields: convertedFields,
      skipped_fields: skippedFields,
      converted_extension_fields: convertedExtensionFields,
      skipped_extension_fields: skippedExtensionFields,
      execution_time_ms: executionTime,
      created_at: new Date().toISOString(),
    };
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    return {
      success: false,
      source_record_id: sourceRecordId,
      rule_id: ruleId,
      rule_name: 'Unknown',
      source_entity: 'Unknown',
      target_entity: 'Unknown',
      error_message: error instanceof Error ? error.message : String(error),
      warnings: [],
      converted_fields: [],
      skipped_fields: [],
      converted_extension_fields: [],
      skipped_extension_fields: [],
      execution_time_ms: executionTime,
      created_at: new Date().toISOString()
    };
  }
}

/**
 * Получение доступных правил конвертации для сущности
 */
export async function getAvailableConversionRules(
  tenantId: string,
  sourceEntity: string
): Promise<EntityConversionRule[]> {
  try {
    return await getConversionRulesFromTenantService(tenantId, sourceEntity, true);
  } catch (error) {
    console.error('Ошибка получения доступных правил конвертации:', error);
    return [];
  }
}

/**
 * Проверка автоматических триггеров для записи
 * Используется при создании/обновлении записей для автоматической конвертации
 */
export async function checkAutoTriggers(
  tenantId: string,
  entityTable: string,
  recordId: string,
  jwtToken?: string
): Promise<ConversionExecutionResult[]> {
  try {
    // Получаем активные правила с включенной автоматической конвертацией
    const rules = await getConversionRulesFromTenantService(tenantId, entityTable, true);
    const autoRules = rules.filter(rule => 
      rule.conversion_settings.auto_conversion_enabled === true
    );
    
    if (autoRules.length === 0) {
      return [];
    }
    
    // Получаем запись для проверки условий
    const adapter = await getAdapterForTenant(tenantId, entityTable, jwtToken);
    const queryResult = await adapter.query({
      filter: { id: recordId },
      limit: 1
    });
    const record = Array.isArray(queryResult) ? queryResult[0] : queryResult;
    
    if (!record) {
      return [];
    }
    
    // Получаем extension fields
    const extensionFieldDefinitions = await getFieldDefinitionsFromTenantService(
      tenantId,
      entityTable
    );
    
    const extensionFields = parseExtensionFieldValues(
      record.extension_fields || {},
      extensionFieldDefinitions
    );
    
    // Проверяем каждое правило и выполняем конвертацию при срабатывании
    const results: ConversionExecutionResult[] = [];
    
    for (const rule of autoRules) {
      try {
        if (checkTriggerConditions(rule.trigger_conditions, record, extensionFields)) {
          const result = await executeEntityConversion(tenantId, rule.id, recordId, jwtToken);
          results.push(result);
        }
      } catch (error) {
        console.error(`Ошибка автоматической конвертации по правилу ${rule.name}:`, error);
        results.push({
          success: false,
          source_record_id: recordId,
          rule_id: rule.id,
          rule_name: rule.name,
          source_entity: rule.source_entity,
          target_entity: rule.target_entity,
          error_message: error instanceof Error ? error.message : String(error),
          warnings: [],
          converted_fields: [],
          skipped_fields: [],
          converted_extension_fields: [],
          skipped_extension_fields: [],
          execution_time_ms: 0,
          created_at: new Date().toISOString()
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error('Ошибка проверки автоматических триггеров:', error);
    return [];
  }
}
