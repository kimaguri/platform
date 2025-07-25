/**
 * Data Provider для Refine - работает исключительно через API Gateway
 * Supabase используется только на бэкенде, фронт работает с API Gateway
 * Автоматически добавляет JWT токен и Tenant ID в заголовки
 */

// Типы для совместимости с Refine
interface DataProvider {
  getList: (params: any) => Promise<any>;
  getOne: (params: any) => Promise<any>;
  getMany: (params: any) => Promise<any>;
  create: (params: any) => Promise<any>;
  createMany: (params: any) => Promise<any>;
  update: (params: any) => Promise<any>;
  updateMany: (params: any) => Promise<any>;
  deleteOne: (params: any) => Promise<any>;
  deleteMany: (params: any) => Promise<any>;
  getApiUrl: () => string;
  custom?: (params: any) => Promise<any>;
}

export interface DataProviderConfig {
  apiUrl: string; // URL API Gateway
}

// Интерфейс для кешированных токенов
interface CachedTokens {
  token: string | null;
  tenantId: string | null;
  lastUpdated: number;
}

// Функциональный подход для управления кешем токенов в памяти (аналог supabase-js)
const createTokenCache = () => {
  const CACHE_TTL = 5000; // 5 секунд TTL для кеша
  
  // Приватное состояние через замыкание
  let cache: CachedTokens = {
    token: null,
    tenantId: null,
    lastUpdated: 0,
  };
  
  let storageEventListener: ((event: any) => void) | null = null;
  
  // Загружаем токены из localStorage в кеш
  const loadFromStorage = (): void => {
    try {
      if (typeof window === 'undefined') return;
      
      const token = (window as any)?.localStorage?.getItem('auth.token');
      const tenantId = (window as any)?.localStorage?.getItem('auth.tenantId');
      
      cache = {
        token,
        tenantId,
        lastUpdated: Date.now(),
      };
    } catch {
      // Игнорируем ошибки чтения localStorage
    }
  };
  
  // Подписываемся на изменения в localStorage (аналог supabase-js)
  const setupStorageListener = (): void => {
    if (typeof window === 'undefined') return;
    
    storageEventListener = (event: any) => {
      if (event.key === 'auth.token' || event.key === 'auth.tenantId') {
        // Обновляем кеш при изменении токенов
        loadFromStorage();
      }
    };
    
    (window as any).addEventListener('storage', storageEventListener);
  };
  
  // Инициализация кеша
  loadFromStorage();
  setupStorageListener();
  
  // Публичные методы через замыкание
  return {
    // Получаем токены из кеша с проверкой TTL
    getTokens: (): { token: string | null; tenantId: string | null } => {
      const now = Date.now();
      
      // Если кеш устарел, обновляем из localStorage
      if (now - cache.lastUpdated > CACHE_TTL) {
        loadFromStorage();
      }
      
      return {
        token: cache.token,
        tenantId: cache.tenantId,
      };
    },
    
    // Принудительное обновление кеша
    refresh: (): void => {
      loadFromStorage();
    },
    
    // Очистка ресурсов
    destroy: (): void => {
      if (storageEventListener && typeof window !== 'undefined') {
        (window as any).removeEventListener('storage', storageEventListener);
        storageEventListener = null;
      }
    },
  };
};

// Глобальный экземпляр кеша токенов (создается один раз через замыкание)
const tokenCache = createTokenCache();

// Функция для создания HTTP запроса с кешированными токенами
const createHttpRequest = async (url: string, options: RequestInit = {}) => {
  // Получаем токены из кеша (быстро, без обращения к localStorage)
  const { token, tenantId } = tokenCache.getTokens();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
};

// Экспортируем функцию для принудительного обновления кеша токенов
// Может быть вызвана из AuthProvider после login/logout
export const refreshTokenCache = (): void => {
  tokenCache.refresh();
};

// Экспортируем функцию для очистки ресурсов (cleanup)
export const destroyTokenCache = (): void => {
  tokenCache.destroy();
};

/**
 * Создает DataProvider для работы с Simplx Platform API
 * Автоматически добавляет JWT токен и Tenant ID в заголовки
 * Использует in-memory кеш для быстрого доступа к токенам (аналог supabase-js)
 */
