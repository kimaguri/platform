import { getAdapterForTenant } from '../../../../connectors/registry/connector-registry';
import type { Adapter } from '../../../../connectors/base';
import type { ExtensionFieldDefinition } from '../../../tenant-management/src/extensible-fields';

// Import validation and error handling
import {
  validateExtensionFields,
  applyDefaultValues,
  sanitizeFieldValue,
  type ValidationResult,
  type ValidationOptions,
} from '../validation';
import {
  handleExtensibleFieldsError,
  createValidationError,
  createDatabaseError,
  convertValidationErrorsToExtensibleErrors,
  retryWithBackoff,
  type ErrorContext,
} from './error-handling';

/**
 * Extensible Fields Service для Content Management
 * Функциональный подход - только функции, без классов
 * Интегрируется с Tenant Management Service для получения метаданных
 * Работает с тенантскими БД через коннекторы для значений полей
 */

// Типы для работы с расширяемыми полями - Best Practice подходы совместимые с Encore

/**
 * Базовые поля, которые есть у всех сущностей
 */
export interface BaseEntityFields {
  id: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Значения расширяемых полей - используем interface с индексной сигнатурой (но без дополнительных полей)
 */
export interface ExtensionFieldValue {
  [fieldName: string]: unknown;
}

/**
 * Сущность с расширяемыми полями - Encore совместимый подход
 * Используем только interface без индексных сигнатур
 */
export type EntityWithExtensions = BaseEntityFields &
  Record<string, unknown> & {
    extensions: ExtensionFieldValue;
  };

/**
 * Generic тип для типизированных сущностей с расширениями
 */
export interface TypedEntityWithExtensions<T = {}> extends BaseEntityFields {
  extensions: ExtensionFieldValue;
  data: T;
}

export interface ExtensionFieldsFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'not_in';
  value: unknown;
}

export interface ExtensionFieldsSorter {
  field: string;
  order: 'asc' | 'desc';
}

// Кеш для метаданных полей (получаем от Tenant Management Service)
const fieldDefinitionsCache = new Map<
  string,
  { data: ExtensionFieldDefinition[]; timestamp: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут для метаданных от другого сервиса

/**
 * Получение метаданных полей от Tenant Management Service
 * Используется кеширование для оптимизации
 */
async function getFieldDefinitionsFromTenantService(
  tenantId: string,
  entityTable: string
): Promise<ExtensionFieldDefinition[]> {
  const cacheKey = `${tenantId}:${entityTable}`;

  // Проверяем кеш
  const cached = fieldDefinitionsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp <= CACHE_TTL) {
    return cached.data;
  }

  try {
    // TODO: Заменить на реальный RPC вызов к Tenant Management Service
    // const response = await tenantManagementClient.getFieldDefinitions({ tenantId, entityTable });

    // Возвращаем пустой массив пока нет интеграции с Tenant Management
    const definitions: ExtensionFieldDefinition[] = [];

    // Кешируем результат
    fieldDefinitionsCache.set(cacheKey, {
      data: definitions,
      timestamp: Date.now(),
    });

    return definitions;
  } catch (error) {
    console.error(
      `[ExtensibleFields] Failed to load field definitions from Tenant Management Service:`,
      error
    );
    return [];
  }
}

/**
 * Получение адаптера для работы с тенантской БД
 */
async function getTenantAdapter(tenantId: string, entityTable: string, jwtToken?: string): Promise<Adapter> {
  return getAdapterForTenant(tenantId, entityTable, jwtToken);
}

/**
 * Санитизация входных данных
 */
function sanitizeInputValues(
  rawValues: Record<string, any>,
  fieldDefinitions: ExtensionFieldDefinition[]
): Record<string, any> {
  const sanitized: Record<string, any> = {};

  // Создаем карту определений полей
  const definitionsMap = new Map(fieldDefinitions.map((def) => [def.field_name, def]));

  for (const [fieldName, fieldValue] of Object.entries(rawValues)) {
    const definition = definitionsMap.get(fieldName);

    if (definition) {
      // Санитизируем значение согласно типу поля
      sanitized[fieldName] = sanitizeFieldValue(fieldValue, definition.field_type);
    } else {
      // Для неопределенных полей применяем базовую санитизацию
      sanitized[fieldName] = fieldValue;
    }
  }

  return sanitized;
}

