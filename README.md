# SimplX Platform — Многоуровневая микросервисная платформа

Современная мульти-tenant микросервисная платформа на базе **Encore.ts** с централизованной конфигурацией, системой коннекторов, единой точкой входа (API Gateway) и интеллектуальной обработкой данных.

---

## 📚 Документация по сервисам

- [API Gateway](docs/sectioned-docs/gateway.md) — маршрутизация, проксирование, аутентификация, авторизация
- [Tenant Management Service](docs/sectioned-docs/tenant-management.md) — управление тенантами, расширяемые поля, правила конвертации
- [Data Processing Service](docs/sectioned-docs/data-processing.md) — обработка данных, конвертация, валидация, интеграция с extensible fields
- [Event Management Service](docs/sectioned-docs/event-management.md) — событийная архитектура, аудит, уведомления
- [User Management Service](docs/sectioned-docs/user-management.md) — аутентификация, профили, bootstrap
- [Система расширяемых полей и справочников](docs/sectioned-docs/extensible-fields-dictionary.md) — динамические поля, справочники, вложенные значения

---

## ✨ Основные возможности

- 🌐 Единый API Gateway
- 🔐 Централизованная аутентификация (Encore.ts `authHandler`)
- 🔌 Система коннекторов (адаптеры для БД)
- ⚙️ Централизованная конфигурация с типизацией
- 🏗️ Модульная архитектура сервисов
- 🔒 Мультитенантная безопасность и изоляция
- 📊 Метрики и мониторинг
- ⚡ Кеширование и rate limiting
- 🔄 Entity Conversion Rules — интеллектуальная трансформация данных
- 📢 Event-Driven Architecture — Pub/Sub, аудит, уведомления
- 📋 Extensible Fields System — динамическая настройка сущностей
- 📚 Dictionary Management — вложенные значения, динамические справочники
- 🚀 Bootstrap API — инициализация приложения одним запросом

---

## 🏗 Архитектура и структура

Платформа построена по принципу разделения ответственности на независимые сервисы. Каждый сервис реализован в функциональном стиле, использует систему коннекторов и резолверов, поддерживает расширяемость и изоляцию данных по тенантам.

Подробнее по каждому сервису — см. секционные файлы выше.


## ✨ Key Features

- **🌐 Unified API Gateway** with centralized routing and monitoring
- **🔐 Centralized Authentication** via Encore.ts `authHandler`
- **🔌 Connector System** with adapter pattern for multiple databases
- **⚙️ Configuration Management** with type safety and validation
- **🏗️ Zonal Architecture** with shared utilities and middleware
- **🔒 Multi-Tenant Security** with strict tenant isolation
- **📊 Health Monitoring** and performance metrics
- **⚡ Caching & Rate Limiting** for optimal performance
- **🎯 TypeScript First** with comprehensive type safety
- **🔄 Entity Conversion Rules** for intelligent data transformation
- **📢 Event-Driven Architecture** with Pub/Sub messaging
- **📋 Extensible Fields System** for dynamic entity customization
- **📚 Dictionary Management** with nested value support
- **🚀 Bootstrap API** for single-request application initialization

## 🏗 Architecture Overview

### New Service Structure

```
src/
├── config/                     # Centralized configuration system
├── connectors/                 # Database adapter pattern
│   ├── base/                   # Abstract adapters
│   ├── supabase/              # Supabase implementation
│   └── registry/              # Connector factory & resolver
├── gateway/                   # API Gateway service
│   ├── routing/               # Service route definitions
│   ├── middleware/            # Gateway-specific middleware
│   └── src/handlers/          # Health & metrics endpoints
├── services/                  # Business microservices
│   ├── tenant-management/     # Tenant CRUD & configuration
│   ├── user-management/       # Authentication & user profiles
│   └── content-management/    # Entity CRUD with connectors
└── shared/                    # Shared utilities & middleware
    ├── middleware/            # Auth, tenant, performance
    ├── types/                 # Common type definitions
    └── utilities/             # Helpers & validation
```

### Microservices

1. **API Gateway** (`src/gateway/`)

   - Centralized request routing
   - Health monitoring & metrics
   - Cross-cutting concerns (CORS, rate limiting)
   - Service discovery and load balancing
   - Unified endpoint management

2. **Tenant Management** (`src/services/tenant-management/`)

   - Tenant CRUD operations
   - Configuration management
   - Admin database operations
   - Entity conversion rules management
   - Extension field definitions

3. **User Management** (`src/services/user-management/`)

   - Authentication (login, register, logout)
   - User profile management
   - Role-based access control
   - Bootstrap data aggregation

