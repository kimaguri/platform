import type { ValidationError, ValidationWarning } from './validation';

/**
 * Error Handling System for Extensible Fields
 * Функциональный подход для обработки ошибок
 * Типизированные ошибки, логирование, recovery стратегии
 */

// Базовые типы ошибок
export enum ExtensibleFieldsErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  FIELD_DEFINITION_ERROR = 'FIELD_DEFINITION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  PERMISSION_ERROR = 'PERMISSION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Интерфейсы для ошибок
export interface ExtensibleFieldsError {
  type: ExtensibleFieldsErrorType;
  severity: ErrorSeverity;
  message: string;
  code: string;
  field?: string;
  tenantId?: string;
  entityTable?: string;
  entityId?: string;
  originalError?: Error;
  context?: Record<string, any>;
  timestamp: string;
  recoverable: boolean;
  retryable: boolean;
}

export interface ErrorContext {
  tenantId?: string;
  entityTable?: string;
  entityId?: string;
  fieldName?: string;
  operation?: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

// Результат обработки ошибки
export interface ErrorHandlingResult {
  handled: boolean;
  recovered: boolean;
  shouldRetry: boolean;
  fallbackValue?: any;
  userMessage: string;
  logEntry: LogEntry;
}

export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  error: ExtensibleFieldsError;
  context: ErrorContext;
  timestamp: string;
}

/**
 * Основная функция обработки ошибок
 */
export function handleExtensibleFieldsError(
  error: Error | ExtensibleFieldsError,
  context: ErrorContext = {}
): ErrorHandlingResult {
  // Нормализуем ошибку к нашему формату
  const normalizedError = normalizeError(error, context);

  // Логируем ошибку
  const logEntry = createLogEntry(normalizedError, context);
  logError(logEntry);

  // Определяем стратегию восстановления
  const recoveryResult = attemptRecovery(normalizedError, context);

  // Генерируем пользовательское сообщение
  const userMessage = generateUserMessage(normalizedError, recoveryResult.recovered);

  return {
    handled: true,
    recovered: recoveryResult.recovered,
    shouldRetry: normalizedError.retryable && !recoveryResult.recovered,
    fallbackValue: recoveryResult.fallbackValue,
    userMessage,
    logEntry,
  };
}

/**
 * Нормализация ошибок к единому формату
 */
export function normalizeError(
  error: Error | ExtensibleFieldsError,
  context: ErrorContext = {}
): ExtensibleFieldsError {
  // Если уже наша ошибка, возвращаем как есть
  if (isExtensibleFieldsError(error)) {
    return {
      ...error,
      tenantId: error.tenantId || context.tenantId,
      entityTable: error.entityTable || context.entityTable,
      entityId: error.entityId || context.entityId,
    };
  }

  // Классифицируем стандартную ошибку
  const errorType = classifyError(error);
  const severity = determineSeverity(errorType, error);

  return {
    type: errorType,
    severity,
    message: error.message || 'Unknown error occurred',
    code: generateErrorCode(errorType, error.name),
    field: context.fieldName,
    tenantId: context.tenantId,
    entityTable: context.entityTable,
    entityId: context.entityId,
    originalError: error,
    context: context.metadata || {},
    timestamp: new Date().toISOString(),
    recoverable: isRecoverable(errorType, error),
    retryable: isRetryable(errorType, error),
  };
}

/**
 * Классификация ошибок
 */
export function classifyError(error: Error): ExtensibleFieldsErrorType {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Ошибки валидации
  if (
    message.includes('validation') ||
    message.includes('invalid') ||
    message.includes('required')
  ) {
    return ExtensibleFieldsErrorType.VALIDATION_ERROR;
  }

  // Ошибки базы данных
  if (
    message.includes('database') ||
    message.includes('sql') ||
    message.includes('connection') ||
    name.includes('databaseerror') ||
    name.includes('connectionerror')
  ) {
    return ExtensibleFieldsErrorType.DATABASE_ERROR;
  }

  // Ошибки сети
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('fetch') ||
    name.includes('networkerror') ||
    name.includes('timeouterror')
  ) {
    return ExtensibleFieldsErrorType.NETWORK_ERROR;
  }

  // Ошибки парсинга
  if (
    message.includes('parse') ||
    message.includes('json') ||
    message.includes('syntax') ||
    name.includes('syntaxerror') ||
    name.includes('parseerror')
  ) {
    return ExtensibleFieldsErrorType.PARSING_ERROR;
  }

  // Ошибки конфигурации
  if (
    message.includes('config') ||
    message.includes('setup') ||
    message.includes('initialization')
  ) {
    return ExtensibleFieldsErrorType.CONFIGURATION_ERROR;
  }

  // Ошибки прав доступа
  if (
    message.includes('permission') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    name.includes('permissionerror') ||
    name.includes('unauthorizederror')
  ) {
    return ExtensibleFieldsErrorType.PERMISSION_ERROR;
  }

  // Ошибки кеша
  if (message.includes('cache') || message.includes('redis') || message.includes('memory')) {
    return ExtensibleFieldsErrorType.CACHE_ERROR;
  }

  // Ошибки определения полей
  if (
    message.includes('field definition') ||
    message.includes('field metadata') ||
    message.includes('schema')
  ) {
    return ExtensibleFieldsErrorType.FIELD_DEFINITION_ERROR;
  }

  return ExtensibleFieldsErrorType.UNKNOWN_ERROR;
}

