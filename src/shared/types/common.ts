// Общие типы для API и сущностей

export interface ExtensionDefinition {
  id?: string;
  entity_type: string;
  field_name: string;
  field_type: string;
  is_required: boolean;
  default_value?: any;
  validation?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

// Простой тип для данных сущности
export type EntityData = Record<string, any>;

// Упрощенные типы ответов для совместимости с Encore TS
export interface SuccessResponse<T> {
  data: T;
  message: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
}

// Базовый интерфейс ответа API
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message: string;
}