4. **Data Processing** (`src/services/data-processing/`)

   - Entity conversion execution
   - Extensible fields processing
   - Data validation and transformation

6. **Event Management** (`src/services/event-management/`)
   - Event publishing and subscription
   - Audit logging
   - Notification services

### Connector System

```typescript
// Unified database access through adapter pattern
const connector = await registry.getConnectorForTenant(tenantId, getTenantConfig);
const data = await connector.query<User>('users', { filter: { active: true } });

// Support for multiple database types
- Supabase (default)
- PostgreSQL (planned)
- Custom connectors (extensible)
```

### Configuration Management

```typescript
// Centralized, type-safe configuration
import { config } from '@config';

const appConfig = await config.app();
const serviceConfig = await config.services();
const connectorConfig = await config.connectors();

// Environment variable validation
const validation = validateEnvironment();
if (!validation.valid) {
  console.error(validation.errors);
}
```

### Authentication System

```typescript
// Multi-tenant authentication with JWT, API keys, sessions
interface AuthParams {
  authorization?: Header<'Authorization'>;
  tenantId: Header<'X-Tenant-ID'>;
}

export const auth = authHandler<AuthParams, AuthData>(async (params) => {
  // Automatic authentication for all token types
  // Tenant validation and context injection
});
```

### Middleware Stack

```typescript
// Layered middleware for cross-cutting concerns
export default new Service('service-name', {
  middlewares: [
    performanceMiddleware, // Request timing & monitoring
    cachingMiddleware, // Response caching
    tenantValidationMiddleware, // Multi-tenant security
    rateLimitMiddleware, // Rate limiting
  ],
});
```

## 🚀 API Endpoints

### API Gateway (`/api/v1/`)

**Health & Monitoring:**

- `GET /health` - System health check
- `GET /health/:service` - Service-specific health
- `GET /metrics` - Performance metrics
- `GET /metrics/summary` - Metrics summary

**Tenant Management:**

- `GET /tenants` - List tenants
- `GET /tenants/:id` - Get tenant
- `POST /tenants` - Create tenant
- `PUT /tenants/:id` - Update tenant
- `DELETE /tenants/:id` - Delete tenant
- `GET /tenants/extensions/available-tables` - Get available tables
- `GET /tenants/:tenantId/fields` - Get extensible fields
- `GET /tenants/:tenantId/fields/all` - Get all extensible fields for tenant
- `POST /tenants/:tenantId/fields` - Create extensible field
- `PUT /tenants/fields/:fieldId` - Update extensible field
- `DELETE /tenants/fields/:fieldId` - Delete extensible field
- `GET /tenants/extensible-fields/stats` - Get extensible fields statistics
- `GET /tenants/extensible-fields/supported-entities` - Get supported entities

**User Management:**

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout
- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update profile
- `POST /auth/refresh` - Refresh authentication token

**Bootstrap & Configuration:**

- `GET /bootstrap` - Get all application data in one request
- `GET /config` - Get tenant configuration

**Data Processing:**

- `GET /entities/:type` - List entities
- `GET /entities/:type/:id` - Get entity
- `POST /entities/:type` - Create entity
- `PUT /entities/:type/:id` - Update entity
- `DELETE /entities/:type/:id` - Delete entity
- `POST /entities/:type/search` - Search entities with filters
- `GET /entities/:type?select=*, nested_field(*)` - Get entities with nested data

**Entity Conversion:**

- `GET /conversion-rules` - Get conversion rules
- `GET /conversion-rules/:ruleId` - Get conversion rule by ID
- `POST /conversion-rules` - Create conversion rule
- `PUT /conversion-rules/:ruleId` - Update conversion rule
- `DELETE /conversion-rules/:ruleId` - Delete conversion rule
- `POST /conversion/execute` - Execute entity conversion
- `GET /conversion/available/:sourceEntity` - Get available conversion rules
- `POST /conversion/webhooks/record-created` - Webhook for record creation
- `POST /conversion/webhooks/record-updated` - Webhook for record update

**Event Management:**

- `POST /events/publish` - Publish conversion event
- `GET /events/stats` - Get event statistics
- `GET /audit/logs` - Get audit trail
- `GET /notifications/history` - Get notification history

**Dictionary Management:**

- `GET /entities/dictionary` - Get dictionaries
- `GET /entities/dictionary_value` - Get dictionary values
- `GET /entities/dictionary?select=*, dictionary_value(*)` - Get dictionaries with embedded values

### API Gateway (`/api/v1/`)

**Health & Monitoring:**

- `GET /health` - System health check
- `GET /health/:service` - Service-specific health
- `GET /metrics` - Performance metrics
- `GET /metrics/summary` - Metrics summary

**Tenant Management:**