/**
 * Нормализация полей сущности - преобразование null значений в пустые строки
 */
function normalizeEntityFields(entity: any): any {
  const normalized = { ...entity };

  // Преобразуем все null и undefined значения в пустые строки
  Object.keys(normalized).forEach((key) => {
    if (normalized[key] === null || normalized[key] === undefined) {
      normalized[key] = '';
    }
  });

  return normalized;
}

/**
 * Попытка восстановления после ошибок валидации
 */
function attemptValidationRecovery(
  values: Record<string, any>,
  validationResult: ValidationResult,
  fieldDefinitions: ExtensionFieldDefinition[]
): ExtensionFieldValue | null {
  const recovered: ExtensionFieldValue = { ...values };
  let hasRecovered = false;

  // Создаем карту определений полей
  const definitionsMap = new Map(fieldDefinitions.map((def) => [def.field_name, def]));

  for (const error of validationResult.errors) {
    const definition = definitionsMap.get(error.field);

    if (!definition) continue;

    // Пытаемся применить значение по умолчанию
    if (definition.default_value !== undefined) {
      recovered[error.field] = definition.default_value;
      hasRecovered = true;
      continue;
    }

    // Для необязательных полей удаляем некорректное значение
    if (!definition.is_required) {
      delete recovered[error.field];
      hasRecovered = true;
      continue;
    }

    // Если поле обязательное и нет значения по умолчанию, не можем восстановиться
    return null;
  }

  return hasRecovered ? recovered : null;
}

/**
 * Парсинг и валидация значений расширяемых полей
 * Интегрированная система валидации с обработкой ошибок
 */
export function parseExtensionFieldValues(
  customFieldsValues: Record<string, any>,
  fieldDefinitionsMetadata: ExtensionFieldDefinition[],
  options: ValidationOptions = {}
): ExtensionFieldValue {
  try {
    // Санитизация входных данных
    const sanitizedValues = sanitizeInputValues(customFieldsValues, fieldDefinitionsMetadata);

    // Применение значений по умолчанию
    const valuesWithDefaults = applyDefaultValues(sanitizedValues, fieldDefinitionsMetadata);

    // Комплексная валидация
    const validationResult = validateExtensionFields(
      valuesWithDefaults,
      fieldDefinitionsMetadata,
      options
    );

    // Если есть ошибки валидации, обрабатываем их
    if (!validationResult.isValid) {
      const context: ErrorContext = {
        metadata: { fieldDefinitionsMetadata, customFieldsValues },
      };

      const extensibleErrors = convertValidationErrorsToExtensibleErrors(
        validationResult.errors,
        context
      );

      // Пытаемся восстановиться от ошибок валидации
      const recoveredValues = attemptValidationRecovery(
        valuesWithDefaults,
        validationResult,
        fieldDefinitionsMetadata
      );

      if (recoveredValues) {
        // Логируем предупреждения о восстановлении
        validationResult.warnings.forEach((warning) => {
          console.warn(`[ExtensibleFields] Validation warning: ${warning.message}`);
        });

        return recoveredValues;
      }

      // Если не удалось восстановиться, выбрасываем ошибку
      throw createValidationError(
        `Validation failed: ${validationResult.errors.map((e) => e.message).join(', ')}`,
        validationResult.errors[0]?.field || 'unknown',
        context
      );
    }

    return valuesWithDefaults;
  } catch (error) {
    const context: ErrorContext = {
      metadata: { fieldDefinitionsMetadata, customFieldsValues, options },
    };

    const handlingResult = handleExtensibleFieldsError(
      error instanceof Error ? error : new Error(String(error)),
      context
    );

    if (handlingResult.recovered && handlingResult.fallbackValue !== undefined) {
      return handlingResult.fallbackValue;
    }

    throw error;
  }
}

/**
 * Парсинг значения поля по типу
 */
