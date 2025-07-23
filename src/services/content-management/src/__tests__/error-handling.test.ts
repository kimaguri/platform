import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  handleExtensibleFieldsError,
  normalizeError,
  classifyError,
  determineSeverity,
  generateErrorCode,
  isRecoverable,
  isRetryable,
  attemptRecovery,
  createLogEntry,
  generateUserMessage,
  isExtensibleFieldsError,
  createValidationError,
  createDatabaseError,
  createPermissionError,
  convertValidationErrorsToExtensibleErrors,
  handleMultipleErrors,
  retryWithBackoff,
  ExtensibleFieldsErrorType,
  ErrorSeverity,
  type ExtensibleFieldsError,
  type ErrorContext,
} from '../error-handling';
import { ValidationErrorCode, type ValidationError } from '../validation';

describe('Error Handling Module', () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleExtensibleFieldsError', () => {
    it('should handle standard Error and return ErrorHandlingResult', () => {
      const error = new Error('Test error message');
      const context: ErrorContext = {
        tenantId: 'test-tenant',
        entityTable: 'users',
        fieldName: 'email',
      };

      const result = handleExtensibleFieldsError(error, context);

      expect(result.handled).toBe(true);
      expect(result.userMessage).toBeTruthy();
      expect(result.logEntry).toBeTruthy();
      expect(result.logEntry.error.message).toBe('Test error message');
      expect(result.logEntry.context.tenantId).toBe('test-tenant');
    });

    it('should handle ExtensibleFieldsError directly', () => {
      const error: ExtensibleFieldsError = {
        type: ExtensibleFieldsErrorType.VALIDATION_ERROR,
        severity: ErrorSeverity.LOW,
        message: 'Validation failed',
        code: 'EF_VALIDATION_TEST_123456',
        field: 'email',
        tenantId: 'test-tenant',
        timestamp: new Date().toISOString(),
        recoverable: true,
        retryable: false,
      };

      const result = handleExtensibleFieldsError(error);

      expect(result.handled).toBe(true);
      expect(result.recovered).toBe(true); // validation errors are recoverable
      expect(result.shouldRetry).toBe(false);
    });

    it('should attempt recovery for recoverable errors', () => {
      const error = new Error('Validation error');
      const context: ErrorContext = {
        tenantId: 'test-tenant',
        fieldName: 'optional_field',
        metadata: { isOptional: true },
      };

      const result = handleExtensibleFieldsError(error, context);

      expect(result.handled).toBe(true);
      // Recovery success depends on error classification
    });
  });

  describe('normalizeError', () => {
    it('should return ExtensibleFieldsError as-is', () => {
      const error: ExtensibleFieldsError = {
        type: ExtensibleFieldsErrorType.DATABASE_ERROR,
        severity: ErrorSeverity.HIGH,
        message: 'Database connection failed',
        code: 'EF_DATABASE_CONNECTION_123456',
        timestamp: new Date().toISOString(),
        recoverable: false,
        retryable: true,
      };

      const result = normalizeError(error);

      expect(result).toEqual(error);
    });

    it('should normalize standard Error to ExtensibleFieldsError', () => {
      const error = new Error('Database connection failed');
      const context: ErrorContext = {
        tenantId: 'test-tenant',
        entityTable: 'users',
      };

      const result = normalizeError(error, context);

      expect(result.type).toBe(ExtensibleFieldsErrorType.DATABASE_ERROR);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.message).toBe('Database connection failed');
      expect(result.tenantId).toBe('test-tenant');
      expect(result.entityTable).toBe('users');
      expect(result.originalError).toBe(error);
    });

    it('should add context information to existing ExtensibleFieldsError', () => {
      const error: ExtensibleFieldsError = {
        type: ExtensibleFieldsErrorType.VALIDATION_ERROR,
        severity: ErrorSeverity.LOW,
        message: 'Field validation failed',
        code: 'EF_VALIDATION_TEST_123456',
        timestamp: new Date().toISOString(),
        recoverable: true,
        retryable: false,
      };

      const context: ErrorContext = {
        tenantId: 'test-tenant',
        entityTable: 'users',
        entityId: 'user-123',
      };

      const result = normalizeError(error, context);

      expect(result.tenantId).toBe('test-tenant');
      expect(result.entityTable).toBe('users');
      expect(result.entityId).toBe('user-123');
    });
  });

  describe('classifyError', () => {
    it('should classify validation errors', () => {
      const error = new Error('Validation failed: invalid email format');
      const result = classifyError(error);
      expect(result).toBe(ExtensibleFieldsErrorType.VALIDATION_ERROR);
    });

    it('should classify database errors', () => {
      const error = new Error('Database connection timeout');
      const result = classifyError(error);
      expect(result).toBe(ExtensibleFieldsErrorType.DATABASE_ERROR);
    });

    it('should classify network errors', () => {
      const error = new Error('Network request timeout');
      const result = classifyError(error);
      expect(result).toBe(ExtensibleFieldsErrorType.NETWORK_ERROR);
    });

    it('should classify parsing errors', () => {
      const error = new SyntaxError('Unexpected token in JSON');
      const result = classifyError(error);
      expect(result).toBe(ExtensibleFieldsErrorType.PARSING_ERROR);
    });

    it('should classify permission errors', () => {
      const error = new Error('Unauthorized access to field');
      const result = classifyError(error);
      expect(result).toBe(ExtensibleFieldsErrorType.PERMISSION_ERROR);
    });

    it('should classify unknown errors', () => {
      const error = new Error('Some unknown error');
      const result = classifyError(error);
      expect(result).toBe(ExtensibleFieldsErrorType.UNKNOWN_ERROR);
    });
  });

  describe('determineSeverity', () => {
    it('should assign LOW severity to validation errors', () => {
      const result = determineSeverity(ExtensibleFieldsErrorType.VALIDATION_ERROR, new Error());
      expect(result).toBe(ErrorSeverity.LOW);
    });

    it('should assign HIGH severity to database errors', () => {
      const result = determineSeverity(ExtensibleFieldsErrorType.DATABASE_ERROR, new Error());
      expect(result).toBe(ErrorSeverity.HIGH);
    });

    it('should assign CRITICAL severity to configuration errors', () => {
      const result = determineSeverity(ExtensibleFieldsErrorType.CONFIGURATION_ERROR, new Error());
      expect(result).toBe(ErrorSeverity.CRITICAL);
    });

    it('should assign MEDIUM severity to unknown errors', () => {
      const result = determineSeverity(ExtensibleFieldsErrorType.UNKNOWN_ERROR, new Error());
      expect(result).toBe(ErrorSeverity.MEDIUM);
    });
  });

  describe('generateErrorCode', () => {
    it('should generate unique error codes', () => {
      const code1 = generateErrorCode(
        ExtensibleFieldsErrorType.VALIDATION_ERROR,
        'ValidationError'
      );
      const code2 = generateErrorCode(
        ExtensibleFieldsErrorType.VALIDATION_ERROR,
        'ValidationError'
      );

      expect(code1).toMatch(/^EF_VALIDATION_VALIDATION_\d{6}$/);
      expect(code2).toMatch(/^EF_VALIDATION_VALIDATION_\d{6}$/);
      expect(code1).not.toBe(code2); // Should be unique due to timestamp
    });

    it('should handle missing error name', () => {
      const code = generateErrorCode(ExtensibleFieldsErrorType.DATABASE_ERROR);
      expect(code).toMatch(/^EF_DATABASE_GENERIC_\d{6}$/);
    });
  });

  describe('isRecoverable', () => {
    it('should mark validation errors as recoverable', () => {
      const result = isRecoverable(ExtensibleFieldsErrorType.VALIDATION_ERROR, new Error());
      expect(result).toBe(true);
    });

    it('should mark permission errors as non-recoverable', () => {
      const result = isRecoverable(ExtensibleFieldsErrorType.PERMISSION_ERROR, new Error());
      expect(result).toBe(false);
    });

    it('should mark configuration errors as non-recoverable', () => {
      const result = isRecoverable(ExtensibleFieldsErrorType.CONFIGURATION_ERROR, new Error());
      expect(result).toBe(false);
    });

    it('should mark cache errors as recoverable', () => {
      const result = isRecoverable(ExtensibleFieldsErrorType.CACHE_ERROR, new Error());
      expect(result).toBe(true);
    });
  });

  describe('isRetryable', () => {
    it('should mark network errors as retryable', () => {
      const result = isRetryable(ExtensibleFieldsErrorType.NETWORK_ERROR, new Error());
      expect(result).toBe(true);
    });

    it('should mark validation errors as non-retryable', () => {
      const result = isRetryable(ExtensibleFieldsErrorType.VALIDATION_ERROR, new Error());
      expect(result).toBe(false);
    });

    it('should mark database errors as retryable', () => {
      const result = isRetryable(ExtensibleFieldsErrorType.DATABASE_ERROR, new Error());
      expect(result).toBe(true);
    });

    it('should mark permission errors as non-retryable', () => {
      const result = isRetryable(ExtensibleFieldsErrorType.PERMISSION_ERROR, new Error());
      expect(result).toBe(false);
    });
  });

  describe('attemptRecovery', () => {
    it('should not attempt recovery for non-recoverable errors', () => {
      const error: ExtensibleFieldsError = {
        type: ExtensibleFieldsErrorType.PERMISSION_ERROR,
        severity: ErrorSeverity.HIGH,
        message: 'Access denied',
        code: 'EF_PERMISSION_TEST_123456',
        timestamp: new Date().toISOString(),
        recoverable: false,
        retryable: false,
      };

      const result = attemptRecovery(error, {});
      expect(result.recovered).toBe(false);
    });

    it('should attempt recovery for validation errors with default values', () => {
      const error: ExtensibleFieldsError = {
        type: ExtensibleFieldsErrorType.VALIDATION_ERROR,
        severity: ErrorSeverity.LOW,
        message: 'Required field missing',
        code: 'EF_VALIDATION_TEST_123456',
        field: 'optional_field',
        context: { defaultValue: 'default_value' },
        timestamp: new Date().toISOString(),
        recoverable: true,
        retryable: false,
      };

      const result = attemptRecovery(error, {});
      expect(result.recovered).toBe(true);
      expect(result.fallbackValue).toBe('default_value');
    });

    it('should attempt recovery for parsing errors', () => {
      const error: ExtensibleFieldsError = {
        type: ExtensibleFieldsErrorType.PARSING_ERROR,
        severity: ErrorSeverity.LOW,
        message: 'Invalid JSON format',
        code: 'EF_PARSING_TEST_123456',
        timestamp: new Date().toISOString(),
        recoverable: true,
        retryable: false,
      };

      const result = attemptRecovery(error, {});
      expect(result.recovered).toBe(true);
      expect(result.fallbackValue).toBe(null);
    });

    it('should attempt recovery for cache errors', () => {
      const error: ExtensibleFieldsError = {
        type: ExtensibleFieldsErrorType.CACHE_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: 'Cache connection failed',
        code: 'EF_CACHE_TEST_123456',
        timestamp: new Date().toISOString(),
        recoverable: true,
        retryable: true,
      };

      const result = attemptRecovery(error, {});
      expect(result.recovered).toBe(true);
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Cache error recovered'));
    });
  });

  describe('generateUserMessage', () => {
    it('should generate recovery messages for recovered errors', () => {
      const error: ExtensibleFieldsError = {
        type: ExtensibleFieldsErrorType.VALIDATION_ERROR,
        severity: ErrorSeverity.LOW,
        message: 'Validation failed',
        code: 'EF_VALIDATION_TEST_123456',
        timestamp: new Date().toISOString(),
        recoverable: true,
        retryable: false,
      };

      const message = generateUserMessage(error, true);
      expect(message).toBe(
        'Some field values were corrected automatically. Please review your data.'
      );
    });

    it('should generate error messages for unrecovered errors', () => {
      const error: ExtensibleFieldsError = {
        type: ExtensibleFieldsErrorType.PERMISSION_ERROR,
        severity: ErrorSeverity.HIGH,
        message: 'Access denied',
        code: 'EF_PERMISSION_TEST_123456',
        timestamp: new Date().toISOString(),
        recoverable: false,
        retryable: false,
      };

      const message = generateUserMessage(error, false);
      expect(message).toBe("You don't have permission to perform this action.");
    });

    it('should generate generic error message for unknown error types', () => {
      const error: ExtensibleFieldsError = {
        type: ExtensibleFieldsErrorType.UNKNOWN_ERROR,
        severity: ErrorSeverity.MEDIUM,
        message: 'Unknown error',
        code: 'EF_UNKNOWN_TEST_123456',
        timestamp: new Date().toISOString(),
        recoverable: false,
        retryable: false,
      };

      const message = generateUserMessage(error, false);
      expect(message).toBe(
        'An error occurred. Please try again or contact support if the problem persists.'
      );
    });
  });

  describe('isExtensibleFieldsError', () => {
    it('should identify ExtensibleFieldsError correctly', () => {
      const error: ExtensibleFieldsError = {
        type: ExtensibleFieldsErrorType.VALIDATION_ERROR,
        severity: ErrorSeverity.LOW,
        message: 'Test error',
        code: 'EF_VALIDATION_TEST_123456',
        timestamp: new Date().toISOString(),
        recoverable: true,
        retryable: false,
      };

      expect(isExtensibleFieldsError(error)).toBe(true);
    });

    it('should reject standard Error objects', () => {
      const error = new Error('Standard error');
      expect(isExtensibleFieldsError(error)).toBe(false);
    });

    it('should reject non-error objects', () => {
      expect(isExtensibleFieldsError({})).toBe(false);
      expect(isExtensibleFieldsError(null)).toBe(false);
      expect(isExtensibleFieldsError('string')).toBe(false);
    });
  });

  describe('createValidationError', () => {
    it('should create validation error with correct properties', () => {
      const context: ErrorContext = {
        tenantId: 'test-tenant',
        entityTable: 'users',
        metadata: { value: 'invalid' },
      };

      const error = createValidationError('Invalid email format', 'email', context);

      expect(error.type).toBe(ExtensibleFieldsErrorType.VALIDATION_ERROR);
      expect(error.severity).toBe(ErrorSeverity.LOW);
      expect(error.message).toBe('Invalid email format');
      expect(error.field).toBe('email');
      expect(error.tenantId).toBe('test-tenant');
      expect(error.entityTable).toBe('users');
      expect(error.recoverable).toBe(true);
      expect(error.retryable).toBe(false);
    });
  });

  describe('createDatabaseError', () => {
    it('should create database error with correct properties', () => {
      const originalError = new Error('Connection timeout');
      const context: ErrorContext = {
        tenantId: 'test-tenant',
        entityTable: 'users',
      };

      const error = createDatabaseError('Database operation failed', context, originalError);

      expect(error.type).toBe(ExtensibleFieldsErrorType.DATABASE_ERROR);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.message).toBe('Database operation failed');
      expect(error.originalError).toBe(originalError);
      expect(error.recoverable).toBe(false);
      expect(error.retryable).toBe(true);
    });
  });

  describe('createPermissionError', () => {
    it('should create permission error with correct properties', () => {
      const context: ErrorContext = {
        tenantId: 'test-tenant',
        userId: 'user-123',
      };

      const error = createPermissionError('Access denied to field', 'sensitive_field', context);

      expect(error.type).toBe(ExtensibleFieldsErrorType.PERMISSION_ERROR);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.message).toBe('Access denied to field');
      expect(error.field).toBe('sensitive_field');
      expect(error.recoverable).toBe(false);
      expect(error.retryable).toBe(false);
    });
  });

  describe('convertValidationErrorsToExtensibleErrors', () => {
    it('should convert ValidationError array to ExtensibleFieldsError array', () => {
      const validationErrors: ValidationError[] = [
        {
          field: 'email',
          code: ValidationErrorCode.INVALID_EMAIL,
          message: 'Invalid email format',
          value: 'invalid-email',
        },
        {
          field: 'age',
          code: ValidationErrorCode.VALUE_TOO_LARGE,
          message: 'Value too large',
          value: 200,
          context: { max: 150 },
        },
      ];

      const context: ErrorContext = {
        tenantId: 'test-tenant',
        entityTable: 'users',
      };

      const result = convertValidationErrorsToExtensibleErrors(validationErrors, context);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe(ExtensibleFieldsErrorType.VALIDATION_ERROR);
      expect(result[0].field).toBe('email');
      expect(result[0].message).toBe('Invalid email format');
      expect(result[1].field).toBe('age');
      expect(result[1].context?.validationCode).toBe(ValidationErrorCode.VALUE_TOO_LARGE);
    });
  });

  describe('handleMultipleErrors', () => {
    it('should handle array of errors', () => {
      const errors = [new Error('First error'), new Error('Second error')];

      const context: ErrorContext = {
        tenantId: 'test-tenant',
      };

      const results = handleMultipleErrors(errors, context);

      expect(results).toHaveLength(2);
      expect(results[0].handled).toBe(true);
      expect(results[1].handled).toBe(true);
      expect(results[0].logEntry.error.message).toBe('First error');
      expect(results[1].logEntry.error.message).toBe('Second error');
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await retryWithBackoff(operation, {}, 3, 100);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error('network timeout'))
        .mockRejectedValueOnce(new Error('network timeout'))
        .mockResolvedValue('success');

      const result = await retryWithBackoff(operation, {}, 3, 10);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('persistent error'));

      await expect(retryWithBackoff(operation, {}, 2, 10)).rejects.toThrow('persistent error');
      expect(operation).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      const validationError = new Error('validation failed');
      const operation = vi.fn().mockRejectedValue(validationError);

      await expect(retryWithBackoff(operation, {}, 3, 10)).rejects.toThrow('validation failed');
      expect(operation).toHaveBeenCalledTimes(1); // No retries for validation errors
    });
  });

  describe('createLogEntry', () => {
    it('should create log entry with correct level', () => {
      const error: ExtensibleFieldsError = {
        type: ExtensibleFieldsErrorType.VALIDATION_ERROR,
        severity: ErrorSeverity.LOW,
        message: 'Validation failed',
        code: 'EF_VALIDATION_TEST_123456',
        timestamp: new Date().toISOString(),
        recoverable: true,
        retryable: false,
      };

      const context: ErrorContext = {
        tenantId: 'test-tenant',
        entityTable: 'users',
      };

      const logEntry = createLogEntry(error, context);

      expect(logEntry.level).toBe('warn'); // LOW severity maps to warn
      expect(logEntry.message).toContain('VALIDATION_ERROR');
      expect(logEntry.error).toBe(error);
      expect(logEntry.context).toBe(context);
    });

    it('should map severity levels correctly', () => {
      const testCases = [
        { severity: ErrorSeverity.LOW, expectedLevel: 'warn' },
        { severity: ErrorSeverity.MEDIUM, expectedLevel: 'error' },
        { severity: ErrorSeverity.HIGH, expectedLevel: 'error' },
        { severity: ErrorSeverity.CRITICAL, expectedLevel: 'fatal' },
      ];

      testCases.forEach(({ severity, expectedLevel }) => {
        const error: ExtensibleFieldsError = {
          type: ExtensibleFieldsErrorType.UNKNOWN_ERROR,
          severity,
          message: 'Test error',
          code: 'EF_TEST_123456',
          timestamp: new Date().toISOString(),
          recoverable: false,
          retryable: false,
        };

        const logEntry = createLogEntry(error, {});
        expect(logEntry.level).toBe(expectedLevel);
      });
    });
  });
});
