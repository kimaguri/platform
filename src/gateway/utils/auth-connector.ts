/**
 * AuthConnector - универсальный подход для работы с аутентификацией
 * Централизует логику аутентификации в Gateway
 * Функциональный подход без классов (следуя принципам Encore.ts)
 */

import { createClient } from '@supabase/supabase-js';
import { getTenantConfigById } from '../../lib/config/tenantConfig';

type AuthProviderType = 'supabase' | 'clerk';

interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceKey: string;
}

interface ClerkConfig {
  publishableKey: string;
  secretKey: string;
  jwtKey?: string;
}

interface AuthProviderConfig {
  type: AuthProviderType;
  supabase?: SupabaseConfig;
  clerk?: ClerkConfig;
}

interface AuthRequest {
  tenantId: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
}

interface RefreshTokenRequest {
  tenantId: string;
  refreshToken: string;
}

interface AuthResponse {
  token: string;
  refreshToken?: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    role: string;
  };
}

interface LogoutRequest {
  tenantId: string;
  token: string;
}

interface ResetPasswordRequest {
  tenantId: string;
  email: string;
}

// Кэш для конфигураций и клиентов
const authConfigs = new Map<string, AuthProviderConfig>();
const supabaseClients = new Map<string, any>();

/**
 * Получить конфигурацию auth провайдера для тенанта
 */
async function getAuthConfig(tenantId: string): Promise<AuthProviderConfig> {
  if (authConfigs.has(tenantId)) {
    return authConfigs.get(tenantId)!;
  }

  const tenantConfig = await getTenantConfigById(tenantId);
  if (!tenantConfig) {
    throw new Error('Tenant not found or inactive');
  }

  // Определяем тип провайдера из конфигурации
  // По умолчанию используем Supabase для обратной совместимости
  const providerType: AuthProviderType = (tenantConfig as any).connector_type || 'supabase';

  let authConfig: AuthProviderConfig;

  if (providerType === 'clerk') {
    authConfig = {
      type: 'clerk',
      clerk: {
        publishableKey: (tenantConfig as any).CLERK_PUBLISHABLE_KEY || '',
        secretKey: (tenantConfig as any).CLERK_SECRET_KEY || '',
        jwtKey: (tenantConfig as any).CLERK_JWT_KEY,
      },
    };
  } else {
    // Supabase конфигурация (по умолчанию)
    authConfig = {
      type: 'supabase',
      supabase: {
        url: tenantConfig.SUPABASE_URL,
        anonKey: tenantConfig.ANON_KEY,
        serviceKey: tenantConfig.SERVICE_KEY,
      },
    };
  }

  authConfigs.set(tenantId, authConfig);
  return authConfig;
}

/**
 * Получить или создать Supabase клиент для тенанта
 */
async function getSupabaseClient(tenantId: string) {
  if (supabaseClients.has(tenantId)) {
    return supabaseClients.get(tenantId)!;
  }

  const authConfig = await getAuthConfig(tenantId);
  if (authConfig.type !== 'supabase' || !authConfig.supabase) {
    throw new Error('Supabase not configured for this tenant');
  }

  const client = createClient(authConfig.supabase.url, authConfig.supabase.anonKey);
  supabaseClients.set(tenantId, client);
  return client;
}

/**
 * Получить профиль пользователя (заглушка - в реальности через ResourceResolver)
 */
async function getUserProfile(tenantId: string, userId: string): Promise<any> {
  // TODO: Использовать ResourceResolver для получения профиля
  // const profiles = await queryResource(tenantId, 'profiles', { id: userId });
  // return profiles?.[0] || null;
  return {
    id: userId,
    role: 'user', // По умолчанию
    firstName: null,
    lastName: null,
    displayName: null,
  };
}

/**
 * Преобразовать Supabase пользователя в AuthUser
 */
function mapToAuthUser(tenantId: string, supabaseUser: any, profile: any) {
  const resolvedProfile = profile || { role: 'user', firstName: null, lastName: null, displayName: supabaseUser.email };
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    firstName: resolvedProfile.firstName,
    lastName: resolvedProfile.lastName,
    displayName: resolvedProfile.displayName || supabaseUser.email,
    role: resolvedProfile.role,
  };
}