function parseFieldValue(value: any, fieldType: string): any {
  switch (fieldType) {
    case 'text':
      return String(value);

    case 'number':
      const num = Number(value);
      if (isNaN(num)) {
        throw new Error(`Cannot convert '${value}' to number`);
      }
      return num;

    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        if (lower === 'true' || lower === '1') return true;
        if (lower === 'false' || lower === '0') return false;
      }
      throw new Error(`Cannot convert '${value}' to boolean`);

    case 'date':
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error(`Cannot convert '${value}' to date`);
      }
      return date.toISOString();

    case 'json':
      if (typeof value === 'object') return value;
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          throw new Error(`Cannot parse '${value}' as JSON`);
        }
      }
      throw new Error(`Cannot convert '${value}' to JSON`);

    case 'select':
      return String(value);

    default:
      return value;
  }
}

/**
 * Валидация значения поля по правилам
 */
function validateFieldValue(value: any, rules: Record<string, any>, fieldName: string): void {
  if (rules.min !== undefined && value < rules.min) {
    throw new Error(`Value for '${fieldName}' must be at least ${rules.min}`);
  }

  if (rules.max !== undefined && value > rules.max) {
    throw new Error(`Value for '${fieldName}' must be at most ${rules.max}`);
  }

  if (rules.minLength !== undefined && String(value).length < rules.minLength) {
    throw new Error(`Value for '${fieldName}' must be at least ${rules.minLength} characters`);
  }

  if (rules.maxLength !== undefined && String(value).length > rules.maxLength) {
    throw new Error(`Value for '${fieldName}' must be at most ${rules.maxLength} characters`);
  }

  if (rules.pattern !== undefined && !new RegExp(rules.pattern).test(String(value))) {
    throw new Error(`Value for '${fieldName}' does not match required pattern`);
  }

  if (
    rules.options !== undefined &&
    Array.isArray(rules.options) &&
    !rules.options.includes(value)
  ) {
    throw new Error(`Value for '${fieldName}' must be one of: ${rules.options.join(', ')}`);
  }
}

/**
 * Получение сущности с расширяемыми полями
 */
export async function getEntityWithExtensions(
  tenantId: string,
  entityTable: string,
  recordId: string
): Promise<EntityWithExtensions | null> {
  // Получаем метаданные полей от Tenant Management Service
  const fieldDefinitionsMetadata = await getFieldDefinitionsFromTenantService(
    tenantId,
    entityTable
  );

  // Получаем адаптер для работы с тенантской БД
  const adapter = await getTenantAdapter(tenantId, entityTable);

  // Получаем базовую сущность
  const baseRecordData = await adapter.queryOne(recordId);
  if (!baseRecordData) {
    return null;
  }

  // Извлекаем расширяемые поля из JSONB
  const customFieldsValues = baseRecordData.custom_fields || {};

  // TODO: Добавить поддержку extension_table_values для холодных полей
  // const coldFields = await getColdFields(tenantId, entityTable, entityId);
  // const allExtensionFields = { ...customFields, ...coldFields };

  // Парсируем и валидируем поля
  const extensions = parseExtensionFieldValues(customFieldsValues, fieldDefinitionsMetadata);

  return {
    ...baseRecordData,
    extensions,
  };
}

/**
 * Получение списка сущностей с расширяемыми полями
 */
