# План Реализации Admin DB для Tenant Management
**Функциональный подход с существующими коннекторами**

**Дата:** 24 июля 2025  
**Фокус:** Только Admin DB, без Tenant DB и Redis  
**Архитектура:** Чистые функции + существующие коннекторы

---

## 🎯 Цели Реализации

1. **Перенести AdminDB из `lib/adminDb` в `tenant-management/src/database`**
2. **Использовать существующие коннекторы** из `/src/connectors/`
3. **Функциональный repository pattern** без классов
4. **Централизованная работа с конфигурациями** тенантов
5. **Без кэширования Redis** (добавим позже)
6. **Admin DB использует проект `simplx_crm_tenant` в Supabase**

---

## 📁 Новая Структура

```
src/services/tenant-management/
├── src/
│   ├── database/           # ← Новая папка для Admin DB
│   │   ├── adapters/       # Адаптеры для существующих коннекторов
│   │   ├── repositories/   # Функциональные репозитории
│   │   ├── types/          # Типы для Admin DB
│   │   └── queries/        # SQL запросы
│   └── services/           # Бизнес-логика
├── sql/
│   └── init_admin_db.sql   # Инициализация Admin DB
└── tests/
    └── database/
```

---

## 🔧 Использование Существующих Коннекторов

### Анализ текущих коннекторов:
- ✅ **Supabase Adapter** - уже есть в `/src/connectors/supabase.ts`
- ✅ **Postgres Adapter** - уже есть в `/src/connectors/postgres.ts`
- ✅ **Base Interface** - `Adapter<T>` в `/src/connectors/base.ts`

### Адаптер для Admin DB:

```typescript
// src/services/tenant-management/src/database/adapters/adminAdapter.ts
import { createSupabaseAdapter } from '../../../connectors/supabase';
import type { Adapter } from '../../../connectors/base';
import type { Tenant, TenantConfig, ExtensionField } from '../types';

export type AdminAdapter = {
  tenants: Adapter<Tenant>;
  configs: Adapter<TenantConfig>;
  extensionFields: Adapter<ExtensionField>;
};

export const createAdminAdapter = (supabaseUrl: string, serviceKey: string): AdminAdapter => ({
  tenants: createSupabaseAdapter({
    type: 'supabase',
    url: supabaseUrl,
    key: serviceKey,
    table: 'tenants'
  }),
  
  configs: createSupabaseAdapter({
    type: 'supabase',
    url: supabaseUrl,
    key: serviceKey,
    table: 'tenant_supabase_configs'
  }),
  
  extensionFields: createSupabaseAdapter({
    type: 'supabase',
    url: supabaseUrl,
    key: serviceKey,
    table: 'extension_field_definitions'
  })
});
```

---

## 🏗️ Функциональные Репозитории

### Repository Factory:

```typescript
// src/services/tenant-management/src/database/repositories/tenantRepository.ts
import type { AdminAdapter } from '../adapters/adminAdapter';
import type { Tenant, TenantConfig, CreateTenantData } from '../types';

export type TenantRepository = {
  findById: (tenantId: string) => Promise<Tenant | null>;
  findBySlug: (slug: string) => Promise<Tenant | null>;
  findAll: (status?: string) => Promise<Tenant[]>;
  create: (data: CreateTenantData) => Promise<Tenant>;
  update: (tenantId: string, data: Partial<Tenant>) => Promise<Tenant | null>;
  deactivate: (tenantId: string) => Promise<boolean>;
  getConfig: (tenantId: string) => Promise<TenantConfig | null>;
  saveConfig: (tenantId: string, config: TenantConfig) => Promise<TenantConfig>;
};

export const createTenantRepository = (adapter: AdminAdapter): TenantRepository => ({
  findById: async (tenantId: string) => {
    const result = await adapter.tenants.queryOne(tenantId);
    return result;
  },
  
  findBySlug: async (slug: string) => {
    const [result] = await adapter.tenants.query({ filter: { slug } });
    return result || null;
  },
  
  findAll: async (status?: string) => {
    const filter = status ? { status } : undefined;
    return adapter.tenants.query({ filter });
  },
  
  create: async (data: CreateTenantData) => {
    return adapter.tenants.insert(data);
  },
  
  update: async (tenantId: string, data: Partial<Tenant>) => {
    return adapter.tenants.update(tenantId, data);
  },
  
  deactivate: async (tenantId: string) => {
    const result = await adapter.tenants.update(tenantId, { status: 'inactive' });
    return !!result;
  },
  
  getConfig: async (tenantId: string) => {
    const [config] = await adapter.configs.query({ filter: { tenant_id: tenantId } });
    return config || null;
  },
  
  saveConfig: async (tenantId: string, config: TenantConfig) => {
    const existing = await adapter.configs.query({ filter: { tenant_id: tenantId } });
    
    if (existing.length > 0) {
      return adapter.configs.update(existing[0].id, config);
    } else {
      return adapter.configs.insert({ ...config, tenant_id: tenantId });
    }
  }
});
```

