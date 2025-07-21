import { api, Header } from 'encore.dev/api';
import { getSupabaseAnonClient } from '../../../src/shared/supabaseClient';
import { ApiResponse } from '../../../src/shared/types';
import { gateway } from '../../../src/shared/auth';

interface AuthRequest {
  tenantId: Header<'X-Tenant-ID'>; // Получаем tenant ID из заголовка
  email: string;
  password: string;
}

interface LoginResponse extends ApiResponse {
  data?: {
    user: any;
    session: any;
    accessToken?: string;
  };
}

interface RegisterResponse extends ApiResponse {
  data?: {
    user: any;
    session: any;
  };
}

export const login = api(
  { method: 'POST', path: '/auth/login', expose: true },
  async ({ tenantId, email, password }: AuthRequest): Promise<LoginResponse> => {
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

export const register = api(
  { method: 'POST', path: '/auth/register', expose: true },
  async ({ tenantId, email, password }: AuthRequest): Promise<RegisterResponse> => {
    try {
      const supabase = await getSupabaseAnonClient(tenantId);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return {
          error: error.message,
          message: 'Registration failed',
        };
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
