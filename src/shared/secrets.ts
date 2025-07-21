import { secret } from 'encore.dev/config';

// Modern secrets management using Encore TS best practices
// These secrets are resolved at runtime and injected securely

// Administrative Supabase configuration
export const adminSupabaseUrl = secret('AdminSupabaseUrl');
export const adminSupabaseServiceKey = secret('AdminSupabaseServiceKey');

// Service-to-service API key for internal communication
export const serviceApiKey = secret('ServiceApiKey');

// Tenant configurations (fallback for environment-based setup)
export const tenantConfigSecret = secret('TenantConfig');

// Helper functions to get secret values
export function getAdminSupabaseUrl(): string {
  return adminSupabaseUrl();
}

export function getAdminSupabaseServiceKey(): string {
  return adminSupabaseServiceKey();
}

export function getServiceApiKey(): string {
  return serviceApiKey();
}

export function getTenantConfigSecret(): string {
  return tenantConfigSecret();
}

// Parse tenant configuration from secret
export function parseSecretTenantConfig(): Record<string, any> {
  try {
    const configString = getTenantConfigSecret();
    return JSON.parse(configString);
  } catch (error) {
    console.warn('Failed to parse tenant config from secret:', error);
    return {};
  }
}