- `GET /tenants` - List tenants
- `GET /tenants/:id` - Get tenant
- `POST /tenants` - Create tenant
- `PUT /tenants/:id` - Update tenant
- `DELETE /tenants/:id` - Delete tenant

**User Management:**

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout
- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update profile

**Content Management:**

- `GET /entities/:type` - List entities
- `GET /entities/:type/:id` - Get entity
- `POST /entities/:type` - Create entity
- `PUT /entities/:type/:id` - Update entity
- `DELETE /entities/:type/:id` - Delete entity

## 🔧 Configuration

### Environment Variables

The platform uses comprehensive environment configuration. For Docker deployments, environment variables are defined in `docker-compose.yml`.

```bash
# Application
NODE_ENV=development
PORT=4000
HOST=0.0.0.0
LOG_LEVEL=debug

# Database (Legacy - используйте Encore secrets для production)
ADMIN_SUPABASE_URL=https://your-project.supabase.co
ADMIN_SUPABASE_SERVICE_KEY=your-service-key
TENANT_CONFIG={"tenant1": {"SUPABASE_URL": "...", "ANON_KEY": "..."}}

# Features
ENABLE_METRICS=true
ENABLE_CACHING=true
ENABLE_RATE_LIMITING=true

# Performance
REQUEST_TIMEOUT=30000
RATE_LIMIT_REQUESTS=100

# CORS
CORS_ORIGINS=["http://localhost:3000", "http://localhost:5173"]
```

### 🔐 Система секретов Encore.ts

Для безопасного управления секретами используется встроенная система Encore:

**Локальная разработка:**

```bash
# Создайте файл .secrets.local.cue
AdminSupabaseUrl: "https://your-admin-project.supabase.co"
AdminSupabaseServiceKey: "your-service-role-key"
```

**Production/self-host деплой:**

```bash
# Установите секреты через CLI для всех окружений
encore secret set --type dev,prod,local,pr AdminSupabaseUrl
encore secret set --type dev,prod,local,pr AdminSupabaseServiceKey
```

📖 Подробное руководство: [`docs/SECRETS_SETUP.md`](docs/SECRETS_SETUP.md)

See `env.example` for complete configuration options.

### 🐳 Docker Deployment

Для запуска приложения в Docker используйте docker-compose:

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Остановка сервисов
docker-compose down
```

Сервисы запускаются на следующих портах:
- API Gateway: 4000
- Tenant Management: 4001 (внутренний)
- User Management: 4002 (внутренний)
- Data Processing: 4003 (внутренний)
- Event Management: 4004 (внутренний)

### TypeScript Path Mapping

```typescript
// Convenient imports with path mapping
import { auth } from '@shared/middleware/auth/auth-handler';
import { config } from '@config';
import { DatabaseAdapter } from '@connectors/base/database-adapter';
import { TenantService } from '@services/tenant-management';
```

## 🔄 Entity Conversion System

The platform features a powerful entity conversion system that allows automatic transformation of data between different entity types based on configurable rules.

### Key Features

- **Rule-based Conversion**: Define conversion rules with field mapping and transformation logic
- **Conditional Triggers**: Automatic execution based on record creation/update events
- **Extensible Fields Integration**: Full support for extension fields in conversion rules
- **Audit Trail**: Complete logging of all conversion activities
- **Event-Driven Architecture**: Pub/Sub messaging for conversion events

### Architecture Components

1. **Conversion Rules Storage**: Rules stored in tenant management database
2. **Data Processing Service**: Execution engine for conversions
3. **Gateway Integration**: Unified API endpoints for rule management
4. **Event Management**: Audit logging and notifications

### Example Use Cases

- Convert leads to contacts automatically when status changes
- Transform task data to project data based on completion criteria
- Synchronize data between related entities

## 📚 Dictionary Management

The platform includes a comprehensive dictionary management system with support for nested values and advanced querying.

### Features

- **Nested Dictionary Values**: Support for hierarchical dictionary structures
- **Dynamic Field Mapping**: Automatic field name conversion (sort_order → order, is_active → active)
- **Default Value Support**: Configuration of default dictionary values
- **Bootstrap Integration**: Dictionary data included in application bootstrap

### API Endpoints

- `GET /entities/dictionary` - Get dictionaries with nested values
- `GET /entities/dictionary_value` - Get dictionary values
- `GET /entities/dictionary?select=*, dictionary_value(*)` - Get dictionaries with embedded values

## 🚀 Bootstrap API

Single endpoint to retrieve all essential application data for initialization:

- `GET /bootstrap` - Get user data, dictionaries, config parameters, resources, and permissions

This endpoint significantly reduces frontend initialization requests by providing all necessary data in a single call.
