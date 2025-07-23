import type { ExtensionFieldDefinition } from '../../tenant-management/src/extensible-fields';

/**
 * Comprehensive Validation System for Extensible Fields
 * Функциональный подход - только функции, без классов
 * Комплексная система валидации и обработки ошибок
 */

// Типы для системы валидации
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  code: ValidationErrorCode;
  message: string;
  value?: any;
  context?: Record<string, any>;
}

export interface ValidationWarning {
  field: string;
  code: ValidationWarningCode;
  message: string;
  value?: any;
  context?: Record<string, any>;
}

export enum ValidationErrorCode {
  REQUIRED_FIELD_MISSING = 'REQUIRED_FIELD_MISSING',
  INVALID_TYPE = 'INVALID_TYPE',
  VALUE_TOO_SHORT = 'VALUE_TOO_SHORT',
  VALUE_TOO_LONG = 'VALUE_TOO_LONG',
  VALUE_TOO_SMALL = 'VALUE_TOO_SMALL',
  VALUE_TOO_LARGE = 'VALUE_TOO_LARGE',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_OPTION = 'INVALID_OPTION',
  INVALID_JSON = 'INVALID_JSON',
  INVALID_DATE = 'INVALID_DATE',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_URL = 'INVALID_URL',
  INVALID_PHONE = 'INVALID_PHONE',
  FIELD_NOT_DEFINED = 'FIELD_NOT_DEFINED',
  FIELD_NOT_ACTIVE = 'FIELD_NOT_ACTIVE',
  FIELD_NOT_EDITABLE = 'FIELD_NOT_EDITABLE',
  CIRCULAR_DEPENDENCY = 'CIRCULAR_DEPENDENCY',
  CUSTOM_VALIDATION_FAILED = 'CUSTOM_VALIDATION_FAILED',
}

export enum ValidationWarningCode {
  DEPRECATED_FIELD = 'DEPRECATED_FIELD',
  VALUE_TRUNCATED = 'VALUE_TRUNCATED',
  DEFAULT_VALUE_APPLIED = 'DEFAULT_VALUE_APPLIED',
  TYPE_COERCION = 'TYPE_COERCION',
  PERFORMANCE_WARNING = 'PERFORMANCE_WARNING',
}

// Константы для валидации
export const VALIDATION_LIMITS = {
  MAX_STRING_LENGTH: 10000,
  MAX_TEXT_LENGTH: 100000,
  MAX_JSON_DEPTH: 10,
  MAX_ARRAY_LENGTH: 1000,
  MIN_NUMBER: -Number.MAX_SAFE_INTEGER,
  MAX_NUMBER: Number.MAX_SAFE_INTEGER,
  MAX_FIELDS_PER_ENTITY: 100,
} as const;

// Регулярные выражения для валидации
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /^https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?$/,
  PHONE: /^[\+]?[1-9][\d]{0,15}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  COLOR_HEX: /^#(?:[0-9a-fA-F]{3}){1,2}$/,
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
} as const;

/**
 * Основная функция валидации расширяемых полей
 */
