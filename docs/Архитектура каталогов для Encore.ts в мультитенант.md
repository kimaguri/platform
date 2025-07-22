<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# Архитектура каталогов для Encore.ts в мультитенантной системе с коннекторами

## Обзор

Разработка архитектуры каталогов для фреймворка Encore.ts требует сбалансированного подхода, который учитывает специфические особенности этого backend-решения для TypeScript. В отличие от традиционных фреймворков, Encore.ts предлагает встроенную поддержку микросервисов, автоматическое управление инфраструктурой и декларативный подход к определению ресурсов [^1][^2].

Encore.ts выделяется среди других backend-решений своей уникальной архитектурой, которая сочетает Node.js с высокопроизводительной средой выполнения на Rust. Эта гибридная архитектура обеспечивает до 9 раз лучшую производительность по сравнению с Express.js при сохранении 100% совместимости с экосистемой Node.js [^3][^4].

## Рекомендуемая структура каталогов для Encore.ts

### Корневая архитектура

Для мультитенантной системы с поддержкой коннекторов рекомендуется следующая структура каталогов:

```
project-root/
├── encore.app                           # Конфигурация приложения Encore
├── package.json                         # Зависимости проекта
├── tsconfig.json                        # Конфигурация TypeScript
├── src/                                 # Основная папка исходного кода
│   ├── shared/                          # Общие утилиты и зоны
│   │   ├── utilities/                   # Утилиты общего назначения
│   │   │   ├── validation/              # Валидация данных
│   │   │   ├── helpers/                 # Вспомогательные функции
│   │   │   └── constants/               # Константы системы
│   │   ├── middleware/                  # Middleware для всех сервисов
│   │   │   ├── tenant/                  # Middleware для мультитенантности
│   │   │   ├── auth/                    # Аутентификация и авторизация
│   │   │   └── logging/                 # Логирование
│   │   └── types/                       # Общие типы TypeScript
│   │       ├── tenant.ts                # Типы для тенантов
│   │       ├── connector.ts             # Типы для коннекторов
│   │       └── common.ts                # Общие типы
│   ├── connectors/                      # Система коннекторов
│   │   ├── base/                        # Базовые адаптеры
│   │   │   ├── database-adapter.ts      # Абстрактный адаптер БД
│   │   │   ├── realtime-adapter.ts      # Адаптер реального времени
│   │   │   └── storage-adapter.ts       # Адаптер хранилища
│   │   ├── supabase/                    # Коннектор Supabase
│   │   │   ├── encore.service.ts        # Сервис Encore для Supabase
│   │   │   ├── supabase-adapter.ts      # Реализация адаптера
│   │   │   ├── migrations/              # Миграции Supabase
│   │   │   └── realtime-handler.ts      # Обработчик реального времени
│   │   ├── native/                      # Нативный Encore.ts коннектор
│   │   │   ├── encore.service.ts        # Нативный сервис
│   │   │   ├── database/                # Конфигурация БД
│   │   │   └── migrations/              # SQL миграции
│   │   └── registry/                    # Реестр коннекторов
│   │       ├── connector-registry.ts    # Управление коннекторами
│   │       └── resource-resolver.ts     # Резолвер ресурсов
│   ├── services/                        # Бизнес-сервисы
│   │   ├── tenant-management/           # Управление тенантами
│   │   │   ├── encore.service.ts        # Сервис Encore
│   │   │   ├── tenant-api.ts            # API управления тенантами
│   │   │   ├── tenant-service.ts        # Бизнес-логика
│   │   │   └── migrations/              # Миграции тенантов
│   │   ├── user-management/             # Управление пользователями
│   │   │   ├── encore.service.ts
│   │   │   ├── user-api.ts
│   │   │   ├── user-service.ts
│   │   │   └── migrations/
│   │   ├── content-management/          # Управление контентом
│   │   │   ├── encore.service.ts
│   │   │   ├── content-api.ts
│   │   │   ├── content-service.ts
│   │   │   └── migrations/
│   │   └── notification/                # Уведомления
│   │       ├── encore.service.ts
│   │       ├── notification-api.ts
│   │       ├── notification-service.ts
│   │       └── pubsub-topics.ts         # Pub/Sub топики
│   ├── gateway/                         # API Gateway
│   │   ├── encore.service.ts            # Gateway сервис
│   │   ├── routing/                     # Маршрутизация
│   │   ├── middleware/                  # Gateway middleware
│   │   └── tenant-resolver.ts           # Определение тенанта
│   └── config/                          # Конфигурация
│       ├── database.ts                  # Конфигурация БД
│       ├── environment.ts               # Переменные окружения
│       └── connectors.ts                # Конфигурация коннекторов
├── tests/                               # Тесты
│   ├── integration/                     # Интеграционные тесты
│   ├── unit/                            # Модульные тесты
│   └── e2e/                            # End-to-end тесты
└── docs/                               # Документация
    ├── api/                            # Документация API
    ├── architecture/                   # Архитектурная документация
    └── connectors/                     # Документация коннекторов
```


