import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateExtensionFields,
  validateSingleField,
  validateFieldType,
  validateFieldRules,
  validateSpecialFormat,
  applyDefaultValues,
  sanitizeFieldValue,
  formatValidationErrors,
  ValidationErrorCode,
  ValidationWarningCode,
  VALIDATION_LIMITS,
  VALIDATION_PATTERNS,
  type ValidationOptions,
} from '../validation';
import type { ExtensionFieldDefinition } from '../../../tenant-management/src/extensible-fields';

describe('Validation Module', () => {
  // Mock field definitions for testing
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
      validation_rules: { format: 'email', maxLength: 255 },
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
    {
      id: 3,
      tenant_id: 'test-tenant',
      entity_table: 'users',
      field_name: 'preferences',
      field_type: 'json',
      display_name: 'User Preferences',
      description: 'User preferences in JSON format',
      is_required: false,
      is_searchable: false,
      is_filterable: false,
      is_sortable: false,
      default_value: '{}',
      validation_rules: {},
      ui_config: {},
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 4,
      tenant_id: 'test-tenant',
      entity_table: 'users',
      field_name: 'status',
      field_type: 'select',
      display_name: 'Status',
      description: 'User status',
      is_required: true,
      is_searchable: true,
      is_filterable: true,
      is_sortable: true,
      default_value: 'active',
      validation_rules: { options: ['active', 'inactive', 'pending'] },
      ui_config: {},
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  describe('validateExtensionFields', () => {
    it('should validate valid field values successfully', () => {
      const fieldValues = {
        email: 'test@example.com',
        age: 25,
        preferences: { theme: 'dark' },
        status: 'active',
      };

      const result = validateExtensionFields(fieldValues, mockFieldDefinitions);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const fieldValues = {
        age: 25,
        // email is missing (required)
        // status is missing (required)
      };

      const result = validateExtensionFields(fieldValues, mockFieldDefinitions);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].code).toBe(ValidationErrorCode.REQUIRED_FIELD_MISSING);
      expect(result.errors[0].field).toBe('email');
      expect(result.errors[1].code).toBe(ValidationErrorCode.REQUIRED_FIELD_MISSING);
      expect(result.errors[1].field).toBe('status');
    });

    it('should apply default values for missing optional fields', () => {
      const fieldValues = {
        email: 'test@example.com',
        status: 'active',
        // age is missing but has default value
        // preferences is missing but has default value
      };

      const result = validateExtensionFields(fieldValues, mockFieldDefinitions, {
        enableWarnings: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0].code).toBe(ValidationWarningCode.DEFAULT_VALUE_APPLIED);
      expect(result.warnings[0].field).toBe('age');
    });

    it('should reject unknown fields when allowUnknownFields is false', () => {
      const fieldValues = {
        email: 'test@example.com',
        status: 'active',
        unknownField: 'some value',
      };

      const result = validateExtensionFields(fieldValues, mockFieldDefinitions, {
        allowUnknownFields: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ValidationErrorCode.FIELD_NOT_DEFINED);
      expect(result.errors[0].field).toBe('unknownField');
    });

    it('should allow unknown fields when allowUnknownFields is true', () => {
      const fieldValues = {
        email: 'test@example.com',
        status: 'active',
        unknownField: 'some value',
      };

      const result = validateExtensionFields(fieldValues, mockFieldDefinitions, {
        allowUnknownFields: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should respect field limits', () => {
      const fieldValues = {};

      // Create too many fields
      for (let i = 0; i < VALIDATION_LIMITS.MAX_FIELDS_PER_ENTITY + 1; i++) {
        fieldValues[`field${i}`] = 'value';
      }

      const result = validateExtensionFields(fieldValues, []);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(ValidationErrorCode.VALUE_TOO_LARGE);
      expect(result.errors[0].field).toBe('_global');
    });
  });

  describe('validateSingleField', () => {
    it('should validate text field correctly', () => {
      const definition = mockFieldDefinitions[0]; // email field
      const result = validateSingleField('test@example.com', definition);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate number field correctly', () => {
      const definition = mockFieldDefinitions[1]; // age field
      const result = validateSingleField(25, definition);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid email format', () => {
      const definition = mockFieldDefinitions[0]; // email field
      const result = validateSingleField('invalid-email', definition);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(ValidationErrorCode.INVALID_EMAIL);
    });

    it('should detect number out of range', () => {
      const definition = mockFieldDefinitions[1]; // age field (min: 0, max: 150)
      const result = validateSingleField(200, definition);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(ValidationErrorCode.VALUE_TOO_LARGE);
    });

    it('should validate select field options', () => {
      const definition = mockFieldDefinitions[3]; // status field
      const result = validateSingleField('invalid-status', definition);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(ValidationErrorCode.INVALID_OPTION);
    });
  });

  describe('validateFieldType', () => {
    it('should validate text type', () => {
      const result = validateFieldType('hello', 'text', 'testField');
      expect(result.isValid).toBe(true);
    });

    it('should validate number type', () => {
      const result = validateFieldType(42, 'number', 'testField');
      expect(result.isValid).toBe(true);
    });

    it('should validate boolean type', () => {
      const result = validateFieldType(true, 'boolean', 'testField');
      expect(result.isValid).toBe(true);
    });

    it('should validate date type', () => {
      const result = validateFieldType(new Date(), 'date', 'testField');
      expect(result.isValid).toBe(true);
    });

    it('should validate JSON type', () => {
      const result = validateFieldType({ key: 'value' }, 'json', 'testField');
      expect(result.isValid).toBe(true);
    });

    it('should coerce types in non-strict mode', () => {
      const result = validateFieldType('123', 'number', 'testField', {
        strictMode: false,
        enableWarnings: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe(ValidationWarningCode.TYPE_COERCION);
    });

    it('should reject type coercion in strict mode', () => {
      const result = validateFieldType('123', 'number', 'testField', {
        strictMode: true,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(ValidationErrorCode.INVALID_TYPE);
    });

    it('should detect invalid JSON', () => {
      const result = validateFieldType('invalid json', 'json', 'testField');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(ValidationErrorCode.INVALID_JSON);
    });

    it('should detect non-finite numbers', () => {
      const result = validateFieldType(NaN, 'number', 'testField');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(ValidationErrorCode.INVALID_TYPE);
    });
  });

  describe('validateFieldRules', () => {
    it('should validate string length rules', () => {
      const rules = { minLength: 5, maxLength: 10 };

      const validResult = validateFieldRules('hello', rules, 'testField', 'text');
      expect(validResult.isValid).toBe(true);

      const tooShortResult = validateFieldRules('hi', rules, 'testField', 'text');
      expect(tooShortResult.isValid).toBe(false);
      expect(tooShortResult.errors[0].code).toBe(ValidationErrorCode.VALUE_TOO_SHORT);

      const tooLongResult = validateFieldRules('this is too long', rules, 'testField', 'text');
      expect(tooLongResult.isValid).toBe(false);
      expect(tooLongResult.errors[0].code).toBe(ValidationErrorCode.VALUE_TOO_LONG);
    });

    it('should validate number range rules', () => {
      const rules = { min: 10, max: 100 };

      const validResult = validateFieldRules(50, rules, 'testField', 'number');
      expect(validResult.isValid).toBe(true);

      const tooSmallResult = validateFieldRules(5, rules, 'testField', 'number');
      expect(tooSmallResult.isValid).toBe(false);
      expect(tooSmallResult.errors[0].code).toBe(ValidationErrorCode.VALUE_TOO_SMALL);

      const tooLargeResult = validateFieldRules(150, rules, 'testField', 'number');
      expect(tooLargeResult.isValid).toBe(false);
      expect(tooLargeResult.errors[0].code).toBe(ValidationErrorCode.VALUE_TOO_LARGE);
    });

    it('should validate pattern rules', () => {
      const rules = { pattern: '^[A-Z][a-z]+$' };

      const validResult = validateFieldRules('Hello', rules, 'testField', 'text');
      expect(validResult.isValid).toBe(true);

      const invalidResult = validateFieldRules('hello', rules, 'testField', 'text');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].code).toBe(ValidationErrorCode.INVALID_FORMAT);
    });

    it('should validate options rules', () => {
      const rules = { options: ['red', 'green', 'blue'] };

      const validResult = validateFieldRules('red', rules, 'testField', 'select');
      expect(validResult.isValid).toBe(true);

      const invalidResult = validateFieldRules('yellow', rules, 'testField', 'select');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].code).toBe(ValidationErrorCode.INVALID_OPTION);
    });
  });

  describe('validateSpecialFormat', () => {
    it('should validate email format', () => {
      const validResult = validateSpecialFormat('test@example.com', 'email', 'emailField');
      expect(validResult.isValid).toBe(true);

      const invalidResult = validateSpecialFormat('invalid-email', 'email', 'emailField');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].code).toBe(ValidationErrorCode.INVALID_EMAIL);
    });

    it('should validate URL format', () => {
      const validResult = validateSpecialFormat('https://example.com', 'url', 'urlField');
      expect(validResult.isValid).toBe(true);

      const invalidResult = validateSpecialFormat('not-a-url', 'url', 'urlField');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].code).toBe(ValidationErrorCode.INVALID_URL);
    });

    it('should validate phone format', () => {
      const validResult = validateSpecialFormat('+1234567890', 'phone', 'phoneField');
      expect(validResult.isValid).toBe(true);

      const invalidResult = validateSpecialFormat('invalid-phone', 'phone', 'phoneField');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].code).toBe(ValidationErrorCode.INVALID_PHONE);
    });

    it('should validate UUID format', () => {
      const validResult = validateSpecialFormat(
        '123e4567-e89b-12d3-a456-426614174000',
        'uuid',
        'uuidField'
      );
      expect(validResult.isValid).toBe(true);

      const invalidResult = validateSpecialFormat('not-a-uuid', 'uuid', 'uuidField');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].code).toBe(ValidationErrorCode.INVALID_FORMAT);
    });

    it('should validate color format', () => {
      const validResult = validateSpecialFormat('#FF0000', 'color', 'colorField');
      expect(validResult.isValid).toBe(true);

      const invalidResult = validateSpecialFormat('red', 'color', 'colorField');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors[0].code).toBe(ValidationErrorCode.INVALID_FORMAT);
    });

    it('should warn about unknown formats', () => {
      const result = validateSpecialFormat('value', 'unknown-format', 'testField');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe(ValidationWarningCode.DEPRECATED_FIELD);
    });
  });

  describe('applyDefaultValues', () => {
    it('should apply default values for missing fields', () => {
      const fieldValues = {
        email: 'test@example.com',
        // age is missing, should get default value 18
        // status is missing, should get default value 'active'
      };

      const result = applyDefaultValues(fieldValues, mockFieldDefinitions);

      expect(result.email).toBe('test@example.com');
      expect(result.age).toBe(18); // parsed from string '18'
      expect(result.status).toBe('active');
      expect(result.preferences).toEqual({}); // parsed from string '{}'
    });

    it('should not override existing values', () => {
      const fieldValues = {
        email: 'test@example.com',
        age: 30,
        status: 'inactive',
      };

      const result = applyDefaultValues(fieldValues, mockFieldDefinitions);

      expect(result.email).toBe('test@example.com');
      expect(result.age).toBe(30); // not overridden
      expect(result.status).toBe('inactive'); // not overridden
    });

    it('should skip inactive fields', () => {
      const inactiveFieldDefinitions = [
        {
          ...mockFieldDefinitions[0],
          is_active: false,
          default_value: 'should-not-apply',
        },
      ];

      const result = applyDefaultValues({}, inactiveFieldDefinitions);

      expect(result).toEqual({});
    });
  });

  describe('sanitizeFieldValue', () => {
    it('should sanitize text values', () => {
      const result = sanitizeFieldValue('  hello world  ', 'text');
      expect(result).toBe('hello world');
    });

    it('should limit text length', () => {
      const longText = 'a'.repeat(VALIDATION_LIMITS.MAX_STRING_LENGTH + 100);
      const result = sanitizeFieldValue(longText, 'text');
      expect(result.length).toBe(VALIDATION_LIMITS.MAX_STRING_LENGTH);
    });

    it('should sanitize numbers', () => {
      const result = sanitizeFieldValue('42', 'number');
      expect(result).toBe(42);
    });

    it('should handle invalid numbers', () => {
      const result = sanitizeFieldValue('not-a-number', 'number');
      expect(result).toBe(0);
    });

    it('should clamp numbers to limits', () => {
      const tooLarge = VALIDATION_LIMITS.MAX_NUMBER + 1000;
      const result = sanitizeFieldValue(tooLarge, 'number');
      expect(result).toBe(VALIDATION_LIMITS.MAX_NUMBER);
    });

    it('should parse JSON strings', () => {
      const result = sanitizeFieldValue('{"key": "value"}', 'json');
      expect(result).toEqual({ key: 'value' });
    });

    it('should handle invalid JSON', () => {
      const result = sanitizeFieldValue('invalid json', 'json');
      expect(result).toEqual({});
    });
  });

  describe('formatValidationErrors', () => {
    it('should format validation errors for users', () => {
      const errors = [
        {
          field: 'email',
          code: ValidationErrorCode.REQUIRED_FIELD_MISSING,
          message: 'Required field missing',
          value: undefined,
        },
        {
          field: 'age',
          code: ValidationErrorCode.VALUE_TOO_LARGE,
          message: 'Value too large',
          value: 200,
          context: { max: 150 },
        },
        {
          field: 'status',
          code: ValidationErrorCode.INVALID_OPTION,
          message: 'Invalid option',
          value: 'invalid',
          context: { options: ['active', 'inactive'] },
        },
      ];

      const formatted = formatValidationErrors(errors);

      expect(formatted).toHaveLength(3);
      expect(formatted[0]).toBe('email: This field is required');
      expect(formatted[1]).toBe('age: Must be at most 150 characters');
      expect(formatted[2]).toBe('status: Must be one of: active, inactive');
    });
  });

  describe('VALIDATION_PATTERNS', () => {
    it('should have working regex patterns', () => {
      expect(VALIDATION_PATTERNS.EMAIL.test('test@example.com')).toBe(true);
      expect(VALIDATION_PATTERNS.EMAIL.test('invalid-email')).toBe(false);

      expect(VALIDATION_PATTERNS.URL.test('https://example.com')).toBe(true);
      expect(VALIDATION_PATTERNS.URL.test('not-a-url')).toBe(false);

      expect(VALIDATION_PATTERNS.PHONE.test('+1234567890')).toBe(true);
      expect(VALIDATION_PATTERNS.PHONE.test('invalid-phone')).toBe(false);

      expect(VALIDATION_PATTERNS.UUID.test('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(VALIDATION_PATTERNS.UUID.test('not-a-uuid')).toBe(false);

      expect(VALIDATION_PATTERNS.COLOR_HEX.test('#FF0000')).toBe(true);
      expect(VALIDATION_PATTERNS.COLOR_HEX.test('red')).toBe(false);

      expect(VALIDATION_PATTERNS.IPV4.test('192.168.1.1')).toBe(true);
      expect(VALIDATION_PATTERNS.IPV4.test('not-an-ip')).toBe(false);
    });
  });
});
