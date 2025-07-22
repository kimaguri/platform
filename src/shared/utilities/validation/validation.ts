import { APIError } from 'encore.dev/api';

// Enhanced validation schemas using TypeScript for automatic Encore TS validation

// Enum definitions for type safety
export enum EntityType {
  CONTACTS = 'contacts',
  LEADS = 'leads',
  DEALS = 'deals',
  TASKS = 'tasks',
  NOTES = 'notes',
  CUSTOM = 'custom',
}

export enum FieldType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  JSON = 'json',
  EMAIL = 'email',
  URL = 'url',
  TEXT = 'text',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SERVICE = 'service',
  VIEWER = 'viewer',
}

// Validation interfaces that Encore TS will automatically validate
export interface CreateDefinitionSchema {
  entityType: EntityType;
  fieldName: string; // min: 1, max: 100, pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/
  fieldType: FieldType;
  isRequired?: boolean;
  defaultValue?: any;
  validation?: ValidationRules;
}

export interface ValidationRules {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  enum?: string[];
  customRule?: string;
}

export interface EntityDataSchema {
  id?: string;
  [key: string]: any; // Dynamic fields based on entity definition
}

export interface UpdateEntitySchema {
  [key: string]: any; // Partial update data
}

export interface PaginationSchema {
  limit?: number; // min: 1, max: 1000, default: 100
  offset?: number; // min: 0, default: 0
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RealtimeSubscriptionSchema {
  entity: EntityType;
  action?: 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  filters?: Record<string, any>;
}

// Validation utility functions
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Field name validation
export function validateFieldName(fieldName: string): void {
  if (!fieldName || fieldName.length === 0) {
    throw new ValidationError('Field name is required', 'fieldName');
  }

  if (fieldName.length > 100) {
    throw new ValidationError('Field name must be 100 characters or less', 'fieldName');
  }

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldName)) {
    throw new ValidationError(
      'Field name must start with letter or underscore and contain only letters, numbers, and underscores',
      'fieldName'
    );
  }

  // Reserved field names
  const reservedNames = ['id', 'created_at', 'updated_at', 'tenant_id', 'user_id'];
  if (reservedNames.includes(fieldName.toLowerCase())) {
    throw new ValidationError(`Field name '${fieldName}' is reserved`, 'fieldName');
  }
}

// Entity name validation
export function validateEntityName(entityName: string): void {
  if (!entityName || entityName.length === 0) {
    throw new ValidationError('Entity name is required', 'entity');
  }

  if (entityName.length > 50) {
    throw new ValidationError('Entity name must be 50 characters or less', 'entity');
  }

  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(entityName)) {
    throw new ValidationError(
      'Entity name must start with letter and contain only letters, numbers, and underscores',
      'entity'
    );
  }
}

// Data validation based on field type
export function validateFieldValue(
  value: any,
  fieldType: FieldType,
  rules?: ValidationRules
): void {
  if (value === null || value === undefined) {
    return; // Null/undefined handled by isRequired check
  }

  switch (fieldType) {
    case FieldType.STRING:
    case FieldType.TEXT:
      if (typeof value !== 'string') {
        throw new ValidationError(`Value must be a string`);
      }
      if (rules?.minLength && value.length < rules.minLength) {
        throw new ValidationError(`Value must be at least ${rules.minLength} characters`);
      }
      if (rules?.maxLength && value.length > rules.maxLength) {
        throw new ValidationError(`Value must be at most ${rules.maxLength} characters`);
      }
      if (rules?.pattern && !new RegExp(rules.pattern).test(value)) {
        throw new ValidationError(`Value does not match required pattern`);
      }
      break;

    case FieldType.NUMBER:
      if (typeof value !== 'number' || isNaN(value)) {
        throw new ValidationError(`Value must be a valid number`);
      }
      if (rules?.min !== undefined && value < rules.min) {
        throw new ValidationError(`Value must be at least ${rules.min}`);
      }
      if (rules?.max !== undefined && value > rules.max) {
        throw new ValidationError(`Value must be at most ${rules.max}`);
      }
      break;

    case FieldType.BOOLEAN:
      if (typeof value !== 'boolean') {
        throw new ValidationError(`Value must be true or false`);
      }
      break;

    case FieldType.DATE:
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new ValidationError(`Value must be a valid date`);
      }
      break;

    case FieldType.EMAIL:
      if (typeof value !== 'string') {
        throw new ValidationError(`Email must be a string`);
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new ValidationError(`Value must be a valid email address`);
      }
      break;

    case FieldType.URL:
      if (typeof value !== 'string') {
        throw new ValidationError(`URL must be a string`);
      }
      try {
        new URL(value);
      } catch {
        throw new ValidationError(`Value must be a valid URL`);
      }
      break;

    case FieldType.JSON:
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
        } catch {
          throw new ValidationError(`Value must be valid JSON`);
        }
      } else if (typeof value !== 'object') {
        throw new ValidationError(`Value must be a valid JSON object or string`);
      }
      break;

    default:
      throw new ValidationError(`Unknown field type: ${fieldType}`);
  }

  // Enum validation
  if (rules?.enum && !rules.enum.includes(String(value))) {
    throw new ValidationError(`Value must be one of: ${rules.enum.join(', ')}`);
  }
}

// Validate entire entity data against definitions
export function validateEntityData(
  data: Record<string, any>,
  definitions: Array<{
    field_name: string;
    field_type: FieldType;
    is_required: boolean;
    validation?: ValidationRules;
  }>
): void {
  // Check required fields
  for (const def of definitions) {
    if (def.is_required && (data[def.field_name] === undefined || data[def.field_name] === null)) {
      throw new ValidationError(`Field '${def.field_name}' is required`, def.field_name);
    }
  }

  // Validate provided fields
  for (const [fieldName, value] of Object.entries(data)) {
    const definition = definitions.find((def) => def.field_name === fieldName);

    if (!definition) {
      // Allow standard fields
      if (!['id', 'created_at', 'updated_at'].includes(fieldName)) {
        console.warn(`Unknown field '${fieldName}' in entity data`);
      }
      continue;
    }

    try {
      validateFieldValue(value, definition.field_type, definition.validation);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(error.message, fieldName);
      }
      throw error;
    }
  }
}

// Convert validation errors to Encore API errors
export function toAPIError(error: ValidationError): void {
  const errorMessage = error.field ? `${error.field}: ${error.message}` : error.message;

  throw APIError.invalidArgument(errorMessage);
}