export async function getEntitiesWithExtensions(
  tenantId: string,
  entityTable: string,
  options: {
    limit?: number;
    offset?: number;
    filters?: ExtensionFieldsFilter[];
    sorters?: ExtensionFieldsSorter[];
    meta?: {
      select?: string;
      [key: string]: any;
    };
  } = {}
): Promise<{ data: EntityWithExtensions[]; total: number }> {
  const { limit = 50, offset = 0, filters = [], sorters = [], meta } = options;

  // Получаем метаданные полей от Tenant Management Service
  const fieldDefinitions = await getFieldDefinitionsFromTenantService(tenantId, entityTable);

  // Получаем адаптер для работы с тенантской БД
  const adapter = await getTenantAdapter(tenantId, entityTable);

  // Строим запрос с фильтрацией и сортировкой
  const query = buildExtensibleFieldsQuery(filters, sorters, fieldDefinitions);

  // Отладочная информация
  console.log('[DEBUG] Input filters:', JSON.stringify(filters, null, 2));
  console.log('[DEBUG] Built query.where:', JSON.stringify(query.where, null, 2));
  console.log('[DEBUG] Built query.orderBy:', JSON.stringify(query.orderBy, null, 2));

  // Выполняем запрос используя правильные методы адаптера
  const entities = await adapter.query({
    filter: query.where,
    orderBy: query.orderBy.map((order) => {
      const field = Object.keys(order)[0];
      const direction = Object.values(order)[0] as 'asc' | 'desc';
      return { field: field || 'id', direction };
    }),
    limit,
    offset,
    meta,
  });

  console.log('[DEBUG] Query result count:', entities.length);

  // Получаем общее количество записей
  const total = await adapter.count(query.where);

  // Обрабатываем результаты
  const entitiesWithExtensions = entities.map((entity: any) => {
    // Временное логирование для отладки
    console.log('[DEBUG] Raw entity from DB:', JSON.stringify(entity, null, 2));
    
    const customFields = entity.custom_fields || {};
    const extensions = parseExtensionFieldValues(customFields, fieldDefinitions);

    // Нормализуем базовые поля - преобразуем null в строки для строковых полей
    const normalizedEntity = normalizeEntityFields(entity);
    
    console.log('[DEBUG] Normalized entity:', JSON.stringify(normalizedEntity, null, 2));
    console.log('[DEBUG] Extensions:', JSON.stringify(extensions, null, 2));

    // Возвращаем всю нормализованную сущность с extensions
    // Это гарантирует, что все динамические поля попадут в toPayload
    const result = {
      ...normalizedEntity,
      extensions,
    };
    
    console.log('[DEBUG] Final result:', JSON.stringify(result, null, 2));
    return result;
  });

  return {
    data: entitiesWithExtensions,
    total,
  };
}

/**
 * Создание сущности с расширяемыми полями
 */
export async function createEntityWithExtensions(
  tenantId: string,
  entityTable: string,
  entityData: Record<string, any>,
  extensionFields: ExtensionFieldValue,
  jwtToken?: string
): Promise<EntityWithExtensions> {
  console.log('[ExtensibleFields] createEntityWithExtensions called with:', {
    tenantId,
    entityTable,
    hasJwtToken: !!jwtToken,
    entityDataKeys: Object.keys(entityData),
    extensionFieldsKeys: Object.keys(extensionFields)
  });

  // Получаем метаданные полей от Tenant Management Service
  const fieldDefinitions = await getFieldDefinitionsFromTenantService(tenantId, entityTable);

  // Парсируем и валидируем расширяемые поля
  const validatedExtensions = parseExtensionFieldValues(extensionFields, fieldDefinitions);

  // Получаем адаптер для работы с тенантской БД
  console.log('[ExtensibleFields] Getting adapter with JWT token:', !!jwtToken);
  const adapter = await getTenantAdapter(tenantId, entityTable, jwtToken);

  // Создаем сущность с расширяемыми полями в JSONB
  const insertData = {
    ...entityData,
    custom_fields: validatedExtensions,
  };
  
  console.log('[ExtensibleFields] About to call adapter.insert with:', {
    insertData,
    adapterType: typeof adapter,
    adapterMethods: Object.keys(adapter)
  });
  
  const newEntity = await adapter.insert(insertData);

  return {
    ...newEntity,
    extensions: validatedExtensions,
  };
}

/**
 * Обновление сущности с расширяемыми полями
 */