export const createSimplxDataProvider = (config: DataProviderConfig): DataProvider => {
  return {
    getList: async (params: any) => {
      const { resource, pagination, filters, sorters } = params;
      
      // Создаём параметры запроса
      const queryParams: Record<string, string> = {};
      
      // Пагинация
      if (pagination) {
        queryParams.page = String(pagination.current || 1);
        queryParams.limit = String(pagination.pageSize || 10);
      }
      
      // Простые фильтры
      if (filters) {
        filters.forEach((filter: any) => {
          if (filter.field && filter.value !== undefined) {
            queryParams[filter.field] = String(filter.value);
          }
        });
      }
      
      // Простая сортировка
      if (sorters && sorters.length > 0) {
        const sorter = sorters[0];
        queryParams.sort = `${sorter.field}:${sorter.order}`;
      }
      
      const queryString = new URLSearchParams(queryParams).toString();
      const url = `${config.apiUrl}/${resource}${queryString ? `?${queryString}` : ''}`;
      
      const response = await createHttpRequest(url);
      
      return {
        data: response.data || response || [],
        total: response.total || response.length || 0,
      };
    },
    
    getOne: async (params: any) => {
      const { resource, id } = params;
      const url = `${config.apiUrl}/${resource}/${id}`;
      
      const response = await createHttpRequest(url);
      
      return {
        data: response.data || response,
      };
    },
    
    getMany: async (params: any) => {
      const { resource, ids } = params;
      const queryString = new URLSearchParams({ 'id[in]': ids.join(',') }).toString();
      const url = `${config.apiUrl}/${resource}?${queryString}`;
      
      const response = await createHttpRequest(url);
      
      return {
        data: response.data || response || [],
      };
    },
    
    create: async (params: any) => {
      const { resource, variables } = params;
      const url = `${config.apiUrl}/${resource}`;
      
      const response = await createHttpRequest(url, {
        method: 'POST',
        body: JSON.stringify(variables),
      });
      
      return {
        data: response.data || response,
      };
    },
    
    createMany: async (params: any) => {
      const { resource, variables } = params;
      const url = `${config.apiUrl}/${resource}/bulk`;
      
      const response = await createHttpRequest(url, {
        method: 'POST',
        body: JSON.stringify({ items: variables }),
      });
      
      return {
        data: response.data || response || [],
      };
    },
    
    update: async (params: any) => {
      const { resource, id, variables } = params;
      const url = `${config.apiUrl}/${resource}/${id}`;
      
      const response = await createHttpRequest(url, {
        method: 'PUT',
        body: JSON.stringify(variables),
      });
      
      return {
        data: response.data || response,
      };
    },
    
    updateMany: async (params: any) => {
      const { resource, ids, variables } = params;
      const url = `${config.apiUrl}/${resource}/bulk`;
      
      const response = await createHttpRequest(url, {
        method: 'PUT',
        body: JSON.stringify({ ids, data: variables }),
      });
      
      return {
        data: response.data || response || [],
      };
    },
    
    deleteOne: async (params: any) => {
      const { resource, id } = params;
      const url = `${config.apiUrl}/${resource}/${id}`;
      
      const response = await createHttpRequest(url, {
        method: 'DELETE',
      });
      
      return {
        data: response.data || response,
      };
    },
    
    deleteMany: async (params: any) => {
      const { resource, ids } = params;
      const url = `${config.apiUrl}/${resource}/bulk`;
      
      const response = await createHttpRequest(url, {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
      });
      
      return {
        data: response.data || response || [],
      };
    },
    
    getApiUrl: () => config.apiUrl,
    
    custom: async (params: any) => {
      const { url, method = 'GET', payload, query } = params;
      let fullUrl = url.startsWith('/') ? `${config.apiUrl}${url}` : `${config.apiUrl}/${url}`;
      
      if (method === 'GET' && query) {
        const queryString = new URLSearchParams(query).toString();
        fullUrl += queryString ? `?${queryString}` : '';
      }
      
      const response = await createHttpRequest(fullUrl, {
        method,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      
      return {
        data: response,
      };
    },
  };
};
