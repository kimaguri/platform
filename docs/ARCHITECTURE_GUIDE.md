# Simplx Platform - Архитектурный справочник

Полное руководство по архитектуре Simplx Platform для разработки новой логики.

## 📋 Содержание

1. [Обзор архитектуры](#обзор-архитектуры)
2. [API Gateway](#api-gateway)
3. [Микросервисы](#микросервисы)
4. [Система аутентификации](#система-аутентификации)
5. [Мультитенантность](#мультитенантность)
6. [Система коннекторов](#система-коннекторов)
7. [Extensions Definitions](#extensions-definitions)
8. [Процесс добавления новых микросервисов](#процесс-добавления-новых-микросервисов)
9. [Конфигурация и среда](#конфигурация-и-среда)

---

## 🏗 Обзор архитектуры

### Диаграмма архитектуры

```
┌─────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL CLIENTS                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Frontend   │  │   Mobile    │  │  3rd Party  │  │    CLI      │ │
│  │     App     │  │     App     │  │     API     │  │   Tools     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY                             │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                    /api/v1/* endpoints                         │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │ │
│  │  │    CORS     │ │   Tenant    │ │    Auth     │ │   Rate    │ │ │
│  │  │ Middleware  │ │ Validation  │ │  Handler    │ │ Limiting  │ │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └───────────┘ │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                          ┌─────────┼─────────┐
                          ▼         ▼         ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  USER MGMT      │ │  TENANT MGMT    │ │ CONTENT MGMT    │
│   SERVICE       │ │    SERVICE      │ │    SERVICE      │
│                 │ │                 │ │                 │
│ ┌─────────────┐ │ │ ┌─────────────┐ │ │ ┌─────────────┐ │
│ │ RPC API     │ │ │ │ RPC API     │ │ │ │ RPC API     │ │
│ │ Functions   │ │ │ │ Functions   │ │ │ │ Functions   │ │
│ └─────────────┘ │ │ └─────────────┘ │ │ └─────────────┘ │
│ ┌─────────────┐ │ │ ┌─────────────┐ │ │ ┌─────────────┐ │
│ │ Business    │ │ │ │ Business    │ │ │ │ Business    │ │
│ │ Logic       │ │ │ │ Logic       │ │ │ │ Logic       │ │
│ └─────────────┘ │ │ └─────────────┘ │ │ └─────────────┘ │
│ ┌─────────────┐ │ │ ┌─────────────┐ │ │ ┌─────────────┐ │
│ │Resource     │ │ │ │Admin DB     │ │ │ │Resource     │ │
│ │Resolver     │ │ │ │Access       │ │ │ │Resolver     │ │
│ └─────────────┘ │ │ └─────────────┘ │ │ └─────────────┘ │
└─────────────────┘ └─────────────────┘ └─────────────────┘
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CONNECTOR SYSTEM                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │  Supabase   │ │ PostgreSQL  │ │  MongoDB    │ │   Future    │   │
│  │  Adapter    │ │  Adapter    │ │  Adapter    │ │  Adapters   │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASES                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐   │
│  │   Admin     │ │  Tenant 1   │ │  Tenant 2   │ │  Tenant N   │   │
│  │  Supabase   │ │  Database   │ │  Database   │ │  Database   │   │
│  │ (Tenants)   │ │ (Supabase)  │ │(PostgreSQL) │ │ (MongoDB)   │   │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### Ключевые принципы архитектуры

1. **Функциональный подход** - Все адаптеры и сервисы созданы как функции, не классы
2. **Multi-tenant изоляция** - Каждый тенант имеет собственную БД и конфигурацию
3. **Централизованный Gateway** - Единая точка входа для всех внешних запросов
4. **Adapter Pattern** - Унифицированный доступ к различным типам БД
5. **RPC коммуникация** - Внутренние вызовы между сервисами через Encore RPC

---

## 🌐 API Gateway

### Назначение

API Gateway служит единой точкой входа для всех внешних API запросов, обеспечивая:

- Централизованную аутентификацию и авторизацию
- Валидацию тенантов
- Rate limiting и CORS
- Проксирование запросов к микросервисам

### Структура Gateway

```
src/gateway/
├── encore.service.ts           # Service definition с middleware
├── auth.ts                     # AuthHandler и Gateway конфигурация
├── endpoints/                  # Проксирующие endpoints
│   ├── user-endpoints.ts       # User API proxy endpoints
│   ├── tenant-endpoints.ts     # Tenant API proxy endpoints
│   └── content-endpoints.ts    # Content API proxy endpoints
├── middleware/                 # Gateway middleware
│   ├── cors.ts                 # CORS handling
│   ├── tenant-validation.ts    # Tenant validation
│   ├── rate-limiting.ts        # Rate limiting
│   └── logging.ts              # Request/response logging
└── utils/
    └── service-clients.ts      # RPC client imports
```

### Middleware Stack

Middleware выполняются в строгом порядке:

```
Request → CORS → Tenant Validation → Authentication → Rate Limiting → Logging → Service
```

#### Пример middleware конфигурации:

```typescript
// src/gateway/encore.service.ts
import { Service } from 'encore.dev';
import { corsMiddleware } from './middleware/cors';
import { tenantValidationMiddleware } from './middleware/tenant-validation';
import { rateLimitMiddleware } from './middleware/rate-limiting';
import { loggingMiddleware } from './middleware/logging';

export default new Service('api-gateway', {
  middlewares: [
    corsMiddleware, // 1. CORS headers
    tenantValidationMiddleware, // 2. X-Tenant-ID validation
    rateLimitMiddleware, // 3. Rate limiting
    loggingMiddleware, // 4. Request logging
  ],
});
```

### URL Schema

Все внешние API используют единый префикс `/api/v1/`:

```
Authentication:     /api/v1/auth/*
User Management:    /api/v1/users/*
Tenant Management:  /api/v1/tenants/*
Content Management: /api/v1/content/*
Health & Metrics:   /api/v1/health, /api/v1/metrics
```

### Проксирование к сервисам

Gateway проксирует внешние запросы к микросервисам через RPC:

```typescript
// src/gateway/endpoints/user-endpoints.ts
import { api } from 'encore.dev/api';
import { users } from '~encore/clients'; // RPC client

export const getCurrentUser = api(
  { method: 'GET', path: '/api/v1/users/me', expose: true, auth: true },
  async (): Promise<ApiResponse<UserProfile>> => {
    const authData = getAuthData() as AuthData;

    // Проксирование к user-management сервису
    const result = await users.getMyProfile();

    return {
      data: result,
      message: 'User profile retrieved',
    };
  }
);
```

---

## 🔧 Микросервисы

### Архитектура микросервисов

Каждый микросервис следует единой структуре:

```
src/services/[service-name]/
├── encore.service.ts    # Service definition только
├── api.ts              # RPC endpoint функции
├── service.ts          # Бизнес-логика через ResourceResolver
└── src/
    ├── index.ts        # Экспорты
    └── models/         # TypeScript модели
        └── [entity].ts
```

### 1. User Management Service

**Назначение:** Управление пользователями, аутентификация, профили

**RPC API Functions:**

```typescript
// src/services/user-management/api.ts
export const listUsers = api(
  { auth: true, method: 'GET', path: '/users/list' },
  async ({ limit, offset }): Promise<ApiResponse<UserProfile[]>> => {
    const users = await queryResource<UserProfile>(authData.tenantId, 'user_profiles', {
      limit,
      offset,
    });
    return { data: users };
  }
);

export const getMyProfile = api(
  { auth: true, method: 'GET', path: '/users/me' },
  async (): Promise<ApiResponse<UserProfile>> => {
    const authData = getAuthData() as AuthData;
    const profile = await getResource<UserProfile>(
      authData.tenantId,
      'user_profiles',
      authData.userID
    );
    return { data: profile };
  }
);
```

### 2. Tenant Management Service

**Назначение:** Управление тенантами, конфигурации, admin операции

**Особенности:**

- Работает с admin Supabase БД
- Управляет конфигурациями тенантов
- Создает и настраивает новые tenant БД

```typescript
// src/services/tenant-management/api.ts
export const createTenant = api(
  { auth: true, method: 'POST', path: '/tenants' },
  async (createData: CreateTenantRequest): Promise<ApiResponse<Tenant>> => {
    // Используется admin DB, не ResourceResolver
    return TenantService.createNewTenant(createData);
  }
);

export const getTenantConfig = api(
  { auth: true, method: 'GET', path: '/tenants/:tenantId/config' },
  async ({ tenantId }): Promise<ApiResponse<TenantConfig>> => {
    return TenantService.getTenantConfiguration(tenantId);
  }
);
```

### 3. Content Management Service

**Назначение:** Универсальное управление контентом с поддержкой всех адаптеров

```typescript
// src/services/content-management/api.ts
export const createContent = api(
  { auth: true, method: 'POST', path: '/content' },
  async (data: CreateContentRequest): Promise<ApiResponse<Content>> => {
    const authData = getAuthData() as AuthData;

    const content = await createResource<Content>(authData.tenantId, 'content', data);

    return { data: content };
  }
);
```

---

## 🔐 Система аутентификации

### AuthHandler

Централизованный обработчик аутентификации поддерживает:

```typescript
// src/gateway/auth.ts
export interface AuthParams {
  authorization: Header<'Authorization'>; // Bearer token или API key
  tenantId: Header<'X-Tenant-ID'>; // Обязательный tenant ID
}

export interface AuthData {
  userID: string;
  tenantId: string;
  userEmail?: string;
  userRole?: string;
  tokenType: 'jwt' | 'api_key';
}

export const auth = authHandler<AuthParams, AuthData>(
  async (params: AuthParams): Promise<AuthData> => {
    const { authorization, tenantId } = params;

    // 1. Валидация tenant ID
    if (!tenantId) {
      throw APIError.invalidArgument('X-Tenant-ID header is required');
    }

    // 2. Проверка существования тенанта
    const hasConfig = await hasTenantConfig(tenantId);
    if (!hasConfig) {
      throw APIError.notFound(`Tenant '${tenantId}' not found or inactive`);
    }

    // 3. Парсинг authorization header
    let tokenType: 'jwt' | 'api_key';
    let token: string;

    if (authorization.startsWith('Bearer ')) {
      tokenType = 'jwt';
      token = authorization.substring(7);
    } else if (authorization.startsWith('ApiKey ')) {
      tokenType = 'api_key';
      token = authorization.substring(7);
    } else {
      throw APIError.unauthenticated('Invalid authorization format');
    }

    // 4. Валидация токена
    if (tokenType === 'jwt') {
      return await validateJWTToken(token, tenantId);
    } else {
      return await validateApiKey(token, tenantId);
    }
  }
);
```

### Типы аутентификации

#### JWT токены

```typescript
async function validateJWTToken(token: string, tenantId: string): Promise<AuthData> {
  const config = await getTenantConfigById(tenantId);
  const supabase = createClient(config.SUPABASE_URL, config.ANON_KEY);

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
```

#### API ключи

```typescript
async function validateApiKey(apiKey: string, tenantId: string): Promise<AuthData> {
  const config = await getTenantConfigById(tenantId);

  // Проверка API ключа против service key для admin операций
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
```

---

## 🏢 Мультитенантность

### Принципы мультитенантности

1. **Строгая изоляция данных** - каждый тенант имеет отдельную БД
2. **Централизованное управление** - конфигурации тенантов в admin БД
3. **Автоматический выбор адаптера** - по типу коннектора тенанта
4. **Валидация доступа** - проверка X-Tenant-ID для всех запросов

### Структура tenant конфигурации

```typescript
// src/lib/types/tenant.ts
export interface TenantConfig {
  tenantId: string;
  connectorType: 'supabase' | 'postgres' | 'mongodb';

  // Supabase конфигурация
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SERVICE_KEY?: string;

  // PostgreSQL конфигурация
  POSTGRES_HOST?: string;
  POSTGRES_PORT?: number;
  POSTGRES_DB?: string;
  POSTGRES_USER?: string;
  POSTGRES_PASSWORD?: string;

  // MongoDB конфигурация
  MONGODB_URI?: string;
  MONGODB_DB?: string;

  // Дополнительные настройки
  features: string[];
  limits: {
    maxUsers: number;
    maxStorage: number;
  };
  customization: Record<string, any>;
}
```

### Хранение конфигураций

Конфигурации тенантов хранятся в admin Supabase БД:

```sql
-- Admin Supabase структура
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  connector_type TEXT NOT NULL DEFAULT 'supabase',
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tenant_configs (
  tenant_id UUID REFERENCES tenants(id),
  config_key TEXT NOT NULL,
  config_value TEXT NOT NULL,
  is_encrypted BOOLEAN DEFAULT false,
  PRIMARY KEY (tenant_id, config_key)
);
```

### Получение конфигурации тенанта

```typescript
// src/lib/utils/tenant-config.ts
export async function getTenantConfigById(tenantId: string): Promise<TenantConfig> {
  const adminSupabase = createClient(
    process.env.ADMIN_SUPABASE_URL!,
    process.env.ADMIN_SUPABASE_SERVICE_KEY!
  );

  // Получение основной инфо о тенанте
  const { data: tenant } = await adminSupabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .eq('is_active', true)
    .single();

  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found`);
  }

  // Получение детальной конфигурации
  const { data: configs } = await adminSupabase
    .from('tenant_configs')
    .select('*')
    .eq('tenant_id', tenantId);

  // Сборка конфигурации
  const config: TenantConfig = {
    tenantId,
    connectorType: tenant.connector_type,
    ...tenant.config,
  };

  // Добавление конфигурационных ключей
  configs?.forEach(({ config_key, config_value }) => {
    config[config_key] = config_value;
  });

  return config;
}
```

### Middleware валидации тенанта

```typescript
// src/gateway/middleware/tenant-validation.ts
export const tenantValidationMiddleware = middleware(
  { target: { auth: false } },
  async (req, next) => {
    const tenantId = req.data.headers?.['x-tenant-id'];

    if (!tenantId) {
      throw APIError.invalidArgument('X-Tenant-ID header is required');
    }

    // Проверка существования и активности тенанта
    const hasConfig = await hasTenantConfig(tenantId);
    if (!hasConfig) {
      throw APIError.notFound(`Tenant '${tenantId}' not found or inactive`);
    }

    return await next(req);
  }
);
```

---

## 🔌 Система коннекторов

### Архитектура коннекторов

Система коннекторов обеспечивает унифицированный доступ к различным типам БД через adapter pattern:

```
┌─────────────────────────────────────────────────────────────────┐
│                    RESOURCE RESOLVER                           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  queryResource() │ getResource() │ createResource()        │ │
│  │  updateResource()│ deleteResource() │ countResources()     │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CONNECTOR REGISTRY                             │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │           getAdapterForTenant(tenantId, resource)           │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │ │
│  │  │  Supabase   │ │ PostgreSQL  │ │  MongoDB    │           │ │
│  │  │   Factory   │ │   Factory   │ │   Factory   │           │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘           │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BASE ADAPTER                                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  connect() │ query() │ insert() │ update() │ delete()       │ │
│  │  queryOne() │ count() │ disconnect()                        │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Base Adapter Interface

```typescript
// src/connectors/base.ts
export interface QueryParams {
  filter?: Record<string, any>;
  limit?: number;
  offset?: number;
  select?: string | string[];
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
}

export interface Adapter<T = any> {
  connect(): Promise<void>;
  disconnect?(): Promise<void>;
  query(params?: QueryParams): Promise<T[]>;
  queryOne(id: string): Promise<T | null>;
  insert(data: Omit<T, 'id'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  count(filter?: Record<string, any>): Promise<number>;
}

export interface AdapterConfig {
  type: 'supabase' | 'postgres' | 'mongodb';
  [key: string]: any;
}

export type AdapterFactory<T = any> = (config: AdapterConfig & { table: string }) => Adapter<T>;
```

### Supabase Adapter

```typescript
// src/connectors/supabase.ts
export function createSupabaseAdapter<T = any>(
  config: AdapterConfig & { table: string }
): Adapter<T> {
  let client: SupabaseClient;

  return {
    async connect() {
      client = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
    },

    async query(params: QueryParams = {}) {
      let query = client.from(config.table).select(params.select || '*');

      if (params.filter) {
        Object.entries(params.filter).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      if (params.orderBy) {
        params.orderBy.forEach(({ field, direction }) => {
          query = query.order(field, { ascending: direction === 'asc' });
        });
      }

      if (params.limit) query = query.limit(params.limit);
      if (params.offset)
        query = query.range(params.offset, params.offset + (params.limit || 10) - 1);

      const { data, error } = await query;
      if (error) throw error;
      return data as T[];
    },

    async queryOne(id: string) {
      const { data, error } = await client.from(config.table).select('*').eq('id', id).single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as T | null;
    },

    async insert(data: Omit<T, 'id'>) {
      const { data: result, error } = await client
        .from(config.table)
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result as T;
    },

    async update(id: string, data: Partial<T>) {
      const { data: result, error } = await client
        .from(config.table)
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as T;
    },

    async delete(id: string) {
      const { error } = await client.from(config.table).delete().eq('id', id);

      if (error) throw error;
      return true;
    },

    async count(filter: Record<string, any> = {}) {
      let query = client.from(config.table).select('*', { count: 'exact', head: true });

      Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  };
}
```

### Connector Registry

```typescript
// src/connectors/registry/connector-registry.ts
const adapterFactories: Record<string, AdapterFactory> = {
  supabase: createSupabaseAdapter,
  postgres: createPostgresAdapter,
  mongodb: createMongoAdapter,
};

export async function getAdapterForTenant<T = any>(
  tenantId: string,
  resource: string
): Promise<Adapter<T>> {
  // Получение конфигурации тенанта
  const tenantConfig = await getTenantConfigById(tenantId);

  // Выбор фабрики адаптера
  const factory = adapterFactories[tenantConfig.connectorType];
  if (!factory) {
    throw new Error(`Unsupported connector type: ${tenantConfig.connectorType}`);
  }

  // Создание адаптера
  const adapter = factory({
    type: tenantConfig.connectorType,
    table: resource,
    ...tenantConfig,
  });

  // Подключение
  await adapter.connect();

  return adapter;
}
```

### Resource Resolver

```typescript
// src/connectors/registry/resource-resolver.ts
export async function queryResource<T = any>(
  tenantId: string,
  resource: string,
  params?: QueryParams
): Promise<T[]> {
  const adapter = await getAdapterForTenant(tenantId, resource);
  return adapter.query(params) as Promise<T[]>;
}

export async function createResource<T = any>(
  tenantId: string,
  resource: string,
  data: Omit<T, 'id'>
): Promise<T> {
  const adapter = await getAdapterForTenant(tenantId, resource);
  return adapter.insert(data) as Promise<T>;
}

export async function queryResourcesPaginated<T = any>(
  tenantId: string,
  resource: string,
  params: {
    filter?: Record<string, any>;
    page?: number;
    pageSize?: number;
    orderBy?: { field: string; direction: 'asc' | 'desc' }[];
    select?: string | string[];
  } = {}
): Promise<{
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}> {
  const { filter = {}, page = 1, pageSize = 10, orderBy, select } = params;

  const adapter = await getAdapterForTenant(tenantId, resource);

  // Получение общего количества
  const total = await adapter.count(filter);
  const totalPages = Math.ceil(total / pageSize);
  const offset = (page - 1) * pageSize;

  // Получение данных с пагинацией
  const data = (await adapter.query({
    filter,
    limit: pageSize,
    offset,
    orderBy,
    select,
  })) as T[];

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}
```

---

## 📋 Extensions Definitions

### Обзор системы расширений

Extensions Definitions в HelpDev New Supabase представляет собой систему динамических полей для расширения любых таблиц системы без изменения схемы БД.

### Структура таблиц

#### extension_table_definitions

Описания расширяемых полей:

```sql
CREATE TABLE extension_table_definitions (
  id BIGINT PRIMARY KEY,
  entity_table TEXT NOT NULL,        -- Имя таблицы для расширения
  field_name TEXT NOT NULL,          -- Slug-имя поля
  field_type TEXT NOT NULL,          -- Тип поля PostgreSQL
  display_name TEXT NOT NULL,        -- Отображаемое имя в UI
  is_required BOOLEAN DEFAULT false,
  default_value TEXT,
  is_active BOOLEAN DEFAULT true,    -- Флаг активности
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### extension_table_values

Значения расширяемых полей в JSONB формате:

```sql
CREATE TABLE extension_table_values (
  id BIGINT PRIMARY KEY,
  entity_table TEXT NOT NULL,       -- Имя таблицы
  entity_id UUID NOT NULL,          -- ID записи в основной таблице
  field_data JSONB NOT NULL DEFAULT '{}', -- Данные полей в JSONB
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Принцип работы

1. **Определение полей** - В `extension_table_definitions` создаются описания дополнительных полей для любой таблицы
2. **Хранение значений** - В `extension_table_values` хранятся фактические значения в JSONB формате
3. **Связь с основными таблицами** - Через `entity_table` + `entity_id`

### Пример использования

#### Добавление расширяемых полей для лидов:

```sql
-- Определение дополнительных полей для таблицы lead
INSERT INTO extension_table_definitions (
  entity_table, field_name, field_type, display_name, is_required
) VALUES
  ('lead', 'budget_range', 'text', 'Диапазон бюджета', false),
  ('lead', 'decision_maker', 'text', 'Лицо принимающее решение', true),
  ('lead', 'timeline', 'date', 'Планируемые сроки', false),
  ('lead', 'custom_tags', 'jsonb', 'Пользовательские теги', false);
```

#### Сохранение значений:

```sql
-- Сохранение дополнительных данных для лида
INSERT INTO extension_table_values (
  entity_table, entity_id, field_data
) VALUES (
  'lead',
  'lead-uuid-here',
  '{
    "budget_range": "50000-100000",
    "decision_maker": "Иван Петров",
    "timeline": "2024-03-15",
    "custom_tags": ["urgent", "enterprise", "b2b"]
  }'
);
```

### Интеграция с Simplx Platform

Система Extensions Definitions может быть интегрирована в Simplx Platform через:

#### 1. Resource Resolver расширение

```typescript
// src/connectors/registry/extension-resolver.ts
export async function queryResourceWithExtensions<T = any>(
  tenantId: string,
  resource: string,
  entityId: string,
  params?: QueryParams
): Promise<T & { extensions?: Record<string, any> }> {
  // Получение основных данных
  const baseData = await getResource<T>(tenantId, resource, entityId);

  // Получение расширенных полей
  const extensions = await getExtensionFields(tenantId, resource, entityId);

  return {
    ...baseData,
    extensions,
  };
}

async function getExtensionFields(
  tenantId: string,
  entityTable: string,
  entityId: string
): Promise<Record<string, any>> {
  const adapter = await getAdapterForTenant(tenantId, 'extension_table_values');

  const extensionData = await adapter.queryOne({
    filter: {
      entity_table: entityTable,
      entity_id: entityId,
    },
  });

  return extensionData?.field_data || {};
}
```

#### 2. API для управления расширениями

```typescript
// src/services/content-management/api.ts
export const getEntityWithExtensions = api(
  { auth: true, method: 'GET', path: '/content/:type/:id/extended' },
  async ({ type, id }): Promise<ApiResponse<any>> => {
    const authData = getAuthData() as AuthData;

    const entityWithExtensions = await queryResourceWithExtensions(authData.tenantId, type, id);

    return { data: entityWithExtensions };
  }
);

export const updateEntityExtensions = api(
  { auth: true, method: 'PUT', path: '/content/:type/:id/extensions' },
  async ({ type, id, extensions }): Promise<ApiResponse<boolean>> => {
    const authData = getAuthData() as AuthData;

    await updateExtensionFields(authData.tenantId, type, id, extensions);

    return { data: true, message: 'Extensions updated' };
  }
);
```

#### 3. Схема валидации расширений

```typescript
// src/lib/types/extensions.ts
export interface ExtensionFieldDefinition {
  id: number;
  entityTable: string;
  fieldName: string;
  fieldType: 'text' | 'number' | 'boolean' | 'date' | 'jsonb';
  displayName: string;
  isRequired: boolean;
  defaultValue?: string;
  isActive: boolean;
}

export interface ExtensionFieldValue {
  entityTable: string;
  entityId: string;
  fieldData: Record<string, any>;
}

// Валидация расширенных полей
export async function validateExtensionData(
  tenantId: string,
  entityTable: string,
  fieldData: Record<string, any>
): Promise<{ valid: boolean; errors: string[] }> {
  // Получение определений полей
  const definitions = await queryResource<ExtensionFieldDefinition>(
    tenantId,
    'extension_table_definitions',
    { filter: { entity_table: entityTable, is_active: true } }
  );

  const errors: string[] = [];

  // Валидация каждого поля
  definitions.forEach((def) => {
    const value = fieldData[def.fieldName];

    // Проверка обязательных полей
    if (def.isRequired && !value) {
      errors.push(`Field '${def.displayName}' is required`);
    }

    // Валидация типов
    if (value && !validateFieldType(value, def.fieldType)) {
      errors.push(`Field '${def.displayName}' has invalid type`);
    }
  });

  return { valid: errors.length === 0, errors };
}
```

---

## ➕ Процесс добавления новых микросервисов

### Шаг 1: Создание структуры сервиса

```bash
mkdir -p src/services/new-service/src/models
touch src/services/new-service/encore.service.ts
touch src/services/new-service/api.ts
touch src/services/new-service/service.ts
touch src/services/new-service/src/index.ts
touch src/services/new-service/src/models/entity.ts
```

### Шаг 2: Service Definition

```typescript
// src/services/new-service/encore.service.ts
import { Service } from 'encore.dev';

export default new Service('new-service');
```

### Шаг 3: Модели данных

```typescript
// src/services/new-service/src/models/entity.ts
export interface NewEntity {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNewEntityRequest {
  name: string;
  description?: string;
}

export interface UpdateNewEntityRequest {
  name?: string;
  description?: string;
}
```

### Шаг 4: Бизнес-логика через ResourceResolver

```typescript
// src/services/new-service/service.ts
import {
  queryResource,
  createResource,
  updateResource,
  deleteResource,
} from '../../connectors/registry/resource-resolver';
import type {
  NewEntity,
  CreateNewEntityRequest,
  UpdateNewEntityRequest,
} from './src/models/entity';

export async function getEntityList(
  tenantId: string,
  params: { limit?: number; offset?: number } = {}
): Promise<NewEntity[]> {
  return queryResource<NewEntity>(tenantId, 'new_entities', {
    limit: params.limit || 50,
    offset: params.offset || 0,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
  });
}

export async function getEntityById(tenantId: string, entityId: string): Promise<NewEntity | null> {
  return getResource<NewEntity>(tenantId, 'new_entities', entityId);
}

export async function createNewEntity(
  tenantId: string,
  data: CreateNewEntityRequest
): Promise<NewEntity> {
  return createResource<NewEntity>(tenantId, 'new_entities', {
    ...data,
    tenantId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function updateExistingEntity(
  tenantId: string,
  entityId: string,
  data: UpdateNewEntityRequest
): Promise<NewEntity | null> {
  return updateResource<NewEntity>(tenantId, 'new_entities', entityId, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteEntity(tenantId: string, entityId: string): Promise<boolean> {
  return deleteResource(tenantId, 'new_entities', entityId);
}
```

### Шаг 5: RPC API Functions

```typescript
// src/services/new-service/api.ts
import { api, Query } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';
import type { AuthData } from '../../gateway/auth';
import type { ApiResponse } from '../../lib/types';
import * as NewService from './service';

export const listEntities = api(
  { auth: true, method: 'GET', path: '/entities/list' },
  async ({
    limit,
    offset,
  }: {
    limit?: Query<number>;
    offset?: Query<number>;
  }): Promise<ApiResponse<NewEntity[]>> => {
    const authData = getAuthData() as AuthData;

    const entities = await NewService.getEntityList(authData.tenantId, {
      limit,
      offset,
    });

    return {
      data: entities,
      message: 'Entities retrieved successfully',
    };
  }
);

export const getEntity = api(
  { auth: true, method: 'GET', path: '/entities/:entityId' },
  async ({ entityId }: { entityId: string }): Promise<ApiResponse<NewEntity>> => {
    const authData = getAuthData() as AuthData;

    const entity = await NewService.getEntityById(authData.tenantId, entityId);

    if (!entity) {
      throw new Error(`Entity with ID ${entityId} not found`);
    }

    return {
      data: entity,
      message: 'Entity retrieved successfully',
    };
  }
);

export const createEntity = api(
  { auth: true, method: 'POST', path: '/entities' },
  async (data: CreateNewEntityRequest): Promise<ApiResponse<NewEntity>> => {
    const authData = getAuthData() as AuthData;

    const entity = await NewService.createNewEntity(authData.tenantId, data);

    return {
      data: entity,
      message: 'Entity created successfully',
    };
  }
);

export const updateEntity = api(
  { auth: true, method: 'PUT', path: '/entities/:entityId' },
  async ({
    entityId,
    ...updateData
  }: UpdateNewEntityRequest & { entityId: string }): Promise<ApiResponse<NewEntity>> => {
    const authData = getAuthData() as AuthData;

    const entity = await NewService.updateExistingEntity(authData.tenantId, entityId, updateData);

    if (!entity) {
      throw new Error(`Entity with ID ${entityId} not found`);
    }

    return {
      data: entity,
      message: 'Entity updated successfully',
    };
  }
);

export const deleteEntity = api(
  { auth: true, method: 'DELETE', path: '/entities/:entityId' },
  async ({ entityId }: { entityId: string }): Promise<ApiResponse<boolean>> => {
    const authData = getAuthData() as AuthData;

    const success = await NewService.deleteEntity(authData.tenantId, entityId);

    return {
      data: success,
      message: 'Entity deleted successfully',
    };
  }
);
```

### Шаг 6: Экспорты

```typescript
// src/services/new-service/src/index.ts
export * from './models/entity';
export * as NewService from '../service';
```

### Шаг 7: Добавление в Gateway

```typescript
// src/gateway/endpoints/new-service-endpoints.ts
import { api, Query } from 'encore.dev/api';
import { getAuthData } from '~encore/auth';
import type { AuthData } from '../auth';
import { newService } from '../utils/service-clients';

export const listEntities = api(
  { method: 'GET', path: '/api/v1/entities', expose: true, auth: true },
  async ({
    limit,
    offset,
  }: {
    limit?: Query<number>;
    offset?: Query<number>;
  }): Promise<ApiResponse<NewEntity[]>> => {
    // Проксирование к new-service
    const result = await newService.listEntities({ limit, offset });

    return {
      data: result.data,
      message: 'Entities retrieved',
    };
  }
);

export const createEntity = api(
  { method: 'POST', path: '/api/v1/entities', expose: true, auth: true },
  async (data: CreateNewEntityRequest): Promise<ApiResponse<NewEntity>> => {
    const result = await newService.createEntity(data);

    return {
      data: result.data,
      message: 'Entity created',
    };
  }
);
```

### Шаг 8: Обновление service-clients

```typescript
// src/gateway/utils/service-clients.ts
import {
  users,
  tenants,
  content,
  newService, // Добавить новый сервис
} from '~encore/clients';

export const userManagementClient = users;
export const tenantManagementClient = tenants;
export const contentManagementClient = content;
export const newServiceClient = newService; // Экспорт нового клиента
```

### Шаг 9: Обновление encore.app

```json
{
  "id": "",
  "lang": "typescript",
  "services": {
    "api-gateway": { "path": "./src/gateway" },
    "tenant-management": { "path": "./src/services/tenant-management" },
    "user-management": { "path": "./src/services/user-management" },
    "content-management": { "path": "./src/services/content-management" },
    "new-service": { "path": "./src/services/new-service" }
  }
}
```

### Шаг 10: Создание таблиц в БД тенантов

Для каждого типа коннектора создать соответствующие таблицы:

#### Supabase/PostgreSQL:

```sql
CREATE TABLE new_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS политики
ALTER TABLE new_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their tenant data"
ON new_entities FOR ALL
USING (tenant_id = (current_setting('app.current_tenant_id'))::UUID);
```

#### MongoDB:

```javascript
// Создание коллекции и индексов
db.createCollection('new_entities');
db.new_entities.createIndex({ tenant_id: 1 });
db.new_entities.createIndex({ created_at: -1 });
```

---

## ⚙️ Конфигурация и среда

### Environment Variables

```bash
# Application
NODE_ENV=development
PORT=4000
HOST=0.0.0.0
LOG_LEVEL=debug

# Admin Database (для управления тенантами)
ADMIN_SUPABASE_URL=https://your-admin-project.supabase.co
ADMIN_SUPABASE_SERVICE_KEY=your-admin-service-key

# Gateway Configuration
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]
LOG_FORMAT=json

# Features
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
ENABLE_CACHING=true
ENABLE_RATE_LIMITING=true

# Performance
REQUEST_TIMEOUT=30000
MAX_CONNECTIONS=1000
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000

# Connectors
DEFAULT_CONNECTOR=supabase
SUPABASE_CONNECTOR_ENABLED=true
SUPABASE_POOL_SIZE=10
SUPABASE_TIMEOUT=30000

# Gateway
GATEWAY_PREFIX=/api
GATEWAY_VERSION=v1
GATEWAY_ENABLE_PROXY=true
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@config/*": ["src/config/*"],
      "@connectors/*": ["src/connectors/*"],
      "@gateway/*": ["src/gateway/*"],
      "@services/*": ["src/services/*"],
      "@shared/*": ["src/shared/*"],
      "@lib/*": ["src/lib/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "encore run",
    "dev:watch": "encore run --watch",
    "build": "encore build",
    "build:prod": "encore build --env=prod",
    "deploy": "encore deploy",
    "deploy:staging": "encore deploy --env=staging",
    "deploy:prod": "encore deploy --env=prod",
    "lint": "tsc --noEmit",
    "type-check": "tsc --noEmit --skipLibCheck",
    "gen": "encore gen client",
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

### Основные зависимости

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.52.0",
    "encore.dev": "^1.48.10",
    "pg": "^8.11.3",
    "mongodb": "^6.3.0",
    "dotenv": "^17.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.5.7",
    "@types/pg": "^8.10.9",
    "typescript": "^5.2.2",
    "vitest": "^1.5.0"
  }
}
```

---

## 🔍 Best Practices для разработки

### 1. Функциональный подход

```typescript
// ✅ Хорошо - функциональные фабрики
export function createAdapter(config: AdapterConfig): Adapter {
  return {
    async query() {
      /* implementation */
    },
    async insert() {
      /* implementation */
    },
  };
}

// ❌ Плохо - классы
export class AdapterClass {
  constructor(config: AdapterConfig) {}
  async query() {
    /* implementation */
  }
}
```

### 2. Обработка ошибок

```typescript
// ✅ Хорошо - структурированные ошибки
export interface ApiResponse<T> {
  data?: T;
  message: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// В API функциях
try {
  const result = await someOperation();
  return { data: result, message: 'Success' };
} catch (error) {
  throw APIError.internal('Operation failed', { cause: error });
}
```

### 3. Валидация тенантов

```typescript
// ✅ Всегда проверяйте доступ к тенанту
export const someApiFunction = api(
  { auth: true, method: 'GET', path: '/resource' },
  async (): Promise<ApiResponse<any>> => {
    const authData = getAuthData() as AuthData;

    // Тенант уже валидирован в middleware, но можно добавить дополнительные проверки
    const hasAccess = await validateTenantAccess(authData.tenantId, 'resource');
    if (!hasAccess) {
      throw APIError.permissionDenied('Access denied to tenant resource');
    }

    // Основная логика
  }
);
```

### 4. Использование ResourceResolver

```typescript
// ✅ Хорошо - использование ResourceResolver для унифицированного доступа
const users = await queryResource<User>(tenantId, 'users', {
  filter: { active: true },
  limit: 10,
  orderBy: [{ field: 'created_at', direction: 'desc' }],
});

// ❌ Плохо - прямое обращение к БД
const supabase = createClient(url, key);
const { data } = await supabase.from('users').select('*');
```

### 5. Типизация

```typescript
// ✅ Хорошо - строгая типизация
export interface CreateUserRequest {
  email: string;
  name: string;
  role?: 'user' | 'admin';
}

export const createUser = api(
  { auth: true, method: 'POST', path: '/users' },
  async (data: CreateUserRequest): Promise<ApiResponse<User>> => {
    // TypeScript проверит типы автоматически
  }
);

// ❌ Плохо - any типы
export const createUser = api(
  { auth: true, method: 'POST', path: '/users' },
  async (data: any): Promise<any> => {
    // Потеря типобезопасности
  }
);
```

---

## 📚 Заключение

Этот архитектурный справочник покрывает все основные аспекты Simplx Platform:

- **API Gateway** как единая точка входа с middleware stack
- **Микросервисы** с функциональным подходом и RPC коммуникацией
- **Мультитенантность** с изоляцией данных и централизованным управлением
- **Система коннекторов** с adapter pattern для различных БД
- **Extensions Definitions** для динамического расширения схем
- **Процесс добавления новых сервисов** с пошаговым руководством

Используйте этот справочник как основу для разработки новой логики в Simplx Platform, следуя установленным паттернам и принципам архитектуры.

---

_Последнее обновление: 23 января 2025_
