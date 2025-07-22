import { api, Header } from 'encore.dev/api';
import { ResourceResolver } from '../../../../connectors/registry/resource-resolver';
import { ConnectorRegistry } from '../../../../connectors/registry/connector-registry';
import { getConnectorType } from '../../../../shared/utilities/connector-helper';
import { getTenantConfigById } from '../../../../shared/utilities/tenant-config';
import { ApiResponse } from '../../../../shared/types';
import type {
  AuthRequest,
  RegisterRequest,
  LoginResponse,
  RegisterResponse,
  ResetPasswordRequest,
} from '../models/user';

// Инициализация системы коннекторов
const registry = new ConnectorRegistry();
const resourceResolver = new ResourceResolver(registry);

// Helper для получения конфигурации тенанта
async function getTenantConnectorConfig(tenantId: string) {
  const connectorType = await getConnectorType(tenantId);
  const config = await getTenantConfigById(tenantId);

  return {
    connectorType,
    config: {
      url: config.SUPABASE_URL,
      key: config.ANON_KEY,
      type: connectorType,
    },
  };
}

// Типы для универсального пользователя
interface UserProfile {
  id?: string;
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: string;
  permissions: string[];
  created_at?: string;
  updated_at?: string;
}

interface AuthSession {
  id?: string;
  user_id: string;
  session_token: string;
  expires_at: string;
  created_at?: string;
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
 * УНИВЕРСАЛЬНАЯ аутентификация - работает с любым коннектором
 * Вместо привязки к Supabase Auth, используем универсальные операции
 */
export const login = api(
  { method: 'POST', path: '/auth/login', expose: true },
  async ({ tenantId, email, password }: AuthRequestWithHeader): Promise<ApiResponse<any>> => {
    try {
      // ✅ УНИВЕРСАЛЬНЫЙ подход - ищем пользователя через ResourceResolver
      const users = await resourceResolver.getResource<UserProfile>(
        tenantId,
        'user_profiles',
        {
          select: 'id,user_id,email,role,permissions',
          filter: { email: email },
        },
        getTenantConnectorConfig
      );

      if (users.length === 0) {
        return {
          error: 'User not found',
          message: 'Login failed',
        };
      }

      const user = users[0];
      if (!user) {
        return {
          error: 'User not found',
          message: 'Login failed',
        };
      }

      // TODO: Здесь должна быть проверка пароля
      // Можно использовать bcrypt или другую универсальную библиотеку
      // const isValidPassword = await bcrypt.compare(password, user.password_hash);

      // Создаем сессию через ResourceResolver
      const sessionToken = generateSessionToken(); // TODO: Реализовать
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 часа

      const session = await resourceResolver.createResource<AuthSession>(
        tenantId,
        'auth_sessions',
        {
          user_id: user.user_id,
          session_token: sessionToken,
          expires_at: expiresAt,
        },
        getTenantConnectorConfig
      );

      return {
        data: {
          user: {
            id: user.user_id,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
          },
          session: {
            token: session.session_token,
            expires_at: session.expires_at,
          },
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
 * УНИВЕРСАЛЬНАЯ регистрация через ResourceResolver
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
      // Проверяем, существует ли уже пользователь
      const existingUsers = await resourceResolver.getResource<UserProfile>(
        tenantId,
        'user_profiles',
        {
          select: 'id',
          filter: { email: email },
        },
        getTenantConnectorConfig
      );

      if (existingUsers.length > 0) {
        return {
          error: 'User already exists',
          message: 'Registration failed',
        };
      }

      // TODO: Хешируем пароль
      // const passwordHash = await bcrypt.hash(password, 10);

      const userId = generateUserId(); // TODO: Реализовать

      // Создаем профиль пользователя через ResourceResolver
      const userProfile = await resourceResolver.createResource<UserProfile>(
        tenantId,
        'user_profiles',
        {
          user_id: userId,
          email: email,
          first_name: userData?.first_name || '',
          last_name: userData?.last_name || '',
          phone: userData?.phone || '',
          role: 'user',
          permissions: ['read'],
        },
        getTenantConnectorConfig
      );

      // Создаем начальную сессию
      const sessionToken = generateSessionToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const session = await resourceResolver.createResource<AuthSession>(
        tenantId,
        'auth_sessions',
        {
          user_id: userId,
          session_token: sessionToken,
          expires_at: expiresAt,
        },
        getTenantConnectorConfig
      );

      return {
        data: {
          user: {
            id: userProfile.user_id,
            email: userProfile.email,
            role: userProfile.role,
            permissions: userProfile.permissions,
          },
          session: {
            token: session.session_token,
            expires_at: session.expires_at,
          },
        },
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
 * УНИВЕРСАЛЬНЫЙ выход - удаляем сессию через ResourceResolver
 */
export const logout = api(
  { method: 'POST', path: '/auth/logout', expose: true, auth: true },
  async ({
    tenantId,
    sessionToken,
  }: {
    tenantId: Header<'X-Tenant-ID'>;
    sessionToken: string;
  }): Promise<ApiResponse<any>> => {
    try {
      // Находим и удаляем сессию
      const sessions = await resourceResolver.getResource<AuthSession>(
        tenantId,
        'auth_sessions',
        {
          select: 'id',
          filter: { session_token: sessionToken },
        },
        getTenantConnectorConfig
      );

      if (sessions.length > 0) {
        const session = sessions[0];
        if (session && session.id) {
          await resourceResolver.deleteResource(
            tenantId,
            'auth_sessions',
            session.id,
            getTenantConnectorConfig
          );
        }
      }

      return {
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
 * УНИВЕРСАЛЬНОЕ получение пользователей через ResourceResolver
 */
export const getUsers = api(
  { method: 'GET', path: '/users', expose: true, auth: true },
  async ({
    tenantId,
    limit = 10,
    offset = 0,
  }: {
    tenantId: Header<'X-Tenant-ID'>;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<UserProfile[]>> => {
    try {
      const users = await resourceResolver.getResource<UserProfile>(
        tenantId,
        'user_profiles',
        {
          select: 'id,user_id,email,first_name,last_name,role,permissions,created_at',
          limit: limit,
          offset: offset,
        },
        getTenantConnectorConfig
      );

      return {
        data: users,
        message: 'Users retrieved successfully',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to get users',
        message: 'Failed to get users',
      };
    }
  }
);

// TODO: Реализовать helper функции
function generateUserId(): string {
  return 'user_' + Math.random().toString(36).substr(2, 9);
}

function generateSessionToken(): string {
  return 'sess_' + Math.random().toString(36).substr(2, 32);
}