### Структура сервисов в Encore.ts

В Encore.ts каждый сервис определяется наличием файла `encore.service.ts` в директории [^5][^6]. Этот подход обеспечивает четкое разделение между сервисами и автоматическое управление их жизненным циклом:

```typescript
// src/services/tenant-management/encore.service.ts
import { Service } from "encore.dev/service";
import { middleware } from "encore.dev/api";

export default new Service("tenant-management", {
  middlewares: [
    middleware({ target: { auth: true } }, async (req, next) => {
      // Middleware для мультитенантности
      const tenantId = extractTenantId(req);
      req.context = { ...req.context, tenantId };
      return next(req);
    })
  ]
});
```


## Архитектура коннекторов и адаптеров

### Базовая архитектура адаптеров

Система коннекторов строится на основе паттерна "Адаптер", который позволяет унифицированно работать с различными типами backend-систем [^7][^8]:

```typescript
// src/connectors/base/database-adapter.ts
export abstract class DatabaseAdapter {
  abstract connect(config: ConnectionConfig): Promise<void>;
  abstract query<T>(resourceName: string, params: QueryParams): Promise<T[]>;
  abstract insert<T>(resourceName: string, data: T): Promise<T>;
  abstract update<T>(resourceName: string, id: string, data: Partial<T>): Promise<T>;
  abstract delete(resourceName: string, id: string): Promise<boolean>;
  abstract disconnect(): Promise<void>;
}

// src/connectors/base/realtime-adapter.ts
export abstract class RealtimeAdapter {
  abstract subscribe<T>(channel: string, callback: (data: T) => void): Promise<void>;
  abstract publish<T>(channel: string, data: T): Promise<void>;
  abstract unsubscribe(channel: string): Promise<void>;
}
```


### Реализация Supabase адаптера

Supabase адаптер обеспечивает интеграцию с Supabase как backend-сервисом, предоставляя унифицированный интерфейс для работы с данными и реальным временем [^9][^10][^11]:

```typescript
// src/connectors/supabase/supabase-adapter.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseAdapter } from '../base/database-adapter';
import { Database } from '../../shared/types/supabase-types';

export class SupabaseAdapter extends DatabaseAdapter {
  private client: SupabaseClient<Database>;
  
  constructor(private config: SupabaseConfig) {
    super();
    this.client = createClient<Database>(
      config.supabaseUrl,
      config.supabaseKey
    );
  }

  async connect(): Promise<void> {
    // Проверка соединения с Supabase
    const { error } = await this.client.auth.getSession();
    if (error) throw new Error(`Supabase connection failed: ${error.message}`);
  }

  async query<T>(resourceName: string, params: QueryParams): Promise<T[]> {
    const { data, error } = await this.client
      .from(resourceName)
      .select(params.select || '*')
      .limit(params.limit || 100);
      
    if (error) throw new Error(`Query failed: ${error.message}`);
    return data as T[];
  }

  async insert<T>(resourceName: string, data: T): Promise<T> {
    const { data: result, error } = await this.client
      .from(resourceName)
      .insert(data)
      .select()
      .single();
      
    if (error) throw new Error(`Insert failed: ${error.message}`);
    return result as T;
  }
}
```