---

## 📊 Типы для Admin DB

```typescript
// src/services/tenant-management/src/database/types/index.ts
export interface Tenant {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive' | 'suspended';
  contact_email?: string;
  contact_name?: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TenantConfig {
  id: string;
  tenant_id: string;
  supabase_project_id: string;
  supabase_url: string;
  anon_key: string;
  service_key: string;
  region: string;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExtensionField {
  id: number;
  tenant_id: string;
  entity_table: string;
  field_name: string;
  field_type: 'text' | 'number' | 'boolean' | 'date' | 'json' | 'select';
  display_name: string;
  description?: string;
  is_required: boolean;
  is_searchable: boolean;
  is_filterable: boolean;
  is_sortable: boolean;
  default_value?: string;
  validation_rules: Record<string, any>;
  ui_config: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTenantData {
  tenant_id: string;
  name: string;
  slug: string;
  contact_email?: string;
  contact_name?: string;
  settings?: Record<string, any>;
}
```

---

## 🔄 Сервисный Слой

### Функциональный сервис:

```typescript
// src/services/tenant-management/src/services/tenantService.ts
import type { TenantRepository } from '../database/repositories/tenantRepository';
import type { CreateTenantData } from '../database/types';

export type TenantService = {
  getTenantList: (params?: { limit?: number; offset?: number; status?: string }) => Promise<Tenant[]>;
  getTenantById: (tenantId: string) => Promise<Tenant | null>;
  getTenantBySlug: (slug: string) => Promise<Tenant | null>;
  createTenant: (data: CreateTenantData) => Promise<Tenant>;
  updateTenant: (tenantId: string, data: Partial<Tenant>) => Promise<Tenant | null>;
  deactivateTenant: (tenantId: string) => Promise<boolean>;
  getTenantConfig: (tenantId: string) => Promise<TenantConfig | null>;
  saveTenantConfig: (tenantId: string, config: Omit<TenantConfig, 'id' | 'tenant_id'>) => Promise<TenantConfig>;
};

export const createTenantService = (repository: TenantRepository): TenantService => ({
  getTenantList: async ({ limit, offset, status } = {}) => {
    const tenants = await repository.findAll(status);
    
    if (offset !== undefined && limit !== undefined) {
      return tenants.slice(offset, offset + limit);
    }
    
    return tenants;
  },
  
  getTenantById: async (tenantId: string) => {
    return repository.findById(tenantId);
  },
  
  getTenantBySlug: async (slug: string) => {
    return repository.findBySlug(slug);
  },
  
  createTenant: async (data: CreateTenantData) => {
    // Валидация данных
    if (!data.tenant_id || !data.name || !data.slug) {
      throw new Error('Missing required fields: tenant_id, name, slug');
    }
    
    return repository.create(data);
  },
  
  updateTenant: async (tenantId: string, data: Partial<Tenant>) => {
    return repository.update(tenantId, data);
  },
  
  deactivateTenant: async (tenantId: string) => {
    return repository.deactivate(tenantId);
  },
  
  getTenantConfig: async (tenantId: string) => {
    return repository.getConfig(tenantId);
  },
  
  saveTenantConfig: async (tenantId: string, config: Omit<TenantConfig, 'id' | 'tenant_id'>) => {
    return repository.saveConfig(tenantId, {
      ...config,
      id: '',
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }
});
```

