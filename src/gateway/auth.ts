import { APIError, Header, Gateway } from 'encore.dev/api';
import { authHandler } from 'encore.dev/auth';
import { hasTenantConfig, getTenantConfigById } from '../lib/utils/tenant-config';
import { createClient } from '@supabase/supabase-js';

// Auth parameters that Encore will parse from the request
export interface AuthParams {
  authorization: Header<'Authorization'>; // Bearer token or API key
  tenantId: Header<'X-Tenant-ID'>; // Required tenant ID
}

// Auth data that will be available to all authenticated endpoints
export interface AuthData {
  userID: string;
  tenantId: string;
  userEmail?: string;
  userRole?: string;
  tokenType: 'jwt' | 'api_key';
}

/**
 * Encore.ts Authentication Handler
 * This function is called for all endpoints marked with auth: true
 * It validates JWT tokens, API keys, and ensures tenant access
 */
export const auth = authHandler<AuthParams, AuthData>(
  async (params: AuthParams): Promise<AuthData> => {
    const { authorization, tenantId } = params;

    // Validate tenant ID is provided
    if (!tenantId) {
      throw APIError.invalidArgument('X-Tenant-ID header is required');
    }

    // Validate tenant exists and is active
    const hasConfig = await hasTenantConfig(tenantId);
    if (!hasConfig) {
      throw APIError.notFound(`Tenant '${tenantId}' not found or inactive`);
    }

    // Parse authorization header
    if (!authorization) {
      throw APIError.unauthenticated('Authorization header is required');
    }

    const authHeader = authorization;
    let tokenType: 'jwt' | 'api_key';
    let token: string;

    if (authHeader.startsWith('Bearer ')) {
      tokenType = 'jwt';
      token = authHeader.substring(7);
    } else if (authHeader.startsWith('ApiKey ')) {
      tokenType = 'api_key';
      token = authHeader.substring(7);
    } else {
      throw APIError.unauthenticated(
        'Invalid authorization format. Use "Bearer <token>" or "ApiKey <key>"'
      );
    }

    try {
      if (tokenType === 'jwt') {
        return await validateJWTToken(token, tenantId);
      } else {
        return await validateApiKey(token, tenantId);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      throw APIError.unauthenticated('Invalid or expired token');
    }
  }
);

/**
 * Validates JWT token against tenant's Supabase
 */
async function validateJWTToken(token: string, tenantId: string): Promise<AuthData> {
  const config = await getTenantConfigById(tenantId);
  const supabase = createClient(config.SUPABASE_URL, config.ANON_KEY);

  // Verify JWT token with Supabase
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error('Invalid JWT token');
  }

  return {
    userID: user.id,
    tenantId,
    userEmail: user.email,
    userRole: user.user_metadata?.role || 'user',
    tokenType: 'jwt',
  };
}

/**
 * Validates API key (for service-to-service communication)
 */
async function validateApiKey(apiKey: string, tenantId: string): Promise<AuthData> {
  const config = await getTenantConfigById(tenantId);

  // In a real implementation, you'd validate the API key against a database
  // For now, we'll check if it matches the service key (for admin operations)
  if (apiKey === config.SERVICE_KEY) {
    return {
      userID: 'service',
      tenantId,
      tokenType: 'api_key',
      userRole: 'service',
    };
  }

  throw new Error('Invalid API key');
}

/**
 * Encore.ts Gateway with Authentication Handler
 * This configures the API Gateway to use our auth handler
 */
export const gateway = new Gateway({
  authHandler: auth,
});
