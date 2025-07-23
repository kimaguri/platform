// import { secret } from 'encore.dev/config'; // Убираем, так как не используем Encore Cloud

// Используем обычные переменные окружения вместо Encore secrets
// These environment variables are resolved at runtime

// Administrative Supabase configuration
// export const adminSupabaseUrl = secret('AdminSupabaseUrl');
// export const adminSupabaseServiceKey = secret('AdminSupabaseServiceKey');

// Service-to-service API key for internal communication
// export const serviceApiKey = secret('ServiceApiKey');

// Tenant configurations (fallback for environment-based setup)
// export const tenantConfigSecret = secret('TenantConfig');

// Helper functions to get environment variables
export function getAdminSupabaseUrl(): string {
  return process.env.ADMIN_SUPABASE_URL || '';
}

export function getAdminSupabaseServiceKey(): string {
  return process.env.ADMIN_SUPABASE_SERVICE_KEY || '';
}

export function getServiceApiKey(): string {
  return process.env.SERVICE_API_KEY || '';
}

export function getTenantConfigSecret(): string {
  return process.env.TENANT_CONFIG || '{}';
}

// Parse tenant configuration from environment variable
export function parseSecretTenantConfig(): Record<string, any> {
  try {
    const configString = getTenantConfigSecret();
    return JSON.parse(configString);
  } catch (error) {
    console.warn('Failed to parse tenant config from environment variable:', error);
    return {};
  }
}