### Нативная реализация Encore.ts

Для полностью нативной реализации на Encore.ts используется встроенная поддержка PostgreSQL [^12][^13]:

```typescript
// src/connectors/native/encore.service.ts
import { Service } from "encore.dev/service";
import { SQLDatabase } from "encore.dev/storage/sqldb";

const db = new SQLDatabase("main", { migrations: "./migrations" });

export default new Service("native-connector");

// src/connectors/native/native-adapter.ts
import { DatabaseAdapter } from '../base/database-adapter';

export class NativeAdapter extends DatabaseAdapter {
  async query<T>(resourceName: string, params: QueryParams): Promise<T[]> {
    const result = await db.query<T>`
      SELECT ${params.select || '*'} 
      FROM ${resourceName} 
      LIMIT ${params.limit || 100}
    `;
    return Array.from(result);
  }

  async insert<T>(resourceName: string, data: T): Promise<T> {
    const columns = Object.keys(data as any).join(', ');
    const values = Object.values(data as any);
    
    const result = await db.queryRow<T>`
      INSERT INTO ${resourceName} (${columns}) 
      VALUES (${values.join(', ')}) 
      RETURNING *
    `;
    return result;
  }
}
```


## Мультитенантная архитектура

### Middleware для мультитенантности

Encore.ts предоставляет встроенную поддержку middleware, которая идеально подходит для реализации мультитенантности [^14][^15]:

```typescript
// src/shared/middleware/tenant/tenant-middleware.ts
import { middleware } from "encore.dev/api";

export const tenantMiddleware = middleware(
  { target: { auth: true } },
  async (req, next) => {
    const tenantId = extractTenantFromRequest(req);
    
    if (!tenantId) {
      throw new Error("Tenant not specified");
    }
    
    // Валидация тенанта
    const tenant = await validateTenant(tenantId);
    if (!tenant.active) {
      throw new Error("Tenant is not active");
    }
    
    // Добавление контекста тенанта
    req.context = { 
      ...req.context, 
      tenant: {
        id: tenantId,
        schema: tenant.schema,
        config: tenant.config
      }
    };
    
    return next(req);
  }
);

function extractTenantFromRequest(req: any): string | null {
  // Извлечение тенанта из заголовка, поддомена или пути
  return req.headers['x-tenant-id'] || 
         extractFromSubdomain(req.headers.host) ||
         extractFromPath(req.path);
}
```


### Управление ресурсами по зонам

Для организации общих утилит и middleware используется зональный подход:

```typescript
// src/shared/utilities/zone-manager.ts
export class ZoneManager {
  private zones: Map<string, ZoneConfig> = new Map();
  
  registerZone(name: string, config: ZoneConfig): void {
    this.zones.set(name, config);
  }
  
  getZoneUtilities(zoneName: string): ZoneUtilities {
    const config = this.zones.get(zoneName);
    if (!config) {
      throw new Error(`Zone ${zoneName} not found`);
    }
    
    return {
      validation: config.validation,
      helpers: config.helpers,
      middleware: config.middleware
    };
  }
  
  async resolveResource(resourceName: string, tenantId: string): Promise<ResourceConfig> {
    const tenant = await this.getTenantConfig(tenantId);
    const zone = tenant.zone;
    
    return {
      connector: tenant.connectorType,
      resourcePath: `${zone}/${resourceName}`,
      config: tenant.resourceConfig[resourceName]
    };
  }
}
```


## Реестр коннекторов

### Центральное управление коннекторами