---

## 🔧 Конфигурация

### Централизованная конфигурация:

```typescript
// src/services/tenant-management/src/config.ts
import { secret } from 'encore.dev/config';

export const config = {
  adminSupabaseUrl: secret('AdminSupabaseUrl').or('https://simplx-crm-tenant.supabase.co'),
  adminServiceKey: secret('AdminSupabaseServiceKey'),
  environment: secret('Environment').or('development'),
};

// Фабрика конфигурации
export const createServiceConfig = () => ({
  adminSupabaseUrl: config.adminSupabaseUrl(),
  adminServiceKey: config.adminServiceKey(),
  environment: config.environment(),
});
```

---

## 📋 Пошаговый План Реализации

### Фаза 0: Актуализация Схемы через Supabase MCP (0.5 дня)

**Перед началом реализации обновить схему Admin DB в проекте `simplx_crm_tenant`:**

1. **Проверить текущую схему:**
   ```bash
   # Через Supabase MCP
   list_tables --project_id simplx_crm_tenant
   ```

2. **Создать миграции для Admin DB:**
   ```sql
   -- tenants table
   CREATE TABLE IF NOT EXISTS tenants (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id VARCHAR(255) UNIQUE NOT NULL,
     name VARCHAR(255) NOT NULL,
     slug VARCHAR(255) UNIQUE NOT NULL,
     status VARCHAR(50) DEFAULT 'active',
     contact_email VARCHAR(255),
     contact_name VARCHAR(255),
     settings JSONB DEFAULT '{}',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- tenant_supabase_configs table
   CREATE TABLE IF NOT EXISTS tenant_supabase_configs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id VARCHAR(255) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
     supabase_project_id VARCHAR(255) NOT NULL,
     supabase_url VARCHAR(500) NOT NULL,
     anon_key TEXT NOT NULL,
     service_key TEXT NOT NULL,
     region VARCHAR(100),
     plan VARCHAR(50) DEFAULT 'free',
     is_active BOOLEAN DEFAULT true,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- extension_field_definitions table
   CREATE TABLE IF NOT EXISTS extension_field_definitions (
     id SERIAL PRIMARY KEY,
     tenant_id VARCHAR(255) REFERENCES tenants(tenant_id) ON DELETE CASCADE,
     entity_table VARCHAR(100) NOT NULL,
     field_name VARCHAR(100) NOT NULL,
     field_type VARCHAR(50) NOT NULL,
     display_name VARCHAR(255) NOT NULL,
     description TEXT,
     is_required BOOLEAN DEFAULT false,
     is_searchable BOOLEAN DEFAULT false,
     is_filterable BOOLEAN DEFAULT false,
     is_sortable BOOLEAN DEFAULT false,
     default_value TEXT,
     validation_rules JSONB DEFAULT '{}',
     ui_config JSONB DEFAULT '{}',
     is_active BOOLEAN DEFAULT true,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(tenant_id, entity_table, field_name)
   );

   -- Indexes
   CREATE INDEX IF NOT EXISTS idx_tenants_tenant_id ON tenants(tenant_id);
   CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
   CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
   CREATE INDEX IF NOT EXISTS idx_tenant_configs_tenant_id ON tenant_supabase_configs(tenant_id);
   CREATE INDEX IF NOT EXISTS idx_extension_fields_tenant_id ON extension_field_definitions(tenant_id);
   CREATE INDEX IF NOT EXISTS idx_extension_fields_entity ON extension_field_definitions(entity_table);
   ```

3. **Применить миграции через Supabase MCP:**
   ```bash
   # Создать миграцию
   apply_migration --project_id simplx_crm_tenant --name create_admin_tables --query "[SQL выше]"
   
   # Проверить применение
   list_migrations --project_id simplx_crm_tenant
   ```