/**
 * Определение серьезности ошибки
 */
export function determineSeverity(
  errorType: ExtensibleFieldsErrorType,
  error: Error
): ErrorSeverity {
  switch (errorType) {
    case ExtensibleFieldsErrorType.VALIDATION_ERROR:
    case ExtensibleFieldsErrorType.PARSING_ERROR:
      return ErrorSeverity.LOW;

    case ExtensibleFieldsErrorType.CACHE_ERROR:
    case ExtensibleFieldsErrorType.FIELD_DEFINITION_ERROR:
      return ErrorSeverity.MEDIUM;

    case ExtensibleFieldsErrorType.DATABASE_ERROR:
    case ExtensibleFieldsErrorType.NETWORK_ERROR:
    case ExtensibleFieldsErrorType.PERMISSION_ERROR:
      return ErrorSeverity.HIGH;

    case ExtensibleFieldsErrorType.CONFIGURATION_ERROR:
    case ExtensibleFieldsErrorType.TIMEOUT_ERROR:
      return ErrorSeverity.CRITICAL;

    default:
      return ErrorSeverity.MEDIUM;
  }
}

/**
 * Генерация кода ошибки
 */
export function generateErrorCode(
  errorType: ExtensibleFieldsErrorType,
  errorName?: string
): string {
  const typeCode = errorType.replace('_ERROR', '').replace('_', '');
  const nameCode = errorName ? errorName.replace('Error', '').toUpperCase() : 'GENERIC';
  const timestamp = Date.now().toString().slice(-6); // Последние 6 цифр timestamp

  return `EF_${typeCode}_${nameCode}_${timestamp}`;
}

/**
 * Проверка, является ли ошибка восстанавливаемой
 */
export function isRecoverable(errorType: ExtensibleFieldsErrorType, error: Error): boolean {
  switch (errorType) {
    case ExtensibleFieldsErrorType.VALIDATION_ERROR:
    case ExtensibleFieldsErrorType.PARSING_ERROR:
    case ExtensibleFieldsErrorType.CACHE_ERROR:
      return true;

    case ExtensibleFieldsErrorType.FIELD_DEFINITION_ERROR:
    case ExtensibleFieldsErrorType.PERMISSION_ERROR:
      return false;

    case ExtensibleFieldsErrorType.DATABASE_ERROR:
    case ExtensibleFieldsErrorType.NETWORK_ERROR:
      // Зависит от конкретной ошибки
      return !error.message.includes('fatal') && !error.message.includes('permanent');

    case ExtensibleFieldsErrorType.CONFIGURATION_ERROR:
      return false;

    default:
      return false;
  }
}

/**
 * Проверка, можно ли повторить операцию
 */
export function isRetryable(errorType: ExtensibleFieldsErrorType, error: Error): boolean {
  switch (errorType) {
    case ExtensibleFieldsErrorType.NETWORK_ERROR:
    case ExtensibleFieldsErrorType.TIMEOUT_ERROR:
    case ExtensibleFieldsErrorType.DATABASE_ERROR:
      return true;

    case ExtensibleFieldsErrorType.CACHE_ERROR:
      return true;

    case ExtensibleFieldsErrorType.VALIDATION_ERROR:
    case ExtensibleFieldsErrorType.PARSING_ERROR:
    case ExtensibleFieldsErrorType.PERMISSION_ERROR:
    case ExtensibleFieldsErrorType.CONFIGURATION_ERROR:
      return false;

    default:
      return false;
  }
}

/**
 * Попытка восстановления после ошибки
 */
export function attemptRecovery(
  error: ExtensibleFieldsError,
  context: ErrorContext
): { recovered: boolean; fallbackValue?: any } {
  if (!error.recoverable) {
    return { recovered: false };
  }

  switch (error.type) {
    case ExtensibleFieldsErrorType.VALIDATION_ERROR:
      return recoverFromValidationError(error, context);

    case ExtensibleFieldsErrorType.PARSING_ERROR:
      return recoverFromParsingError(error, context);

    case ExtensibleFieldsErrorType.CACHE_ERROR:
      return recoverFromCacheError(error, context);

    case ExtensibleFieldsErrorType.FIELD_DEFINITION_ERROR:
      return recoverFromFieldDefinitionError(error, context);

    default:
      return { recovered: false };
  }
}