Реестр коннекторов обеспечивает централизованное управление различными типами подключений:

```typescript
// src/connectors/registry/connector-registry.ts
export class ConnectorRegistry {
  private connectors: Map<string, ConnectorFactory> = new Map();
  private instances: Map<string, DatabaseAdapter> = new Map();
  
  registerConnector(type: string, factory: ConnectorFactory): void {
    this.connectors.set(type, factory);
  }
  
  async getConnector(tenantId: string): Promise<DatabaseAdapter> {
    const cacheKey = `connector:${tenantId}`;
    
    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }
    
    const tenantConfig = await this.getTenantConfig(tenantId);
    const factory = this.connectors.get(tenantConfig.connectorType);
    
    if (!factory) {
      throw new Error(`Connector type ${tenantConfig.connectorType} not registered`);
    }
    
    const connector = await factory.create(tenantConfig.connectorConfig);
    await connector.connect();
    
    this.instances.set(cacheKey, connector);
    return connector;
  }
}

// Регистрация коннекторов
const registry = new ConnectorRegistry();
registry.registerConnector('supabase', new SupabaseConnectorFactory());
registry.registerConnector('native', new NativeConnectorFactory());
```


### Универсальный API для ресурсов

Система обеспечивает единообразный доступ к ресурсам независимо от типа backend:

```typescript
// src/connectors/registry/resource-resolver.ts
export class ResourceResolver {
  constructor(private registry: ConnectorRegistry) {}
  
  async getResource<T>(
    tenantId: string, 
    resourceName: string, 
    params?: QueryParams
  ): Promise<T[]> {
    const connector = await this.registry.getConnector(tenantId);
    return connector.query<T>(resourceName, params || {});
  }
  
  async createResource<T>(
    tenantId: string, 
    resourceName: string, 
    data: T
  ): Promise<T> {
    const connector = await this.registry.getConnector(tenantId);
    return connector.insert<T>(resourceName, data);
  }
  
  async updateResource<T>(
    tenantId: string, 
    resourceName: string, 
    id: string, 
    data: Partial<T>
  ): Promise<T> {
    const connector = await this.registry.getConnector(tenantId);
    return connector.update<T>(resourceName, id, data);
  }
}
```


## Конфигурация и развертывание

### Настройка окружения

Encore.ts автоматически управляет инфраструктурой, что упрощает конфигурацию [^16][^12]:

```typescript
// src/config/environment.ts
export interface EnvironmentConfig {
  database: {
    defaultConnector: 'native' | 'supabase';
    connectionPoolSize: number;
    migrationPath: string;
  };
  supabase: {
    url: string;
    key: string;
    realtime: boolean;
  };
  multitenancy: {
    tenantIdentification: 'header' | 'subdomain' | 'path';
    defaultTenant: string;
    tenantCaching: boolean;
  };
}

export const config: EnvironmentConfig = {
  database: {
    defaultConnector: process.env.DEFAULT_CONNECTOR as any || 'native',
    connectionPoolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
    migrationPath: './migrations'
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_ANON_KEY || '',
    realtime: process.env.SUPABASE_REALTIME === 'true'
  },
  multitenancy: {
    tenantIdentification: process.env.TENANT_ID_METHOD as any || 'header',
    defaultTenant: process.env.DEFAULT_TENANT || 'default',
    tenantCaching: process.env.TENANT_CACHING === 'true'
  }
};
```


### Инициализация приложения

Главный файл приложения координирует работу всех компонентов:

```typescript
// src/app.ts
import { ConnectorRegistry } from './connectors/registry/connector-registry';
import { ResourceResolver } from './connectors/registry/resource-resolver';
import { ZoneManager } from './shared/utilities/zone-manager';
import { SupabaseConnectorFactory } from './connectors/supabase/supabase-connector-factory';
import { NativeConnectorFactory } from './connectors/native/native-connector-factory';

// Инициализация системы
const registry = new ConnectorRegistry();
const resolver = new ResourceResolver(registry);
const zoneManager = new ZoneManager();

// Регистрация коннекторов
registry.registerConnector('supabase', new SupabaseConnectorFactory());
registry.registerConnector('native', new NativeConnectorFactory());

// Настройка зон
zoneManager.registerZone('shared', {
  validation: './shared/utilities/validation',
  helpers: './shared/utilities/helpers',
  middleware: './shared/middleware'
});

// Экспорт для использования в сервисах
export { registry, resolver, zoneManager };
```


## Преимущества предложенной архитектуры

### Модульность и масштабируемость

Предложенная архитектура обеспечивает высокую модульность за счет четкого разделения ответственности между компонентами. Каждый сервис Encore.ts является самостоятельной единицей развертывания, что упрощает масштабирование и поддержку системы [^17][^18].

### Единообразие интерфейсов

Использование паттерна "Адаптер" гарантирует, что независимо от типа backend (Supabase, нативный Encore.ts или другие), API остается неизменным. Это обеспечивает легкость миграции между различными типами хранилищ данных [^7][^8].

### Оптимизация производительности

Encore.ts предоставляет значительные преимущества в производительности благодаря своей архитектуре с Rust runtime. Система показывает до 9 раз лучшую производительность по сравнению с Express.js, что критически важно для мультитенантных приложений [^3][^4].

### Автоматизация DevOps

Encore.ts автоматически управляет инфраструктурой, включая создание баз данных, настройку соединений и развертывание в облаке. Это значительно снижает сложность управления мультитенантной системой [^1][^16].

## Рекомендации по реализации

### Поэтапное внедрение

1. **Начальная настройка**: Создание базовой структуры сервисов и настройка нативного Encore.ts коннектора
2. **Добавление Supabase**: Реализация Supabase адаптера для тенантов, требующих расширенной функциональности
3. **Масштабирование**: Постепенное добавление новых типов коннекторов и сервисов по мере роста системы

### Тестирование и качество кода

Encore.ts предоставляет встроенные инструменты для тестирования и отладки, включая локальную панель разработчика с трассировкой и автоматической документацией API [^19][^15].

### Мониторинг и наблюдаемость

Фреймворк автоматически инструментирует приложение для сбора метрик, логов и трассировок, что критически важно для мониторинга мультитенантных систем [^1][^20].

## Заключение

Предложенная архитектура каталогов для Encore.ts оптимально сочетает гибкость мультитенантности с простотой управления коннекторами различных типов. Зональная организация общих утилит и middleware обеспечивает повторное использование кода, а система адаптеров гарантирует единообразие интерфейсов независимо от используемого backend.

Ключевыми преимуществами данной архитектуры являются:

- Четкое разделение ответственности между компонентами [^21][^22]
- Централизованное управление тенантами и коннекторами [^23]
- Высокая производительность благодаря оптимизациям Encore.ts [^3][^4]
- Автоматизация инфраструктуры и DevOps процессов [^1][^16]
- Легкость добавления новых типов backend без изменения существующего кода [^7][^8]

Эта структура обеспечивает надежную основу для разработки масштабируемых мультитенантных систем с поддержкой различных типов хранилищ данных и backend-сервисов.

<div style="text-align: center">⁂</div>

[^1]: https://phptutorialpoints.in/encore-ts/

[^2]: https://www.youtube.com/watch?v=hA9syK_FtZw

[^3]: https://app.daily.dev/posts/encore-ts-9x-faster-than-express-js-3x-faster-than-bun-zod-r4ivrwyvh

[^4]: https://dev.to/encore/how-to-make-your-expressjs-apis-9x-faster-with-encorets-1ke2

[^5]: https://encore.dev/docs/ts/primitives/app-structure

[^6]: https://encore.dev/docs/ts/primitives/services

[^7]: https://susomejias.dev/design-pattern-adapter/