### Фаза 1: Подготовка (1 день)

1. **Создать структуру папок**
   ```bash
   mkdir -p src/services/tenant-management/src/{database/{adapters,repositories,types,queries},services}
   mkdir -p src/services/tenant-management/sql
   mkdir -p src/services/tenant-management/tests/database
   ```

2. **Перенести файлы**
   ```bash
   mv src/lib/adminDb/client.ts src/services/tenant-management/src/database/adapters/
   mv src/lib/adminDb/types.ts src/services/tenant-management/src/database/types/
   ```

3. **Создать SQL скрипт**
   ```bash
   touch src/services/tenant-management/sql/init_admin_db.sql
   ```

### Фаза 2: Адаптеры (1 день)

1. **Создать AdminAdapter**
   - Использовать существующий `createSupabaseAdapter`
   - Обернуть в функциональную фабрику

2. **Тестировать адаптеры**
   - Проверить подключение к Admin DB
   - Проверить базовые операции CRUD

### Фаза 3: Репозитории (1 день)

1. **Создать функциональные репозитории**
   - `createTenantRepository`
   - `createExtensionFieldRepository`

2. **Интегрировать с адаптерами**
   - Проверить работу через существующие коннекторы

### Фаза 4: Сервисный слой (1 день)

1. **Рефакторинг service.ts**
   - Заменить прямые вызовы AdminDB на репозитории
   - Обновить импорты

2. **Тестирование**
   - Unit тесты для всех функций
   - Интеграционные тесты

### Фаза 5: API обновление (0.5 дня)

1. **Обновить api.ts**
   - Использовать новые сервисы
   - Проверить обратную совместимость

2. **Деплой и проверка**
   - Запустить локально
   - Проверить все эндпоинты

---

## 🧪 Тестирование

### Unit тесты:

```typescript
// src/services/tenant-management/tests/database/tenantRepository.test.ts
import { createAdminAdapter } from '../../src/database/adapters/adminAdapter';
import { createTenantRepository } from '../../src/database/repositories/tenantRepository';

describe('Tenant Repository', () => {
  let repository: ReturnType<typeof createTenantRepository>;
  
  beforeEach(() => {
    const adapter = createAdminAdapter(
      process.env.ADMIN_SUPABASE_URL!,
      process.env.ADMIN_SERVICE_KEY!
    );
    repository = createTenantRepository(adapter);
  });
  
  it('should create and find tenant', async () => {
    const tenant = await repository.create({
      tenant_id: 'test-tenant',
      name: 'Test Tenant',
      slug: 'test-tenant'
    });
    
    expect(tenant.tenant_id).toBe('test-tenant');
    
    const found = await repository.findById('test-tenant');
    expect(found?.name).toBe('Test Tenant');
  });
});
```

---

## 📊 Миграция поэтапно

### 1. Заменить импорты в service.ts:

**Было:**
```typescript
import { getActiveTenants, getTenantFullInfo } from '../../lib/adminDb/client';
```

**Станет:**
```typescript
import { createAdminAdapter } from '../database/adapters/adminAdapter';
import { createTenantRepository } from '../database/repositories/tenantRepository';
```

### 2. Обновить функции:

**Было:**
```typescript
export async function getTenantList() {
  return getActiveTenants();
}
```

**Станет:**
```typescript
export const getTenantList = async () => {
  const config = createServiceConfig();
  const adapter = createAdminAdapter(config.adminSupabaseUrl, config.adminServiceKey);
  const repository = createTenantRepository(adapter);
  return repository.findAll();
};
```

---

## ✅ Чек-лист Завершения

- [ ] Admin DB структура создана
- [ ] Адаптеры работают через существующие коннекторы
- [ ] Репозитории реализованы функционально
- [ ] Service.ts использует новую структуру
- [ ] Все тесты проходят
- [ ] API эндпоинты работают корректно
- [ ] Документация обновлена

**Общее время реализации:** 3.5-4.5 дня
**Приоритет:** Высокий (блокирует другие задачи)
**Сложность:** Средняя (в основном рефакторинг)