/**
 * Восстановление после ошибок валидации
 */
function recoverFromValidationError(
  error: ExtensibleFieldsError,
  context: ErrorContext
): { recovered: boolean; fallbackValue?: any } {
  // Применяем значения по умолчанию или очищаем невалидные данные
  if (error.field && error.context?.defaultValue !== undefined) {
    return {
      recovered: true,
      fallbackValue: error.context.defaultValue,
    };
  }

  // Для некритичных полей можем пропустить
  if (error.context?.isOptional) {
    return {
      recovered: true,
      fallbackValue: null,
    };
  }

  return { recovered: false };
}

/**
 * Восстановление после ошибок парсинга
 */
function recoverFromParsingError(
  error: ExtensibleFieldsError,
  context: ErrorContext
): { recovered: boolean; fallbackValue?: any } {
  // Для JSON полей возвращаем пустой объект
  if (error.message.includes('JSON')) {
    return {
      recovered: true,
      fallbackValue: {},
    };
  }

  // Для других типов возвращаем null
  return {
    recovered: true,
    fallbackValue: null,
  };
}

/**
 * Восстановление после ошибок кеша
 */
function recoverFromCacheError(
  error: ExtensibleFieldsError,
  context: ErrorContext
): { recovered: boolean; fallbackValue?: any } {
  // Кеш не критичен, можем работать без него
  console.warn(`[ErrorHandling] Cache error recovered, working without cache: ${error.message}`);
  return { recovered: true };
}

/**
 * Восстановление после ошибок определения полей
 */
function recoverFromFieldDefinitionError(
  error: ExtensibleFieldsError,
  context: ErrorContext
): { recovered: boolean; fallbackValue?: any } {
  // Если поле не определено, можем его пропустить
  if (error.message.includes('not defined')) {
    console.warn(
      `[ErrorHandling] Field definition error recovered by skipping field: ${error.field}`
    );
    return { recovered: true };
  }

  return { recovered: false };
}

/**
 * Создание записи для лога
 */
