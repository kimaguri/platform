import { Header, Gateway } from 'encore.dev/api';
import { authHandler } from 'encore.dev/auth';
import { APIError } from 'encore.dev/api';
import { hasTenantConfig, getTenantConfigById } from '../shared/utilities/tenant-config';
import { createClient } from '@supabase/supabase-js';

// AuthParams specifies the incoming request information
// the auth handler is interested in
interface AuthParams {
  authorization: Header<'Authorization'>;
  tenantId: Header<'X-Tenant-ID'>;
}

// AuthData specifies the information about the authenticated user
// that the auth handler makes available throughout the application
export interface AuthData {
  userID: string;
  tenantId: string;
  userEmail?: string;
  role?: string;
  permissions?: string[];
  tokenType: 'jwt' | 'api_key';
  sessionId?: string;
  locale?: string;
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

  // Get user profile with role and permissions
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, permissions, locale')
    .eq('user_id', user.id)
    .single();

  return {
    userID: user.id,
    tenantId,
    userEmail: user.email,
    role: profile?.role || 'user',
    permissions: profile?.permissions || [],
    tokenType: 'jwt',
    locale: profile?.locale || 'en',
  };
}

/**
 * Validates API key (for service-to-service communication)
 */
async function validateApiKey(apiKey: string, tenantId: string): Promise<AuthData> {
  const config = await getTenantConfigById(tenantId);

  // Validate API key against service key (for admin operations)
  if (apiKey === config.SERVICE_KEY) {
    return {
      userID: 'service',
      tenantId,
      tokenType: 'api_key',
      role: 'service',
      permissions: ['*'], // Service has all permissions
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