/**
 * Преобразовать данные аутентификации в AuthResponse
 */
function mapToAuthResponse(tenantId: string, authData: any): AuthResponse {
  const user = mapToAuthUser(tenantId, authData.user, null);
  
  return {
    token: authData.session?.access_token,
    refreshToken: authData.session?.refresh_token,
    expiresAt: new Date(authData.session?.expires_at * 1000).toISOString(),
    user,
  };
}

/**
 * Логин пользователя
 */
export async function login(request: AuthRequest): Promise<AuthResponse> {
  const config = await getAuthConfig(request.tenantId);

  if (config.type === 'clerk') {
    // TODO: Реализовать Clerk логин
    throw new Error('Clerk authentication not implemented yet');
  } else {
    // Supabase логин
    const supabase = await getSupabaseClient(request.tenantId);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: request.email,
      password: request.password,
    });

    if (authError || !authData?.user) {
      throw new Error(`Login failed: ${authError?.message || 'Unknown error'}`);
    }

    // Получаем профиль пользователя
    const profile = await getUserProfile(request.tenantId, authData.user.id);
    return mapToAuthResponse(request.tenantId, authData);
  }
}

/**
 * Регистрация пользователя
 */
export async function register(request: AuthRequest): Promise<AuthResponse> {
  const config = await getAuthConfig(request.tenantId);

  if (config.type === 'clerk') {
    // TODO: Реализовать Clerk регистрацию
    throw new Error('Clerk authentication not implemented yet');
  } else {
    // Supabase регистрация
    const supabase = await getSupabaseClient(request.tenantId);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: request.email,
      password: request.password,
      options: {
        data: {
          firstName: request.firstName,
          lastName: request.lastName,
          displayName: request.displayName || `${request.firstName} ${request.lastName}`,
        },
      },
    });

    if (authError || !authData?.user) {
      throw new Error(`Registration failed: ${authError?.message || 'Unknown error'}`);
    }

    // Создаем профиль пользователя в базе
    // TODO: Создать профиль через ResourceResolver
    const profile = {
      id: authData.user.id,
      email: authData.user.email,
      firstName: request.firstName,
      lastName: request.lastName,
      displayName: request.displayName || `${request.firstName} ${request.lastName}`,
      role: 'user',
    };

    return mapToAuthResponse(request.tenantId, authData);
  }
}

/**
 * Обновление токена
 */
export async function refreshToken(request: RefreshTokenRequest): Promise<AuthResponse> {
  const config = await getAuthConfig(request.tenantId);

  if (config.type === 'clerk') {
    // TODO: Реализовать Clerk refresh
    throw new Error('Clerk authentication not implemented yet');
  } else {
    // Supabase refresh
    const supabase = await getSupabaseClient(request.tenantId);
    const { data: authData, error: authError } = await supabase.auth.refreshSession({
      refresh_token: request.refreshToken,
    });

    if (authError || !authData?.user) {
      throw new Error(`Token refresh failed: ${authError?.message || 'Unknown error'}`);
    }

    return mapToAuthResponse(request.tenantId, authData);
  }
}

/**
 * Выход пользователя
 */
export async function logout(request: LogoutRequest): Promise<{ success: boolean }> {
  const config = await getAuthConfig(request.tenantId);

  if (config.type === 'clerk') {
    // TODO: Реализовать Clerk logout
    return { success: true };
  } else {
    // Supabase logout
    const supabase = await getSupabaseClient(request.tenantId);
    await supabase.auth.signOut();
    return { success: true };
  }
}

/**
 * Сброс пароля
 */
export async function resetPassword(request: ResetPasswordRequest): Promise<{ success: boolean }> {
  const config = await getAuthConfig(request.tenantId);

  if (config.type === 'clerk') {
    // TODO: Реализовать Clerk reset password
    return { success: true };
  } else {
    // Supabase reset password
    const supabase = await getSupabaseClient(request.tenantId);
    await supabase.auth.resetPasswordForEmail(request.email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    });
    return { success: true };
  }
}

/**
 * Очистить кэш (для тестирования)
 */
export function clearCache(): void {
  authConfigs.clear();
  supabaseClients.clear();
}