export function createLogEntry(error: ExtensibleFieldsError, context: ErrorContext): LogEntry {
  const level = getLogLevel(error.severity);

  return {
    level,
    message: `[ExtensibleFields] ${error.type}: ${error.message}`,
    error,
    context,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Определение уровня логирования
 */
function getLogLevel(severity: ErrorSeverity): LogEntry['level'] {
  switch (severity) {
    case ErrorSeverity.LOW:
      return 'warn';
    case ErrorSeverity.MEDIUM:
      return 'error';
    case ErrorSeverity.HIGH:
      return 'error';
    case ErrorSeverity.CRITICAL:
      return 'fatal';
    default:
      return 'error';
  }
}

/**
 * Логирование ошибки
 */
export function logError(logEntry: LogEntry): void {
  const logMessage = {
    timestamp: logEntry.timestamp,
    level: logEntry.level,
    message: logEntry.message,
    errorCode: logEntry.error.code,
    errorType: logEntry.error.type,
    severity: logEntry.error.severity,
    tenantId: logEntry.context.tenantId,
    entityTable: logEntry.context.entityTable,
    field: logEntry.error.field,
    recoverable: logEntry.error.recoverable,
    retryable: logEntry.error.retryable,
    context: logEntry.context,
  };

  // В реальном приложении здесь будет интеграция с системой логирования
  switch (logEntry.level) {
    case 'debug':
      console.debug('[ExtensibleFields]', logMessage);
      break;
    case 'info':
      console.info('[ExtensibleFields]', logMessage);
      break;
    case 'warn':
      console.warn('[ExtensibleFields]', logMessage);
      break;
    case 'error':
      console.error('[ExtensibleFields]', logMessage);
      break;
    case 'fatal':
      console.error('[ExtensibleFields] FATAL:', logMessage);
      // В реальном приложении здесь может быть отправка уведомлений
      break;
  }
}

/**
 * Генерация пользовательского сообщения
 */
export function generateUserMessage(error: ExtensibleFieldsError, recovered: boolean): string {
  if (recovered) {
    switch (error.type) {
      case ExtensibleFieldsErrorType.VALIDATION_ERROR:
        return `Some field values were corrected automatically. Please review your data.`;

      case ExtensibleFieldsErrorType.CACHE_ERROR:
        return `System is operating normally, but some features may be slower than usual.`;

      case ExtensibleFieldsErrorType.PARSING_ERROR:
        return `Some data was corrected due to formatting issues. Please verify your input.`;

      default:
        return `Issue was resolved automatically. No action needed.`;
    }
  }

  // Сообщения для неустраненных ошибок
  switch (error.type) {
    case ExtensibleFieldsErrorType.VALIDATION_ERROR:
      return `Please check your input: ${error.message}`;

    case ExtensibleFieldsErrorType.PERMISSION_ERROR:
      return `You don't have permission to perform this action.`;

    case ExtensibleFieldsErrorType.DATABASE_ERROR:
      return `Database error occurred. Please try again later.`;

    case ExtensibleFieldsErrorType.NETWORK_ERROR:
      return `Network error occurred. Please check your connection and try again.`;

    case ExtensibleFieldsErrorType.CONFIGURATION_ERROR:
      return `System configuration error. Please contact support.`;

    default:
      return `An error occurred. Please try again or contact support if the problem persists.`;
  }
}

/**
 * Проверка, является ли объект нашей ошибкой
 */
export function isExtensibleFieldsError(error: any): error is ExtensibleFieldsError {
  return (
    error &&
    typeof error === 'object' &&
    'type' in error &&
    'severity' in error &&
    'code' in error &&
    Object.values(ExtensibleFieldsErrorType).includes(error.type)
  );
}

/**
 * Создание специфичных ошибок
 */
export function createValidationError(
  message: string,
  field: string,
  context: ErrorContext = {}
): ExtensibleFieldsError {
  return {
    type: ExtensibleFieldsErrorType.VALIDATION_ERROR,
    severity: ErrorSeverity.LOW,
    message,
    code: generateErrorCode(ExtensibleFieldsErrorType.VALIDATION_ERROR, 'ValidationError'),
    field,
    tenantId: context.tenantId,
    entityTable: context.entityTable,
    entityId: context.entityId,
    context: context.metadata || {},
    timestamp: new Date().toISOString(),
    recoverable: true,
    retryable: false,
  };
}

export function createDatabaseError(
  message: string,
  context: ErrorContext = {},
  originalError?: Error
): ExtensibleFieldsError {
  return {
    type: ExtensibleFieldsErrorType.DATABASE_ERROR,
    severity: ErrorSeverity.HIGH,
    message,
    code: generateErrorCode(ExtensibleFieldsErrorType.DATABASE_ERROR, originalError?.name),
    tenantId: context.tenantId,
    entityTable: context.entityTable,
    entityId: context.entityId,
    originalError,
    context: context.metadata || {},
    timestamp: new Date().toISOString(),
    recoverable: false,
    retryable: true,
  };
}

export function createPermissionError(
  message: string,
  field: string,
  context: ErrorContext = {}
): ExtensibleFieldsError {
  return {
    type: ExtensibleFieldsErrorType.PERMISSION_ERROR,
    severity: ErrorSeverity.HIGH,
    message,
    code: generateErrorCode(ExtensibleFieldsErrorType.PERMISSION_ERROR, 'PermissionError'),
    field,
    tenantId: context.tenantId,
    entityTable: context.entityTable,
    context: context.metadata || {},
    timestamp: new Date().toISOString(),
    recoverable: false,
    retryable: false,
  };
}

/**
 * Утилиты для работы с ошибками валидации
 */
export function convertValidationErrorsToExtensibleErrors(
  validationErrors: ValidationError[],
  context: ErrorContext = {}
): ExtensibleFieldsError[] {
  return validationErrors.map((validationError) => ({
    type: ExtensibleFieldsErrorType.VALIDATION_ERROR,
    severity: ErrorSeverity.LOW,
    message: validationError.message,
    code: generateErrorCode(ExtensibleFieldsErrorType.VALIDATION_ERROR, validationError.code),
    field: validationError.field,
    tenantId: context.tenantId,
    entityTable: context.entityTable,
    entityId: context.entityId,
    context: {
      validationCode: validationError.code,
      value: validationError.value,
      ...validationError.context,
      ...context.metadata,
    },
    timestamp: new Date().toISOString(),
    recoverable: true,
    retryable: false,
  }));
}

/**
 * Batch обработка ошибок
 */
export function handleMultipleErrors(
  errors: (Error | ExtensibleFieldsError)[],
  context: ErrorContext = {}
): ErrorHandlingResult[] {
  return errors.map((error) => handleExtensibleFieldsError(error, context));
}

/**
 * Retry механизм с экспоненциальной задержкой
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  context: ErrorContext = {},
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const normalizedError = normalizeError(lastError, context);

      if (!normalizedError.retryable || attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.warn(
        `[ErrorHandling] Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
