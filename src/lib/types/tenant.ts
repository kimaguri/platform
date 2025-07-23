// Типы для мульти-тенантности

export interface TenantConfig {
  SUPABASE_URL: string;
  ANON_KEY: string;
  SERVICE_KEY: string;
}

export interface TenantsConfig {
  [tenantId: string]: TenantConfig;
}

// Расширение контекста запроса для Encore
declare module 'encore.dev/api' {
  interface RequestContext {
    tenantId: string;
  }
}
