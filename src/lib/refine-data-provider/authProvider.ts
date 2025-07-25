/**
 * Auth Provider для Refine - работает исключительно через API Gateway
 * Supabase используется только на бэкенде, фронт работает с API Gateway
 * Управляет всей логикой аутентификации на фронтенде
 */

// Типы для совместимости с Refine
interface AuthProvider {
  login: (params: any) => Promise<any>;
  logout: (params?: any) => Promise<any>;
  check: (params?: any) => Promise<any>;
  onError: (error: any) => Promise<any>;
  getIdentity?: (params?: any) => Promise<any>;
  getPermissions?: (params?: any) => Promise<any>;
}

export interface AuthConfig {
  apiUrl: string; // URL API Gateway
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  tenantId?: string;
  expiresAt?: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  tenantId?: string;
  permissions?: string[];
}

// Функции для работы с токенами в localStorage
export const getAuthTokens = (): AuthTokens | null => {
  try {
    if (typeof window === 'undefined') return null;
    
    const token = (window as any)?.localStorage?.getItem('auth.token');
    const refreshToken = (window as any)?.localStorage?.getItem('auth.refreshToken');
    const tenantId = (window as any)?.localStorage?.getItem('auth.tenantId');
    const expiresAt = (window as any)?.localStorage?.getItem('auth.expiresAt');
    
    if (!token) return null;
    
    return {
      accessToken: token,
      refreshToken: refreshToken || undefined,
      tenantId: tenantId || undefined,
      expiresAt: expiresAt ? parseInt(expiresAt) : undefined,
    };
  } catch {
    return null;
  }
};

export const setAuthTokens = (tokens: AuthTokens): void => {
  try {
    if (typeof window === 'undefined') return;
    
    (window as any)?.localStorage?.setItem('auth.token', tokens.accessToken);
    
    if (tokens.refreshToken) {
      (window as any)?.localStorage?.setItem('auth.refreshToken', tokens.refreshToken);
    }
    
    if (tokens.tenantId) {
      (window as any)?.localStorage?.setItem('auth.tenantId', tokens.tenantId);
    }
    
    if (tokens.expiresAt) {
      (window as any)?.localStorage?.setItem('auth.expiresAt', tokens.expiresAt.toString());
    }
  } catch {
    // Игнорируем ошибки записи в localStorage
  }
};

export const clearAuthTokens = (): void => {
  try {
    if (typeof window === 'undefined') return;
    
    (window as any)?.localStorage?.removeItem('auth.token');
    (window as any)?.localStorage?.removeItem('auth.refreshToken');
    (window as any)?.localStorage?.removeItem('auth.tenantId');
    (window as any)?.localStorage?.removeItem('auth.expiresAt');
    (window as any)?.localStorage?.removeItem('auth.user');
  } catch {
    // Игнорируем ошибки удаления из localStorage
  }
};

export const getCurrentUser = (): User | null => {
  try {
    if (typeof window === 'undefined') return null;
    
    const userStr = (window as any)?.localStorage?.getItem('auth.user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

export const setCurrentUser = (user: User): void => {
  try {
    if (typeof window === 'undefined') return;
    
    (window as any)?.localStorage?.setItem('auth.user', JSON.stringify(user));
  } catch {
    // Игнорируем ошибки записи в localStorage
  }
};

// HTTP запрос к API Gateway
const apiRequest = async (url: string, options: RequestInit = {}): Promise<any> => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}`;
    
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorJson.error || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    
    throw new Error(errorMessage);
  }
  
  return response.json();
};

/**
 * Создаёт AuthProvider для Refine
 */
export const createSimplxAuthProvider = (config: AuthConfig): AuthProvider => {
  return {
    // Вход в систему
    login: async (params: any) => {
      try {
        const { email, password, tenantId } = params;
        
        const response = await apiRequest(`${config.apiUrl}/auth/login`, {
          method: 'POST',
          body: JSON.stringify({ email, password, tenantId }),
        });
        
        // Сохраняем токены и пользователя
        setAuthTokens(response.tokens);
        setCurrentUser(response.user);
        
        return {
          success: true,
          redirectTo: '/',
        };
      } catch (error) {
        return {
          success: false,
          error: {
            message: error instanceof Error ? error.message : 'Ошибка входа',
            name: 'LoginError',
          },
        };
      }
    },
    
    // Выход из системы
    logout: async () => {
      try {
        const tokens = getAuthTokens();
        
        if (tokens?.accessToken) {
          // Уведомляем сервер о выходе
          await apiRequest(`${config.apiUrl}/auth/logout`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          }).catch(() => {
            // Игнорируем ошибки logout на сервере
          });
        }
        
        // Очищаем локальные данные
        clearAuthTokens();
        
        return {
          success: true,
          redirectTo: '/login',
        };
      } catch {
        // В любом случае очищаем локальные данные
        clearAuthTokens();
        
        return {
          success: true,
          redirectTo: '/login',
        };
      }
    },
    
    // Проверка аутентификации
    check: async () => {
      const tokens = getAuthTokens();
      
      if (!tokens?.accessToken) {
        return {
          authenticated: false,
          redirectTo: '/login',
        };
      }
      
      // Проверяем срок действия токена
      if (tokens.expiresAt && Date.now() > tokens.expiresAt) {
        // Пытаемся обновить токен
        if (tokens.refreshToken) {
          try {
            const response = await apiRequest(
              `${config.apiUrl}/auth/refresh`,
              {
                method: 'POST',
                body: JSON.stringify({ refreshToken: tokens.refreshToken }),
              }
            );
            
            setAuthTokens(response.tokens);
            
            return {
              authenticated: true,
            };
          } catch {
            clearAuthTokens();
            return {
              authenticated: false,
              redirectTo: '/login',
            };
          }
        } else {
          clearAuthTokens();
          return {
            authenticated: false,
            redirectTo: '/login',
          };
        }
      }
      
      return {
        authenticated: true,
      };
    },
    
    // Обработка ошибок
    onError: async (error: any) => {
      if (error?.status === 401 || error?.status === 403) {
        clearAuthTokens();
        return {
          redirectTo: '/login',
        };
      }
      
      return {
        error,
      };
    },
    
    // Получение информации о пользователе
    getIdentity: async () => {
      const user = getCurrentUser();
      return user || null;
    },
    
    // Получение разрешений
    getPermissions: async () => {
      const user = getCurrentUser();
      return user?.permissions || [];
    },
  };
};
