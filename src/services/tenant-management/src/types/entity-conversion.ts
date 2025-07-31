/**
 * Типы для Entity Conversion Rules
 * Основаны на архитектуре extensible-fields с расширениями для конвертации
 */

// Базовые типы для условий срабатывания
export interface TriggerCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in' | 'not_in' | 'is_null' | 'is_not_null';
  value?: any;
}

export interface LogicalCondition {
  and?: (TriggerCondition | LogicalCondition)[];
  or?: (TriggerCondition | LogicalCondition)[];
}

export type TriggerConditions = TriggerCondition | LogicalCondition;

// Маппинг полей
export interface FieldMapping {
  [sourceField: string]: string; // targetField
}

export interface ExtensionFieldMapping {
  [sourceExtensionField: string]: string; // targetExtensionField
}

// Настройки конвертации
export interface ConversionSettings {
  preserve_source?: boolean;
  allow_rollback?: boolean;
  copy_activities?: boolean;
  copy_watchers?: boolean;
  auto_conversion_enabled?: boolean;
  manual_conversion_enabled?: boolean;
}

// Настройки системы одобрений (для будущей интеграции с Proo Business Logics)
export interface ApprovalSettings {
  requires_approval?: boolean;
  approval_roles?: string[];
  approval_workflow_id?: string | null;
}

// Значения по умолчанию для целевой сущности
export interface DefaultValues {
  [fieldName: string]: any;
}

// Основной интерфейс правила конвертации
export interface EntityConversionRule {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  is_active: boolean;
  source_entity: string;
  target_entity: string;
  trigger_conditions: TriggerConditions;
  field_mapping: FieldMapping;
  extension_field_mapping: ExtensionFieldMapping;
  conversion_settings: ConversionSettings;
  target_name_template?: string;
  default_values: DefaultValues;
  approval_settings: ApprovalSettings;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// Типы для создания и обновления правил
export interface CreateEntityConversionRuleRequest {
  name: string;
  description?: string;
  is_active?: boolean;
  source_entity: string;
  target_entity: string;
  trigger_conditions?: TriggerConditions;
  field_mapping?: FieldMapping;
  extension_field_mapping?: ExtensionFieldMapping;
  conversion_settings?: ConversionSettings;
  target_name_template?: string;
  default_values?: DefaultValues;
  approval_settings?: ApprovalSettings;
}

export interface UpdateEntityConversionRuleRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
  source_entity?: string;
  target_entity?: string;
  trigger_conditions?: TriggerConditions;
  field_mapping?: FieldMapping;
  extension_field_mapping?: ExtensionFieldMapping;
  conversion_settings?: ConversionSettings;
  target_name_template?: string;
  default_values?: DefaultValues;
  approval_settings?: ApprovalSettings;
}

// Типы для фильтрации и поиска
export interface EntityConversionRuleFilter {
  tenant_id?: string;
  source_entity?: string;
  target_entity?: string;
  is_active?: boolean;
  name?: string;
}

// Результат выполнения конвертации
export interface ConversionResult {
  success: boolean;
  source_record_id: string;
  target_record_id?: string;
  rule_id: string;
  error_message?: string;
  warnings?: string[];
  converted_fields: string[];
  skipped_fields: string[];
  created_at: string;
}

// Статистика использования правил конвертации
export interface ConversionRuleStats {
  rule_id: string;
  rule_name: string;
  total_conversions: number;
  successful_conversions: number;
  failed_conversions: number;
  last_conversion_at?: string;
  avg_conversion_time_ms?: number;
}

// Доступные сущности для конвертации
export interface AvailableEntity {
  entity_name: string;
  display_name: string;
  fields: EntityField[];
  extension_fields: ExtensionField[];
}

export interface EntityField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface ExtensionField {
  id: string;
  name: string;
  field_type: string;
  required: boolean;
  description?: string;
}

// Предложения для умного маппинга полей
export interface FieldMappingSuggestion {
  source_field: string;
  target_field: string;
  confidence_score: number; // 0-100
  match_type: 'exact' | 'similar' | 'semantic' | 'type_compatible';
  description?: string;
}

export interface ExtensionFieldMappingSuggestion {
  source_extension_field: string;
  target_extension_field: string;
  confidence_score: number;
  match_type: 'exact' | 'similar' | 'semantic' | 'type_compatible';
  description?: string;
}

// Результат анализа для умного маппинга
export interface MappingSuggestions {
  field_suggestions: FieldMappingSuggestion[];
  extension_field_suggestions: ExtensionFieldMappingSuggestion[];
  unmapped_source_fields: string[];
  unmapped_target_fields: string[];
}