[^8]: https://refactoring.guru/design-patterns/adapter/typescript/example

[^9]: https://supabase.com/docs/guides/database/connecting-to-postgres

[^10]: https://bootstrapped.app/guide/how-to-use-supabase-with-typescript

[^11]: https://supabase.com/docs/reference/javascript/typescript-support

[^12]: https://encore.dev/docs/ts/primitives/databases

[^13]: https://encore.dev/docs/ts/develop/orms

[^14]: https://encore.dev/docs/ts/develop/middleware

[^15]: https://encore.dev/blog/custom-middleware

[^16]: https://encore.dev

[^17]: https://encore.dev/docs/platform/migration/try-encore

[^18]: https://encore.cloud/resources/microservices

[^19]: https://encore.dev/blog/a-new-type-of-framework

[^20]: https://dev.to/shanu001x/encorets-back-end-development-game-changer-3lkl

[^21]: https://dev.to/mahabubr/decoding-backend-architecture-crafting-effective-folder-structures-in7

[^22]: https://www.linkedin.com/pulse/structuring-folders-your-backend-project-best-practices-lokesh-sharma

[^23]: https://www.atharvasystem.com/multi-tenant-architecture-for-a-saas-application/

[^24]: https://www.youtube.com/watch?v=zr3OXQKbaHQ

[^25]: https://dev.to/encore/nestjs-vs-encorets-choosing-the-right-framework-for-your-typescript-microservices-1g61

[^26]: https://www.youtube.com/watch?v=tL01EzN2-xA

[^27]: https://www.youtube.com/watch?v=rjL3nDiNf-c

[^28]: https://dev.to/encore/how-to-build-a-polling-system-with-node-typescript-using-encorets-1219

[^29]: https://dev.to/encore/encorets-a-new-type-of-framework-3c48

[^30]: https://github.com/encoredev/encore

[^31]: https://github.com/encoredev/examples/blob/main/ts/hello-world/README.md

[^32]: https://github.com/encoredev/nextjs-starter

[^33]: https://encore.dev/docs/go/primitives/app-structure

[^34]: https://dev.to/encore/how-to-build-a-real-time-dashboard-with-encorets-and-react-ii9

[^35]: https://www.youtube.com/watch?v=HCQCuvoEL04

[^36]: https://github.com/encoredev/encore/blob/main/ts_llm_instructions.txt

[^37]: https://gist.github.com/qhoirulanwar/dedb31c00eb1aa8c86005f17c6c30023

[^38]: https://symfony.com/doc/current/frontend/encore/simple-example.html

[^39]: https://dev.to/encore/building-and-deploying-typescript-microservices-to-kubernetes-3110

[^40]: https://encore.cloud/resources/backend-for-frontend

[^41]: https://github.com/encoredev/examples

[^42]: https://bestofjs.org/projects/encore

[^43]: https://encore.cloud/resources/node-js-frameworks

[^44]: https://insight.vayuz.com/insight-detail/when-to-use-encore.ts-for-backend-development:-a-brief-use-case/bmV3c18xNzQxMTYzMDUzMTA2

[^45]: https://tmtalks.hashnode.dev/building-multi-tenant-web-api-in-net-following-clean-architecture

[^46]: https://www.youtube.com/watch?v=93vJpTYwXqM

[^47]: https://neon.com/blog/building-production-api-services-with-encore-typescript-and-neon-serverless-postgres

[^48]: https://github.com/encoredev/encore/issues/1478

[^49]: https://docs.dronahq.com/reference/connectors/supabase/

[^50]: https://authjs.dev/reference/supabase-adapter

[^51]: https://kestra.io/docs/how-to-guides/supabase-db

[^52]: https://authjs.dev/getting-started/adapters/supabase

[^53]: https://docs-8gpduw68i-supabase.vercel.app/docs/reference/javascript/typescript-support

[^54]: https://www.prisma.io/docs/orm/overview/databases/supabase