export async function updateEntityWithExtensions(
  tenantId: string,
  entityTable: string,
  entityId: string,
  entityData: Record<string, any>,
  extensionFields?: ExtensionFieldValue
): Promise<EntityWithExtensions | null> {
  // Получаем метаданные полей от Tenant Management Service
  const fieldDefinitions = await getFieldDefinitionsFromTenantService(tenantId, entityTable);

  // Получаем адаптер для работы с тенантской БД
  const adapter = await getTenantAdapter(tenantId, entityTable);

  // Подготавливаем данные для обновления
  const updateData: Record<string, any> = { ...entityData };

  if (extensionFields) {
    // Парсируем и валидируем расширяемые поля
    const validatedExtensions = parseExtensionFieldValues(extensionFields, fieldDefinitions);
    updateData.custom_fields = validatedExtensions;
  }

  // Обновляем сущность
  const updatedEntity = await adapter.update(entityId, updateData);
  if (!updatedEntity) {
    return null;
  }

  // Возвращаем с расширяемыми полями
  const customFields = updatedEntity.custom_fields || {};
  const extensions = parseExtensionFieldValues(customFields, fieldDefinitions);

  return {
    ...updatedEntity,
    extensions,
  };
}

/**
 * Построение запроса с фильтрацией и сортировкой по расширяемым полям
 */
function buildExtensibleFieldsQuery(
  filters: ExtensionFieldsFilter[],
  sorters: ExtensionFieldsSorter[],
  fieldDefinitions: ExtensionFieldDefinition[]
): { where: Record<string, any>; orderBy: Record<string, any>[] } {
  const where: Record<string, any> = {};
  const orderBy: Record<string, any>[] = [];

  // Создаем карту определений полей для быстрого поиска
  const definitionsMap = new Map(fieldDefinitions.map((def) => [def.field_name, def]));

  // Обрабатываем фильтры
  filters.forEach((filter) => {
    if (filter.field.startsWith('extensions.')) {
      const fieldName = filter.field.substring('extensions.'.length);
      const definition = definitionsMap.get(fieldName);

      if (definition && definition.is_filterable) {
        // Фильтрация по JSONB полю
        const jsonbPath = `custom_fields.${fieldName}`;
        where[jsonbPath] = buildFilterCondition(filter.operator, filter.value);
      }
    } else {
      // Обычная фильтрация по базовым полям
      where[filter.field] = buildFilterCondition(filter.operator, filter.value);
    }
  });

  // Обрабатываем сортировку
  sorters.forEach((sorter) => {
    if (sorter.field.startsWith('extensions.')) {
      const fieldName = sorter.field.substring('extensions.'.length);
      const definition = definitionsMap.get(fieldName);

      if (definition && definition.is_sortable) {
        // Сортировка по JSONB полю
        orderBy.push({
          [`custom_fields.${fieldName}`]: sorter.order,
        });
      }
    } else {
      // Обычная сортировка по базовым полям
      orderBy.push({
        [sorter.field]: sorter.order,
      });
    }
  });

  return { where, orderBy };
}

/**
 * Построение условия фильтрации
 */
function buildFilterCondition(operator: string, value: any): any {
  switch (operator) {
    case 'eq':
      return { equals: value };
    case 'ne':
      return { not: value };
    case 'gt':
      return { gt: value };
    case 'gte':
      return { gte: value };
    case 'lt':
      return { lt: value };
    case 'lte':
      return { lte: value };
    case 'like':
      return { contains: value };
    case 'in':
      return { in: Array.isArray(value) ? value : [value] };
    case 'not_in':
      return { notIn: Array.isArray(value) ? value : [value] };
    default:
      return { equals: value };
  }
}

/**
 * Инвалидация кеша метаданных
 */
export function invalidateFieldDefinitionsCache(tenantId?: string, entityTable?: string): void {
  if (tenantId && entityTable) {
    fieldDefinitionsCache.delete(`${tenantId}:${entityTable}`);
  } else if (tenantId) {
    // Удаляем все записи для тенанта
    const keysToDelete = Array.from(fieldDefinitionsCache.keys()).filter((key) =>
      key.startsWith(`${tenantId}:`)
    );
    keysToDelete.forEach((key) => fieldDefinitionsCache.delete(key));
  } else {
    fieldDefinitionsCache.clear();
  }
}

/**
 * Получение статистики кеша
 */
export function getFieldDefinitionsCacheStats(): { size: number; entries: string[] } {
  return {
    size: fieldDefinitionsCache.size,
    entries: Array.from(fieldDefinitionsCache.keys()),
  };
}
