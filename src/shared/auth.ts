import { Header, Gateway } from 'encore.dev/api';
import { authHandler } from 'encore.dev/auth';
import { APIError } from 'encore.dev/api';
import { getSupabaseAnonClient } from './supabaseClient';

// AuthParams specifies the incoming request information
// the auth handler is interested in. Supports multiple auth methods:
// - JWT tokens via Authorization header
// - Session cookies
// - API keys for service-to-service communication
interface AuthParams {
  authorization?: Header<'Authorization'>;
  tenantId: Header<'X-Tenant-ID'>;
}

// The AuthData specifies the information about the authenticated user
// that the auth handler makes available to all endpoints
export interface AuthData {
  userID: string;
  tenantId: string;
  email?: string;
  role?: string;
  sessionType: 'jwt' | 'session' | 'api_key';
}

// The centralized auth handler for all authentication methods
export const auth = authHandler<AuthParams, AuthData>(async (params): Promise<AuthData> => {
  const { authorization, tenantId } = params;

  if (!tenantId) {
    throw APIError.unauthenticated('Tenant ID is required');
  }

  if (!authorization) {
    throw APIError.unauthenticated('Authorization is required');
  }

  try {
    // Handle different authentication methods
    if (authorization.startsWith('Bearer ')) {
      // JWT Token authentication
      const token = authorization.replace('Bearer ', '');
      return await authenticateJWT(token, tenantId);
    } else if (authorization.startsWith('ApiKey ')) {
      // API Key authentication for service-to-service
      const apiKey = authorization.replace('ApiKey ', '');
      return await authenticateApiKey(apiKey, tenantId);
    } else {
      throw APIError.unauthenticated('Invalid authorization format');
    }
  } catch (error) {
    console.error('Authentication error:', error);
    throw APIError.unauthenticated('Authentication failed');
  }
});

// JWT Token authentication using Supabase
async function authenticateJWT(token: string, tenantId: string): Promise<AuthData> {
  try {
    const supabase = await getSupabaseAnonClient(tenantId);

    // Set the JWT session in Supabase client
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw APIError.unauthenticated('Invalid JWT token');
    }

    // Extract user information from JWT token
    return {
      userID: user.id,
      tenantId,
      email: user.email,
      role: user.user_metadata?.role || 'user',
      sessionType: 'jwt',
    };
  } catch (error) {
    throw APIError.unauthenticated('JWT authentication failed');
  }
}

// API Key authentication for service-to-service communication
async function authenticateApiKey(apiKey: string, tenantId: string): Promise<AuthData> {
  try {
    const { getServiceApiKey } = await import('./secrets');
    const validApiKey = getServiceApiKey();

    if (apiKey === validApiKey) {
      return {
        userID: 'service',
        tenantId,
        role: 'service',
        sessionType: 'api_key',
      };
    }
  } catch (error) {
    // Fallback to environment variable for backwards compatibility
    if (apiKey === process.env.SERVICE_API_KEY) {
      return {
        userID: 'service',
        tenantId,
        role: 'service',
        sessionType: 'api_key',
      };
    }
  }

  throw APIError.unauthenticated('Invalid API key');
}

// Create the API Gateway with centralized authentication
export const gateway = new Gateway({
  authHandler: auth,
});

// Helper function to get authenticated user data in endpoints
export { getAuthData } from '~encore/auth';