[^55]: https://stackoverflow.com/questions/79220373/how-to-configure-better-auths-drizzleadapter-to-generate-supabase-compatible-uu

[^56]: https://www.youtube.com/watch?v=bwv2qu7M30s

[^57]: https://docs-9iqgakfxa-supabase.vercel.app/docs/guides/database/connecting-to-postgres

[^58]: https://www.youtube.com/watch?v=EdYQ9fF-hz4

[^59]: https://supabase.com/docs/guides/api/rest/generating-types

[^60]: https://docs.lovable.dev/integrations/supabase

[^61]: https://docs.powersync.com/tutorials/client/performance/supabase-connector-performance

[^62]: https://stackoverflow.com/questions/77520175/how-to-use-types-provided-by-supabase-in-my-typescript-project

[^63]: https://supabase.com/docs/guides/database/overview

[^64]: https://supabase.com/docs/guides/local-development/seeding-your-database

[^65]: https://www.reddit.com/r/Supabase/comments/10hmnt7/typescript_client/

[^66]: https://encore.dev/docs/platform/infrastructure/aws

[^67]: https://pkg.go.dev/encr.dev

[^68]: https://www.youtube.com/watch?v=vvqTGfoXVsw

[^69]: https://fireup.pro/news/typescript-backend-applications-with-encore-ts-9x-faster-than-express-js

[^70]: https://dev.to/encore/building-a-personal-blogging-platform-with-nextjs-and-encorets-44fh

[^71]: https://www.encoreweb.bayern.de/structure/doc/structure_of_encore.pdf

[^72]: https://wwwapps.grassvalley.com/docs/Manuals/routers/encore/071-8531-05.pdf

[^73]: https://encore.dev/docs/ts/primitives/databases-extensions

[^74]: https://www.reddit.com/r/programming/comments/1di6wya/encorets_combining_nodejs_with_async_rust_for/

[^75]: https://cursa.app/en/page/typescript-project-structure-best-practices

[^76]: https://dzone.com/articles/monorepo-using-nodejs

[^77]: https://gist.github.com/coltenkrauter/870b2654520a5366b072e4c460686efa

[^78]: https://github.com/4rokis/monorepo-example

[^79]: https://www.reddit.com/r/typescript/comments/16wsn88/best_folder_structure_for_the_type_definitions/

[^80]: https://www.explainthis.io/en/swe/why-use-monorepo

[^81]: https://dev.to/imajenasyon/folder-structure-backend-java-2402

[^82]: https://stackademic.com/blog/react-typescript-folder-structure-to-follow-ae614e786f8a

[^83]: https://dev.to/david_whitney/notes-on-the-monorepo-pattern-5egc

[^84]: https://jovick-blog.hashnode.dev/mastering-backend-nodejs-folder-structure-a-beginners-guide

[^85]: https://nextjs.org/docs/app/getting-started/project-structure

[^86]: https://www.reddit.com/r/reactjs/comments/1ebtfli/monorepo_multi_app_architecture/

[^87]: https://python.plainenglish.io/folder-structure-for-your-backend-and-how-to-keep-it-clean-308bfc01d960

[^88]: https://dev.to/udayanmaurya/how-to-ts-for-client-side-application-36ig

[^89]: https://www.youtube.com/watch?v=432thqUKs-Y

[^90]: https://www.geeksforgeeks.org/blogs/production-level-directory-setup-for-backend/

[^91]: https://www.totaltypescript.com/where-to-put-your-types-in-application-code

[^92]: https://neptune.ai/blog/organizing-ml-monorepo-with-pants

[^93]: https://dev.to/encore/how-to-use-orms-prisma-drizzle-knexjs-in-a-typescript-backend-built-with-encorets-1j63

[^94]: https://encore.dev/templates/postgresql

[^95]: https://dev.to/encore/build-and-deploy-a-rest-api-with-postgres-database-in-typescript-2h0n

