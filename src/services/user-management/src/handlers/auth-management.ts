import { api, Header } from 'encore.dev/api';
import { ConnectorRegistry } from '../../../../connectors/registry/connector-registry';
import { ResourceResolver } from '../../../../connectors/registry/resource-resolver';
import { getTenantConfigById } from '../../../../shared/tenantConfig';
import { getSupabaseAnonClient } from '../../../../shared/supabaseClient';
import { ApiResponse } from '../../../../shared/types';
import type {
  AuthRequest,
  RegisterRequest,
  LoginResponse,
  RegisterResponse,
  ResetPasswordRequest,
} from '../models/user';

// Initialize connector system
const connectorRegistry = new ConnectorRegistry();
const resourceResolver = new ResourceResolver(connectorRegistry);

// Helper function to get tenant config for connectors
async function getTenantConnectorConfig(tenantId: string) {
  const tenantConfig = await getTenantConfigById(tenantId);
  return {
    connectorType: 'supabase',
    config: {
      url: tenantConfig.SUPABASE_URL,
      key: tenantConfig.ANON_KEY,
    },
  };
}

interface AuthRequestWithHeader {
  tenantId: Header<'X-Tenant-ID'>;
  email: string;
  password: string;
}

interface RegisterRequestWithHeader extends AuthRequestWithHeader {
  userData?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
}

/**
 * Вход пользователя в систему
 */
export const login = api(
  { method: 'POST', path: '/auth/login', expose: true },
  async ({ tenantId, email, password }: AuthRequestWithHeader): Promise<ApiResponse<any>> => {
    try {
      const supabase = await getSupabaseAnonClient(tenantId);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          error: error.message,
          message: 'Login failed',
        };
      }

      return {
        data: {
          ...data,
          accessToken: data.session?.access_token,
        },
        message: 'Login successful',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Login failed',
        message: 'Login failed',
      };
    }
  }
);

/**
 * Регистрация нового пользователя
 */
export const register = api(
  { method: 'POST', path: '/auth/register', expose: true },
  async ({
    tenantId,
    email,
    password,
    userData,
  }: RegisterRequestWithHeader): Promise<ApiResponse<any>> => {
    try {
      const supabase = await getSupabaseAnonClient(tenantId);

      // Регистрируем пользователя в Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData || {},
        },
      });

      if (error) {
        return {
          error: error.message,
          message: 'Registration failed',
        };
      }

      // Если пользователь создан и есть дополнительные данные профиля, создаем профиль
      if (data.user && userData) {
        try {
          await resourceResolver.createResource(
            tenantId,
            'user_profiles',
            {
              user_id: data.user.id,
              first_name: userData.first_name,
              last_name: userData.last_name,
              phone: userData.phone,
              role: 'user', // Роль по умолчанию
              permissions: ['read'], // Права по умолчанию
            },
            getTenantConnectorConfig
          );
        } catch (profileError) {
          console.error('Failed to create user profile:', profileError);
          // Не прерываем регистрацию из-за ошибки профиля
        }
      }

      return {
        data,
        message: 'Registration successful',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Registration failed',
        message: 'Registration failed',
      };
    }
  }
);

/**
 * Выход из системы
 */
export const logout = api(
  { method: 'POST', path: '/auth/logout', expose: true },
  async ({ tenantId }: { tenantId: Header<'X-Tenant-ID'> }): Promise<ApiResponse<null>> => {
    try {
      const supabase = await getSupabaseAnonClient(tenantId);
      const { error } = await supabase.auth.signOut();

      if (error) {
        return {
          error: error.message,
          message: 'Logout failed',
        };
      }

      return {
        data: null,
        message: 'Logout successful',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Logout failed',
        message: 'Logout failed',
      };
    }
  }
);

/**
 * Сброс пароля
 */
export const resetPassword = api(
  { method: 'POST', path: '/auth/reset-password', expose: true },
  async ({
    tenantId,
    email,
  }: {
    tenantId: Header<'X-Tenant-ID'>;
    email: string;
  }): Promise<ApiResponse<null>> => {
    try {
      const supabase = await getSupabaseAnonClient(tenantId);
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        return {
          error: error.message,
          message: 'Password reset failed',
        };
      }

      return {
        data: null,
        message: 'Password reset email sent',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Password reset failed',
        message: 'Password reset failed',
      };
    }
  }
);

/**
 * Обновление пароля
 */
export const updatePassword = api(
  { method: 'PUT', path: '/auth/update-password', expose: true },
  async ({
    tenantId,
    password,
  }: {
    tenantId: Header<'X-Tenant-ID'>;
    password: string;
  }): Promise<ApiResponse<any>> => {
    try {
      const supabase = await getSupabaseAnonClient(tenantId);
      const { data, error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        return {
          error: error.message,
          message: 'Password update failed',
        };
      }

      return {
        data,
        message: 'Password updated successfully',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Password update failed',
        message: 'Password update failed',
      };
    }
  }
);
