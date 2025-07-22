# API Gateway - Encore.ts Best Practices

## Overview

API Gateway является единой точкой входа для всех внешних API запросов. Реализован согласно best practices Encore.ts с централизованной обработкой аутентификации, авторизации, CORS, rate limiting и логирования.

## Architecture

### URL Schema

Все внешние API используют единый префикс `/api/v1/`:

- **Authentication**: `/api/v1/auth/*`

  - `POST /api/v1/auth/login` - User login
  - `POST /api/v1/auth/register` - User registration
  - `POST /api/v1/auth/logout` - User logout
  - `POST /api/v1/auth/reset-password` - Password reset

- **User Management**: `/api/v1/users/*`

  - `GET /api/v1/users/me` - Get current user profile
  - `PUT /api/v1/users/me` - Update current user profile
  - `GET /api/v1/users/:id` - Get user by ID
  - `GET /api/v1/users` - List users (admin only)

- **Tenant Management**: `/api/v1/tenants/*`

  - `GET /api/v1/tenants/me` - Get current tenant
  - `PUT /api/v1/tenants/me` - Update current tenant
  - `GET /api/v1/tenants/me/config` - Get tenant configuration
  - `GET /api/v1/tenants` - List tenants (super admin only)
  - `GET /api/v1/tenants/:id` - Get tenant by ID

- **Content Management**: `/api/v1/content/*`
  - `POST /api/v1/content` - Create content
  - `GET /api/v1/content/:id` - Get content by ID
  - `PUT /api/v1/content/:id` - Update content
  - `DELETE /api/v1/content/:id` - Delete content
  - `GET /api/v1/content` - List content
  - `POST /api/v1/content/:id/publish` - Publish content
  - `POST /api/v1/content/:id/archive` - Archive content

### Directory Structure

```
src/gateway/
├── encore.service.ts           # Service definition with middleware
├── auth.ts                     # AuthHandler and Gateway configuration
├── endpoints/
│   ├── user-endpoints.ts       # User API proxy endpoints
│   ├── tenant-endpoints.ts     # Tenant API proxy endpoints
│   └── content-endpoints.ts    # Content API proxy endpoints
├── middleware/
│   ├── cors.ts                 # CORS handling
│   ├── tenant-validation.ts    # Tenant validation
│   ├── rate-limiting.ts        # Rate limiting
│   └── logging.ts              # Request/response logging
├── utils/
│   └── service-clients.ts      # RPC client imports
└── src/
    ├── handlers/
    │   ├── health.ts           # Health check endpoints
    │   └── metrics.ts          # Metrics endpoints
    └── index.ts                # Main exports
```

## Middleware Stack

Middleware выполняются в строгом порядке:

1. **CORS Middleware** - Обработка CORS headers и preflight requests
2. **Tenant Validation** - Извлечение и валидация X-Tenant-ID
3. **Authentication** - Обрабатывается через Gateway authHandler
4. **Rate Limiting** - Ограничение запросов по IP/tenant/user
5. **Logging** - Логирование всех запросов и ответов

## Authentication

### AuthHandler

Централизованный обработчик аутентификации поддерживает:

- JWT токены (`Bearer <token>`)
- API ключи (`ApiKey <key>`)

### AuthData

Возвращает расширенную информацию о пользователе:

```typescript
interface AuthData {
  userID: string;
  tenantId: string;
  userEmail?: string;
  role?: string;
  permissions?: string[];
  tokenType: 'jwt' | 'api_key';
  locale?: string;
}
```

## Service Communication

- **Внешние запросы** → API Gateway (`/api/v1/*`)
- **Внутренние вызовы** → RPC clients (`~encore/clients`)

Gateway проксирует все внешние запросы к соответствующим микросервисам через RPC-вызовы.

## Error Handling

Унифицированный формат ошибок:

```typescript
{
  error: "ResourceNotFound",
  message: "User with ID 123 not found",
  code: 404,
  details?: any
}
```

## Rate Limiting

Многоуровневые ограничения:

- **IP**: 50 запросов/минуту
- **Tenant**: 1000 запросов/минуту
- **User**: 100 запросов/минуту

## Permissions

Система разрешений на основе ролей:

- `users:read`, `users:write` - Управление пользователями
- `tenant:read`, `tenant:write` - Управление тенантом
- `content:read`, `content:write`, `content:delete`, `content:publish` - Управление контентом

## Development

### Running Locally

```bash
# Gateway будет доступен на порту, назначенном Encore
encore run
```

### Testing Endpoints

```bash
# Health check
curl http://localhost:4000/health

# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: your-tenant-id" \
  -d '{"email": "user@example.com", "password": "password"}'

# Get current user (requires auth)
curl http://localhost:4000/api/v1/users/me \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-ID: your-tenant-id"
```

## Migration Notes

### Changes Made

1. ✅ **Удалены дублирующие routes** из `src/gateway/routing/`
2. ✅ **Создан централизованный authHandler** в `auth.ts`
3. ✅ **Реализован middleware stack** в правильном порядке
4. ✅ **Созданы проксирующие endpoints** с схемой `/api/v1/*`
5. ✅ **Упрощены микросервисы** - убраны дублирующие middleware
6. ✅ **Установлена единая точка входа** через API Gateway

### Breaking Changes

- ❌ **Старые endpoints удалены** - используйте новые `/api/v1/*`
- ❌ **Прямые вызовы к микросервисам** больше не поддерживаются
- ❌ **Middleware в микросервисах** удалены - все в Gateway

### Next Steps

1. Обновить frontend клиенты для использования `/api/v1/*` endpoints
2. Заменить placeholder RPC-клиенты на реальные `~encore/clients` импорты
3. Настроить production конфигурацию для CORS и rate limiting
4. Добавить мониторинг и алертинг для Gateway
5. Создать интеграционные тесты для всех endpoints

## Security

- ✅ Централизованная аутентификация через authHandler
- ✅ Валидация tenant'ов для всех запросов
- ✅ Rate limiting для защиты от DDoS
- ✅ CORS настроен для безопасных origins
- ✅ Логирование всех запросов для аудита
- ✅ Проверка разрешений на уровне endpoints
