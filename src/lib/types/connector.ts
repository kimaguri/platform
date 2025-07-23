// Типы для системы коннекторов

export interface ConnectionConfig {
  url: string;
  key: string;
  type?: string; // Тип коннектора
  options?: Record<string, any>;
}

export interface QueryParams {
  select?: string;
  filter?: Record<string, any>;
  limit?: number;
  offset?: number;
  orderBy?: string;
}

export interface ResourceConfig {
  connector: string;
  resourcePath: string;
  config: Record<string, any>;
}

export interface ZoneConfig {
  validation: string;
  helpers: string;
  middleware: string;
}

export interface ZoneUtilities {
  validation: any;
  helpers: any;
  middleware: any;
}
