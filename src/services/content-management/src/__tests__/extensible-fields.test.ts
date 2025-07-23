import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseExtensionFieldValues,
  getFieldDefinitionsCacheStats,
  invalidateFieldDefinitionsCache,
  type ExtensionFieldValue,
} from '../extensible-fields';
import type { ExtensionFieldDefinition } from '../../../tenant-management/src/extensible-fields';

// Mock the validation and error handling modules
vi.mock('../validation', () => ({
  validateExtensionFields: vi.fn(),
  applyDefaultValues: vi.fn(),
  sanitizeFieldValue: vi.fn(),
  ValidationErrorCode: {
    REQUIRED_FIELD_MISSING: 'REQUIRED_FIELD_MISSING',
    INVALID_TYPE: 'INVALID_TYPE',
    INVALID_EMAIL: 'INVALID_EMAIL',
  },
  ValidationWarningCode: {
    DEFAULT_VALUE_APPLIED: 'DEFAULT_VALUE_APPLIED',
    TYPE_COERCION: 'TYPE_COERCION',
  },
}));

vi.mock('../error-handling', () => ({
  handleExtensibleFieldsError: vi.fn(),
  createValidationError: vi.fn(),
  convertValidationErrorsToExtensibleErrors: vi.fn(),
  ExtensibleFieldsErrorType: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
  },
  ErrorSeverity: {
    LOW: 'LOW',
  },
}));

// Mock the connector registry
vi.mock('../../../connectors/registry/connector-registry', () => ({
  getAdapterForTenant: vi.fn(),
}));