export function validateExtensionFields(
  fieldValues: Record<string, any>,
  fieldDefinitions: ExtensionFieldDefinition[],
  options: ValidationOptions = {}
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const {
    strictMode = false,
    allowUnknownFields = false,
    skipInactiveFields = true,
    enableWarnings = true,
  } = options;

  // Проверяем лимиты
  if (Object.keys(fieldValues).length > VALIDATION_LIMITS.MAX_FIELDS_PER_ENTITY) {
    errors.push({
      field: '_global',
      code: ValidationErrorCode.VALUE_TOO_LARGE,
      message: `Too many fields. Maximum allowed: ${VALIDATION_LIMITS.MAX_FIELDS_PER_ENTITY}`,
      value: Object.keys(fieldValues).length,
    });
  }

  // Создаем карту определений полей для быстрого доступа
  const definitionsMap = new Map(fieldDefinitions.map((def) => [def.field_name, def]));

  // Проверяем каждое поле в данных
  for (const [fieldName, fieldValue] of Object.entries(fieldValues)) {
    const definition = definitionsMap.get(fieldName);

    // Проверка существования определения поля
    if (!definition) {
      if (!allowUnknownFields) {
        errors.push({
          field: fieldName,
          code: ValidationErrorCode.FIELD_NOT_DEFINED,
          message: `Field '${fieldName}' is not defined in field definitions`,
          value: fieldValue,
        });
      }
      continue;
    }

    // Проверка активности поля
    if (!definition.is_active && skipInactiveFields) {
      if (enableWarnings) {
        warnings.push({
          field: fieldName,
          code: ValidationWarningCode.DEPRECATED_FIELD,
          message: `Field '${fieldName}' is inactive and will be ignored`,
          value: fieldValue,
        });
      }
      continue;
    }

    // Валидация конкретного поля
    const fieldValidation = validateSingleField(fieldValue, definition, {
      strictMode,
      enableWarnings,
    });
    errors.push(...fieldValidation.errors);
    warnings.push(...fieldValidation.warnings);
  }

  // Проверяем обязательные поля
  for (const definition of fieldDefinitions) {
    if (definition.is_required && definition.is_active) {
      const fieldValue = fieldValues[definition.field_name];

      if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
        // Проверяем, есть ли значение по умолчанию
        if (definition.default_value !== undefined && definition.default_value !== null) {
          if (enableWarnings) {
            warnings.push({
              field: definition.field_name,
              code: ValidationWarningCode.DEFAULT_VALUE_APPLIED,
              message: `Required field '${definition.field_name}' is missing, default value will be applied`,
              value: definition.default_value,
            });
          }
        } else {
          errors.push({
            field: definition.field_name,
            code: ValidationErrorCode.REQUIRED_FIELD_MISSING,
            message: `Required field '${definition.field_name}' is missing`,
          });
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Валидация одного поля
 */
export function validateSingleField(
  value: any,
  definition: ExtensionFieldDefinition,
  options: Partial<ValidationOptions> = {}
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const { strictMode = false, enableWarnings = true } = options;

  const { field_name, field_type, validation_rules = {} } = definition;

  // Пропускаем валидацию для null/undefined значений (они обрабатываются отдельно)
  if (value === null || value === undefined) {
    return { isValid: true, errors: [], warnings: [] };
  }

  // Валидация по типу поля
  const typeValidation = validateFieldType(value, field_type, field_name, {
    strictMode,
    enableWarnings,
  });
  errors.push(...typeValidation.errors);
  warnings.push(...typeValidation.warnings);

  // Если есть ошибки типа и включен строгий режим, прекращаем дальнейшую валидацию
  if (strictMode && typeValidation.errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  // Валидация по правилам
  const rulesValidation = validateFieldRules(value, validation_rules, field_name, field_type);
  errors.push(...rulesValidation.errors);
  warnings.push(...rulesValidation.warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Валидация типа поля
 */
export function validateFieldType(
  value: any,
  fieldType: string,
  fieldName: string,
  options: { strictMode?: boolean; enableWarnings?: boolean } = {}
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const { strictMode = false, enableWarnings = true } = options;

  switch (fieldType) {
    case 'text':
      if (typeof value !== 'string') {
        if (strictMode) {
          errors.push({
            field: fieldName,
            code: ValidationErrorCode.INVALID_TYPE,
            message: `Field '${fieldName}' must be a string, got ${typeof value}`,
            value,
          });
        } else {
          // Попытка приведения типа
          try {
            const coercedValue = String(value);
            if (enableWarnings) {
              warnings.push({
                field: fieldName,
                code: ValidationWarningCode.TYPE_COERCION,
                message: `Field '${fieldName}' was coerced from ${typeof value} to string`,
                value: coercedValue,
              });
            }
          } catch {
            errors.push({
              field: fieldName,
              code: ValidationErrorCode.INVALID_TYPE,
              message: `Field '${fieldName}' cannot be converted to string`,
              value,
            });
          }
        }
      }
      break;

    case 'number':
      if (typeof value !== 'number') {
        if (strictMode) {
          errors.push({
            field: fieldName,
            code: ValidationErrorCode.INVALID_TYPE,
            message: `Field '${fieldName}' must be a number, got ${typeof value}`,
            value,
          });
        } else {
          // Попытка приведения типа
          const coercedValue = Number(value);
          if (isNaN(coercedValue)) {
            errors.push({
              field: fieldName,
              code: ValidationErrorCode.INVALID_TYPE,
              message: `Field '${fieldName}' cannot be converted to number`,
              value,
            });
          } else if (enableWarnings) {
            warnings.push({
              field: fieldName,
              code: ValidationWarningCode.TYPE_COERCION,
              message: `Field '${fieldName}' was coerced from ${typeof value} to number`,
              value: coercedValue,
            });
          }
        }
      } else {
        // Проверка на специальные числовые значения
        if (!isFinite(value)) {
          errors.push({
            field: fieldName,
            code: ValidationErrorCode.INVALID_TYPE,
            message: `Field '${fieldName}' must be a finite number`,
            value,
          });
        }
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        if (strictMode) {
          errors.push({
            field: fieldName,
            code: ValidationErrorCode.INVALID_TYPE,
            message: `Field '${fieldName}' must be a boolean, got ${typeof value}`,
            value,
          });
        } else {
          // Попытка приведения типа для boolean
          if (typeof value === 'string') {
            const lower = value.toLowerCase();
            if (!['true', 'false', '1', '0', 'yes', 'no'].includes(lower)) {
              errors.push({
                field: fieldName,
                code: ValidationErrorCode.INVALID_TYPE,
                message: `Field '${fieldName}' cannot be converted to boolean`,
                value,
              });
            } else if (enableWarnings) {
              warnings.push({
                field: fieldName,
                code: ValidationWarningCode.TYPE_COERCION,
                message: `Field '${fieldName}' was coerced from string to boolean`,
                value: ['true', '1', 'yes'].includes(lower),
              });
            }
          } else {
            errors.push({
              field: fieldName,
              code: ValidationErrorCode.INVALID_TYPE,
              message: `Field '${fieldName}' cannot be converted to boolean`,
              value,
            });
          }
        }
      }
      break;

    case 'date':
      if (!(value instanceof Date)) {
        if (typeof value === 'string' || typeof value === 'number') {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            errors.push({
              field: fieldName,
              code: ValidationErrorCode.INVALID_DATE,
              message: `Field '${fieldName}' is not a valid date`,
              value,
            });
          } else if (enableWarnings && !strictMode) {
            warnings.push({
              field: fieldName,
              code: ValidationWarningCode.TYPE_COERCION,
              message: `Field '${fieldName}' was coerced to date`,
              value: date.toISOString(),
            });
          }
        } else {
          errors.push({
            field: fieldName,
            code: ValidationErrorCode.INVALID_TYPE,
            message: `Field '${fieldName}' must be a valid date`,
            value,
          });
        }
      }
      break;

    case 'json':
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          // Проверка глубины JSON
          const depth = getObjectDepth(parsed);
          if (depth > VALIDATION_LIMITS.MAX_JSON_DEPTH) {
            errors.push({
              field: fieldName,
              code: ValidationErrorCode.INVALID_JSON,
              message: `Field '${fieldName}' JSON is too deep (max depth: ${VALIDATION_LIMITS.MAX_JSON_DEPTH})`,
              value,
            });
          }
        } catch {
          errors.push({
            field: fieldName,
            code: ValidationErrorCode.INVALID_JSON,
            message: `Field '${fieldName}' is not valid JSON`,
            value,
          });
        }
      } else if (typeof value === 'object') {
        // Проверяем глубину объекта
        const depth = getObjectDepth(value);
        if (depth > VALIDATION_LIMITS.MAX_JSON_DEPTH) {
          errors.push({
            field: fieldName,
            code: ValidationErrorCode.INVALID_JSON,
            message: `Field '${fieldName}' object is too deep (max depth: ${VALIDATION_LIMITS.MAX_JSON_DEPTH})`,
            value,
          });
        }
      }
      break;

    case 'select':
      if (typeof value !== 'string') {
        if (strictMode) {
          errors.push({
            field: fieldName,
            code: ValidationErrorCode.INVALID_TYPE,
            message: `Field '${fieldName}' must be a string for select type, got ${typeof value}`,
            value,
          });
        } else {
          // Приведение к строке для select
          try {
            const coercedValue = String(value);
            if (enableWarnings) {
              warnings.push({
                field: fieldName,
                code: ValidationWarningCode.TYPE_COERCION,
                message: `Field '${fieldName}' was coerced to string for select`,
                value: coercedValue,
              });
            }
          } catch {
            errors.push({
              field: fieldName,
              code: ValidationErrorCode.INVALID_TYPE,
              message: `Field '${fieldName}' cannot be converted to string`,
              value,
            });
          }
        }
      }
      break;

    default:
      errors.push({
        field: fieldName,
        code: ValidationErrorCode.INVALID_TYPE,
        message: `Unknown field type '${fieldType}' for field '${fieldName}'`,
        value,
      });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Валидация по правилам поля
 */
export function validateFieldRules(
  value: any,
  rules: Record<string, any>,
  fieldName: string,
  fieldType: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Валидация минимальной длины
  if (rules.minLength !== undefined) {
    const length = String(value).length;
    if (length < rules.minLength) {
      errors.push({
        field: fieldName,
        code: ValidationErrorCode.VALUE_TOO_SHORT,
        message: `Field '${fieldName}' must be at least ${rules.minLength} characters long`,
        value,
        context: { minLength: rules.minLength, actualLength: length },
      });
    }
  }

  // Валидация максимальной длины
  if (rules.maxLength !== undefined) {
    const length = String(value).length;
    if (length > rules.maxLength) {
      errors.push({
        field: fieldName,
        code: ValidationErrorCode.VALUE_TOO_LONG,
        message: `Field '${fieldName}' must be at most ${rules.maxLength} characters long`,
        value,
        context: { maxLength: rules.maxLength, actualLength: length },
      });
    }
  }

  // Валидация минимального значения (для чисел)
  if (rules.min !== undefined && fieldType === 'number') {
    const numValue = Number(value);
    if (numValue < rules.min) {
      errors.push({
        field: fieldName,
        code: ValidationErrorCode.VALUE_TOO_SMALL,
        message: `Field '${fieldName}' must be at least ${rules.min}`,
        value,
        context: { min: rules.min },
      });
    }
  }

  // Валидация максимального значения (для чисел)
  if (rules.max !== undefined && fieldType === 'number') {
    const numValue = Number(value);
    if (numValue > rules.max) {
      errors.push({
        field: fieldName,
        code: ValidationErrorCode.VALUE_TOO_LARGE,
        message: `Field '${fieldName}' must be at most ${rules.max}`,
        value,
        context: { max: rules.max },
      });
    }
  }

  // Валидация паттерна
  if (rules.pattern !== undefined) {
    const pattern = new RegExp(rules.pattern);
    if (!pattern.test(String(value))) {
      errors.push({
        field: fieldName,
        code: ValidationErrorCode.INVALID_FORMAT,
        message: `Field '${fieldName}' does not match required pattern`,
        value,
        context: { pattern: rules.pattern },
      });
    }
  }

  // Валидация опций (для select)
  if (rules.options !== undefined && Array.isArray(rules.options)) {
    if (!rules.options.includes(value)) {
      errors.push({
        field: fieldName,
        code: ValidationErrorCode.INVALID_OPTION,
        message: `Field '${fieldName}' must be one of: ${rules.options.join(', ')}`,
        value,
        context: { options: rules.options },
      });
    }
  }

  // Специальные валидации по типу
  if (rules.format) {
    const formatValidation = validateSpecialFormat(value, rules.format, fieldName);
    errors.push(...formatValidation.errors);
    warnings.push(...formatValidation.warnings);
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Валидация специальных форматов
 */
export function validateSpecialFormat(
  value: any,
  format: string,
  fieldName: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const stringValue = String(value);

  switch (format) {
    case 'email':
      if (!VALIDATION_PATTERNS.EMAIL.test(stringValue)) {
        errors.push({
          field: fieldName,
          code: ValidationErrorCode.INVALID_EMAIL,
          message: `Field '${fieldName}' must be a valid email address`,
          value,
        });
      }
      break;

    case 'url':
      if (!VALIDATION_PATTERNS.URL.test(stringValue)) {
        errors.push({
          field: fieldName,
          code: ValidationErrorCode.INVALID_URL,
          message: `Field '${fieldName}' must be a valid URL`,
          value,
        });
      }
      break;

    case 'phone':
      if (!VALIDATION_PATTERNS.PHONE.test(stringValue)) {
        errors.push({
          field: fieldName,
          code: ValidationErrorCode.INVALID_PHONE,
          message: `Field '${fieldName}' must be a valid phone number`,
          value,
        });
      }
      break;

    case 'uuid':
      if (!VALIDATION_PATTERNS.UUID.test(stringValue)) {
        errors.push({
          field: fieldName,
          code: ValidationErrorCode.INVALID_FORMAT,
          message: `Field '${fieldName}' must be a valid UUID`,
          value,
        });
      }
      break;

    case 'slug':
      if (!VALIDATION_PATTERNS.SLUG.test(stringValue)) {
        errors.push({
          field: fieldName,
          code: ValidationErrorCode.INVALID_FORMAT,
          message: `Field '${fieldName}' must be a valid slug (lowercase letters, numbers, hyphens)`,
          value,
        });
      }
      break;

    case 'color':
      if (!VALIDATION_PATTERNS.COLOR_HEX.test(stringValue)) {
        errors.push({
          field: fieldName,
          code: ValidationErrorCode.INVALID_FORMAT,
          message: `Field '${fieldName}' must be a valid hex color`,
          value,
        });
      }
      break;

    case 'ipv4':
      if (!VALIDATION_PATTERNS.IPV4.test(stringValue)) {
        errors.push({
          field: fieldName,
          code: ValidationErrorCode.INVALID_FORMAT,
          message: `Field '${fieldName}' must be a valid IPv4 address`,
          value,
        });
      }
      break;

    default:
      warnings.push({
        field: fieldName,
        code: ValidationWarningCode.DEPRECATED_FIELD,
        message: `Unknown format '${format}' for field '${fieldName}'`,
        value,
      });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Применение значений по умолчанию
 */
export function applyDefaultValues(
  fieldValues: Record<string, any>,
  fieldDefinitions: ExtensionFieldDefinition[]
): Record<string, any> {
  const result = { ...fieldValues };

  for (const definition of fieldDefinitions) {
    if (definition.is_active && definition.default_value !== undefined) {
      const fieldValue = result[definition.field_name];

      if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
        result[definition.field_name] = parseDefaultValue(
          definition.default_value,
          definition.field_type
        );
      }
    }
  }

  return result;
}

/**
 * Парсинг значения по умолчанию
 */
function parseDefaultValue(defaultValue: any, fieldType: string): any {
  if (defaultValue === null || defaultValue === undefined) {
    return null;
  }

  switch (fieldType) {
    case 'text':
    case 'select':
      return String(defaultValue);

    case 'number':
      return Number(defaultValue);

    case 'boolean':
      if (typeof defaultValue === 'boolean') return defaultValue;
      if (typeof defaultValue === 'string') {
        const lower = defaultValue.toLowerCase();
        return ['true', '1', 'yes'].includes(lower);
      }
      return Boolean(defaultValue);

    case 'date':
      return new Date(defaultValue).toISOString();

    case 'json':
      if (typeof defaultValue === 'string') {
        try {
          return JSON.parse(defaultValue);
        } catch {
          return defaultValue;
        }
      }
      return defaultValue;

    default:
      return defaultValue;
  }
}

/**
 * Вспомогательные функции
 */

export interface ValidationOptions {
  strictMode?: boolean;
  allowUnknownFields?: boolean;
  skipInactiveFields?: boolean;
  enableWarnings?: boolean;
}

/**
 * Получение глубины объекта
 */
function getObjectDepth(obj: any, depth = 0): number {
  if (depth > VALIDATION_LIMITS.MAX_JSON_DEPTH) {
    return depth;
  }

  if (obj === null || typeof obj !== 'object') {
    return depth;
  }

  if (Array.isArray(obj)) {
    return Math.max(depth, ...obj.map((item) => getObjectDepth(item, depth + 1)));
  }

  const depths = Object.values(obj).map((value) => getObjectDepth(value, depth + 1));
  return depths.length > 0 ? Math.max(depth, ...depths) : depth;
}

/**
 * Форматирование ошибок валидации для пользователя
 */
export function formatValidationErrors(errors: ValidationError[]): string[] {
  return errors.map((error) => {
    switch (error.code) {
      case ValidationErrorCode.REQUIRED_FIELD_MISSING:
        return `${error.field}: This field is required`;

      case ValidationErrorCode.INVALID_TYPE:
        return `${error.field}: ${error.message}`;

      case ValidationErrorCode.VALUE_TOO_SHORT:
        return `${error.field}: Must be at least ${error.context?.minLength} characters`;

      case ValidationErrorCode.VALUE_TOO_LONG:
        return `${error.field}: Must be at most ${error.context?.maxLength} characters`;

      case ValidationErrorCode.INVALID_EMAIL:
        return `${error.field}: Must be a valid email address`;

      case ValidationErrorCode.INVALID_URL:
        return `${error.field}: Must be a valid URL`;

      case ValidationErrorCode.INVALID_OPTION:
        return `${error.field}: Must be one of: ${error.context?.options?.join(', ')}`;

      default:
        return `${error.field}: ${error.message}`;
    }
  });
}

/**
 * Проверка прав доступа к полю (заглушка для будущей интеграции)
 */
export function checkFieldPermissions(
  fieldName: string,
  operation: 'read' | 'write' | 'delete',
  userContext: { tenantId: string; userId?: string; roles?: string[] }
): boolean {
  // TODO: Интеграция с системой авторизации
  // Пока возвращаем true для всех операций
  console.log(
    `[Validation] Checking ${operation} permission for field '${fieldName}' for user in tenant ${userContext.tenantId}`
  );
  return true;
}

/**
 * Sanitization функций для очистки входных данных
 */
export function sanitizeFieldValue(value: any, fieldType: string): any {
  if (value === null || value === undefined) {
    return value;
  }

  switch (fieldType) {
    case 'text':
    case 'select':
      // Обрезаем лишние пробелы и ограничиваем длину
      const stringValue = String(value).trim();
      return stringValue.length > VALIDATION_LIMITS.MAX_STRING_LENGTH
        ? stringValue.substring(0, VALIDATION_LIMITS.MAX_STRING_LENGTH)
        : stringValue;

    case 'number':
      const numValue = Number(value);
      if (isNaN(numValue)) return 0;
      return Math.max(
        VALIDATION_LIMITS.MIN_NUMBER,
        Math.min(VALIDATION_LIMITS.MAX_NUMBER, numValue)
      );

    case 'json':
      if (typeof value === 'string') {
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      }
      return value;

    default:
      return value;
  }
}