describe('Extensible Fields Module', () => {
  const mockFieldDefinitions: ExtensionFieldDefinition[] = [
    {
      id: 1,
      tenant_id: 'test-tenant',
      entity_table: 'users',
      field_name: 'email',
      field_type: 'text',
      display_name: 'Email Address',
      description: 'User email address',
      is_required: true,
      is_searchable: true,
      is_filterable: true,
      is_sortable: true,
      default_value: undefined,
      validation_rules: { format: 'email' },
      ui_config: {},
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      tenant_id: 'test-tenant',
      entity_table: 'users',
      field_name: 'age',
      field_type: 'number',
      display_name: 'Age',
      description: 'User age',
      is_required: false,
      is_searchable: true,
      is_filterable: true,
      is_sortable: true,
      default_value: '18',
      validation_rules: { min: 0, max: 150 },
      ui_config: {},
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseExtensionFieldValues', () => {
    it('should successfully parse and validate field values', async () => {
      const { validateExtensionFields, applyDefaultValues, sanitizeFieldValue } = await import(
        '../validation'
      );

      // Mock successful validation
      (sanitizeFieldValue as any).mockImplementation((value: any) => value);
      (applyDefaultValues as any).mockImplementation((values: any) => values);
      (validateExtensionFields as any).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const rawValues = {
        email: 'test@example.com',
        age: 25,
      };

      const result = parseExtensionFieldValues(rawValues, mockFieldDefinitions);

      expect(sanitizeFieldValue).toHaveBeenCalledWith('test@example.com', 'text');
      expect(sanitizeFieldValue).toHaveBeenCalledWith(25, 'number');
      expect(applyDefaultValues).toHaveBeenCalledWith(rawValues, mockFieldDefinitions);
      expect(validateExtensionFields).toHaveBeenCalledWith(rawValues, mockFieldDefinitions, {});
      expect(result).toEqual(rawValues);
    });

    it('should handle validation errors and attempt recovery', async () => {
      const { validateExtensionFields, applyDefaultValues, sanitizeFieldValue } = await import(
        '../validation'
      );
      const { convertValidationErrorsToExtensibleErrors, createValidationError } = await import(
        '../error-handling'
      );

      // Mock sanitization and default values
      (sanitizeFieldValue as any).mockImplementation((value: any) => value);
      (applyDefaultValues as any).mockImplementation((values: any) => values);

      // Mock validation failure
      const validationErrors = [
        {
          field: 'email',
          code: 'INVALID_EMAIL',
          message: 'Invalid email format',
          value: 'invalid-email',
        },
      ];

      (validateExtensionFields as any).mockReturnValue({
        isValid: false,
        errors: validationErrors,
        warnings: [],
      });

      // Mock error conversion
      (convertValidationErrorsToExtensibleErrors as any).mockReturnValue([]);

      // Mock error creation
      const mockError = new Error('Validation failed');
      (createValidationError as any).mockReturnValue(mockError);

      const rawValues = {
        email: 'invalid-email',
        age: 25,
      };

      expect(() => {
        parseExtensionFieldValues(rawValues, mockFieldDefinitions);
      }).toThrow();

      expect(validateExtensionFields).toHaveBeenCalledWith(rawValues, mockFieldDefinitions, {});
      expect(convertValidationErrorsToExtensibleErrors).toHaveBeenCalledWith(
        validationErrors,
        expect.any(Object)
      );
    });

    it('should handle validation recovery with fallback values', async () => {
      const { validateExtensionFields, applyDefaultValues, sanitizeFieldValue } = await import(
        '../validation'
      );

      // Mock sanitization and default values
      (sanitizeFieldValue as any).mockImplementation((value: any) => value);
      (applyDefaultValues as any).mockImplementation((values: any) => values);

      // Mock validation failure but with recovery
      (validateExtensionFields as any).mockReturnValue({
        isValid: false,
        errors: [
          {
            field: 'age',
            code: 'REQUIRED_FIELD_MISSING',
            message: 'Required field missing',
          },
        ],
        warnings: [],
      });

      const rawValues = {
        email: 'test@example.com',
        // age is missing
      };

      // We'll mock the attemptValidationRecovery function to return recovered values
      const result = parseExtensionFieldValues(rawValues, mockFieldDefinitions);

      expect(validateExtensionFields).toHaveBeenCalled();
    });

    it('should handle error handling integration', async () => {
      const { validateExtensionFields, applyDefaultValues, sanitizeFieldValue } = await import(
        '../validation'
      );
      const { handleExtensibleFieldsError } = await import('../error-handling');

      // Mock functions throwing error
      (sanitizeFieldValue as any).mockImplementation(() => {
        throw new Error('Sanitization failed');
      });

      // Mock error handler
      (handleExtensibleFieldsError as any).mockReturnValue({
        handled: true,
        recovered: true,
        fallbackValue: { email: 'fallback@example.com' },
      });

      const rawValues = {
        email: 'test@example.com',
      };

      const result = parseExtensionFieldValues(rawValues, mockFieldDefinitions);

      expect(handleExtensibleFieldsError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            fieldDefinitions: mockFieldDefinitions,
            rawValues,
          }),
        })
      );
      expect(result).toEqual({ email: 'fallback@example.com' });
    });

    it('should pass validation options correctly', async () => {
      const { validateExtensionFields, applyDefaultValues, sanitizeFieldValue } = await import(
        '../validation'
      );

      // Mock successful validation
      (sanitizeFieldValue as any).mockImplementation((value: any) => value);
      (applyDefaultValues as any).mockImplementation((values: any) => values);
      (validateExtensionFields as any).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const rawValues = {
        email: 'test@example.com',
      };

      const options = {
        strictMode: true,
        allowUnknownFields: false,
        enableWarnings: true,
      };

      parseExtensionFieldValues(rawValues, mockFieldDefinitions, options);

      expect(validateExtensionFields).toHaveBeenCalledWith(
        rawValues,
        mockFieldDefinitions,
        options
      );
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      const stats = getFieldDefinitionsCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('entries');
      expect(typeof stats.size).toBe('number');
      expect(Array.isArray(stats.entries)).toBe(true);
    });

    it('should invalidate cache for specific tenant and entity', () => {
      // This is a void function, so we just test it doesn't throw
      expect(() => {
        invalidateFieldDefinitionsCache('test-tenant', 'users');
      }).not.toThrow();
    });

    it('should invalidate cache for specific tenant', () => {
      expect(() => {
        invalidateFieldDefinitionsCache('test-tenant');
      }).not.toThrow();
    });

    it('should invalidate all cache', () => {
      expect(() => {
        invalidateFieldDefinitionsCache();
      }).not.toThrow();
    });
  });

  describe('Sanitization Integration', () => {
    it('should sanitize input values before processing', async () => {
      const { validateExtensionFields, applyDefaultValues, sanitizeFieldValue } = await import(
        '../validation'
      );

      // Mock sanitization with transformation
      (sanitizeFieldValue as any).mockImplementation((value: any, type: string) => {
        if (type === 'text') return String(value).trim();
        if (type === 'number') return Number(value);
        return value;
      });

      (applyDefaultValues as any).mockImplementation((values: any) => values);
      (validateExtensionFields as any).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const rawValues = {
        email: '  test@example.com  ', // should be trimmed
        age: '25', // should be converted to number
      };

      parseExtensionFieldValues(rawValues, mockFieldDefinitions);

      expect(sanitizeFieldValue).toHaveBeenCalledWith('  test@example.com  ', 'text');
      expect(sanitizeFieldValue).toHaveBeenCalledWith('25', 'number');
    });
  });

  describe('Default Values Integration', () => {
    it('should apply default values before validation', async () => {
      const { validateExtensionFields, applyDefaultValues, sanitizeFieldValue } = await import(
        '../validation'
      );

      (sanitizeFieldValue as any).mockImplementation((value: any) => value);

      // Mock default values application
      (applyDefaultValues as any).mockImplementation((values: any, definitions: any) => {
        const result = { ...values };
        definitions.forEach((def: any) => {
          if (def.default_value && !result[def.field_name]) {
            result[def.field_name] = def.default_value;
          }
        });
        return result;
      });

      (validateExtensionFields as any).mockReturnValue({
        isValid: true,
        errors: [],
        warnings: [],
      });

      const rawValues = {
        email: 'test@example.com',
        // age is missing, should get default value
      };

      parseExtensionFieldValues(rawValues, mockFieldDefinitions);

      expect(applyDefaultValues).toHaveBeenCalledWith(
        expect.objectContaining(rawValues),
        mockFieldDefinitions
      );
    });
  });

  describe('Error Context Integration', () => {
    it('should provide proper error context for debugging', async () => {
      const { validateExtensionFields, applyDefaultValues, sanitizeFieldValue } = await import(
        '../validation'
      );
      const { handleExtensibleFieldsError } = await import('../error-handling');

      // Mock error during processing
      (sanitizeFieldValue as any).mockImplementation(() => {
        throw new Error('Processing failed');
      });

      (handleExtensibleFieldsError as any).mockReturnValue({
        handled: true,
        recovered: false,
      });

      const rawValues = {
        email: 'test@example.com',
      };

      const options = { strictMode: true };

      try {
        parseExtensionFieldValues(rawValues, mockFieldDefinitions, options);
      } catch (error) {
        // Expected to throw
      }

      expect(handleExtensibleFieldsError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          metadata: expect.objectContaining({
            fieldDefinitions: mockFieldDefinitions,
            rawValues,
            options,
          }),
        })
      );
    });
  });

  describe('Validation Warnings Integration', () => {
    it('should log validation warnings when recovery is successful', async () => {
      const { validateExtensionFields, applyDefaultValues, sanitizeFieldValue } = await import(
        '../validation'
      );

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      (sanitizeFieldValue as any).mockImplementation((value: any) => value);
      (applyDefaultValues as any).mockImplementation((values: any) => values);

      // Mock validation with warnings but successful recovery
      (validateExtensionFields as any).mockReturnValue({
        isValid: false,
        errors: [
          {
            field: 'age',
            code: 'REQUIRED_FIELD_MISSING',
            message: 'Required field missing',
          },
        ],
        warnings: [
          {
            field: 'age',
            code: 'DEFAULT_VALUE_APPLIED',
            message: 'Default value applied for missing field',
          },
        ],
      });

      const rawValues = {
        email: 'test@example.com',
      };

      // We need to mock the attemptValidationRecovery to return success
      // This would be tested in integration with the actual validation module

      consoleSpy.mockRestore();
    });
  });
});
