# Modern Multi-Tenant Microservices Platform

Современная мульти-тенантная платформа на базе **Encore TS** с применением лучших практик и современной архитектуры.

## ✨ Ключевые особенности

- **🔐 Централизованная аутентификация** через Encore TS `authHandler`
- **⚡ Middleware система** с автоматической валидацией tenant ID
- **🔒 Безопасность на уровне пользователей** (не admin-права)
- **🚀 Современное управление секретами** через Encore TS `secret()`
- **📡 Real-time поддержка** для живых обновлений
- **🎯 Автоматическая валидация** TypeScript схем
- **⚡ Оптимизация производительности** с кэшированием и connection pooling
- **🏗️ Микросервисная архитектура** с двумя сервисами

## 🏗 Архитектура

### Микросервисы

1. **API Gateway** (`services/api-gateway/`)
   - Централизованная аутентификация через `authHandler`
   - Конфигурация для фронтенда
   - Управление тенантами
2. **Extensions** (`services/extensions/`)
   - Работа с динамическими сущностями
   - Real-time уведомления
   - Управление определениями полей

### Современная аутентификация

```typescript
// Поддерживает JWT токены, API ключи, session cookies
interface AuthParams {
  authorization?: Header<'Authorization'>;
  tenantId: Header<'X-Tenant-ID'>;
}

// Централизованный authHandler
export const auth = authHandler<AuthParams, AuthData>(async (params): Promise<AuthData> => {
  // Автоматическая аутентификация всех типов токенов
});
```

### Middleware система

```typescript
// Автоматическая валидация tenant, кэширование, мониторинг
export default new Service('api-gateway', {
  middlewares: [performanceMiddleware, cachingMiddleware, tenantValidationMiddleware],
});
```

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
pnpm install
```

### 2. Настройка секретов (современный подход)

#### Encore Secrets (рекомендуемый):

```bash
# Настройка административной БД
encore secret set --type development AdminSupabaseUrl
encore secret set --type development AdminSupabaseServiceKey

# Настройка service-to-service ключа
encore secret set --type development ServiceApiKey

# Fallback конфигурация тенантов
encore secret set --type development TenantConfig
```

#### Environment Variables (для разработки):

```bash
cp env.example .env.local
# Обновите значения в .env.local
```

### 3. Запуск проекта

```bash
encore run
```

## 🔐 Современная аутентификация

### Поддерживаемые методы

1. **JWT токены** (основной):

```bash
curl -H "Authorization: Bearer <jwt_token>" \
     -H "X-Tenant-ID: helpdev" \
     http://localhost:4000/entities/users
```

2. **API ключи** (service-to-service):

```bash
curl -H "Authorization: ApiKey <service_key>" \
     -H "X-Tenant-ID: helpdev" \
     http://localhost:4000/entities/users
```

3. **Session cookies** (будущая поддержка)

### Получение JWT токена

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: helpdev" \
  -d '{"email":"user@example.com","password":"password"}' \
  http://localhost:4000/auth/login
```

## 📡 API Endpoints

### API Gateway Service

#### Аутентификация

- `POST /auth/login` - Вход с получением JWT
- `POST /auth/register` - Регистрация пользователя
- `GET /config` - Конфигурация для фронтенда

#### Управление тенантами (admin)

- `GET /admin/tenants` - Список тенантов
- `POST /admin/tenants` - Создание тенанта
- `GET /admin/health` - Проверка здоровья системы

### Extensions Service

#### Работа с сущностями (требует auth)

- `GET /entities/:entity` - Список записей
- `GET /entities/:entity/:id` - Одна запись
- `POST /entities/:entity` - Создание записи
- `PUT /entities/:entity/:id` - Обновление записи
- `DELETE /entities/:entity/:id` - Удаление записи
- `POST /entities/:entity/upsert` - Upsert операция

#### Управление определениями

- `GET /definitions` - Список определений полей
- `POST /definitions` - Создание определения
- `PUT /definitions/:id` - Обновление определения
- `DELETE /definitions/:id` - Удаление определения

#### Real-time уведомления

- `POST /realtime/notify` - Отправка уведомления
- `POST /realtime/subscribe` - Подписка на обновления
- `GET /realtime/updates` - Получение обновлений
- `DELETE /realtime/subscribe/:id` - Отписка

## 🛡️ Безопасность

### Ключевые изменения

✅ **Исправлено**: Extensions сервис теперь использует **ANON_KEY** с JWT токенами пользователей  
❌ **Было**: SERVICE_KEY обходил все RLS политики

### Уровни доступа

- **user**: Стандартный пользователь с ограниченными правами
- **admin**: Администратор тенанта
- **service**: Service-to-service коммуникация
- **viewer**: Только чтение

### Изоляция данных

- Каждый тенант = отдельный Supabase проект
- Автоматическая валидация tenant ID через middleware
- JWT токены содержат права конкретного пользователя

## ⚡ Производительность

### Кэширование

```typescript
// Многоуровневое кэширование
export const tenantConfigCache = new EnhancedCache(10 * 60 * 1000); // 10 мин
export const entityDefinitionsCache = new EnhancedCache(15 * 60 * 1000); // 15 мин
export const queryResultsCache = new EnhancedCache(2 * 60 * 1000); // 2 мин
```

### Connection Pooling

```typescript
// Автоматическое управление соединениями
const client = await connectionPool.getConnection(tenantId);
// ... использование
connectionPool.returnConnection(tenantId, client);
```

### Мониторинг

```bash
# Получение метрик производительности
curl -H "Authorization: Bearer <token>" \
     http://localhost:4000/admin/performance-stats
```

## 🔧 Валидация

### Автоматическая валидация схем

```typescript
// Encore TS автоматически валидирует TypeScript интерфейсы
interface CreateEntityRequest {
  entity: string;
  data: EntityDataSchema; // Автоматическая валидация
}
```

### Кастомная валидация

```typescript
// Валидация типов полей и данных
validateFieldValue(value, FieldType.EMAIL, {
  pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$',
});
```

## 🏢 Мульти-тенантность

### Структура тенанта

```json
{
  "tenant_id": "helpdev",
  "name": "HelpDev CRM",
  "supabase_url": "https://project.supabase.co",
  "anon_key": "...",
  "service_key": "..."
}
```

### Автоматическое определение тенанта

```typescript
// Middleware автоматически извлекает и валидирует
const authData = getAuthData() as AuthData;
console.log(authData.tenantId); // "helpdev"
```

## 🧪 Тестирование

### Примеры запросов

```bash
# Получение JWT токена
TOKEN=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: helpdev" \
  -d '{"email":"test@example.com","password":"password"}' \
  http://localhost:4000/auth/login | jq -r '.data.accessToken')

# Использование JWT токена
curl -H "Authorization: Bearer $TOKEN" \
     -H "X-Tenant-ID: helpdev" \
     http://localhost:4000/entities/contacts
```

## 📊 Мониторинг и метрики

### Доступные метрики

- **Производительность**: время отклика, количество запросов, ошибки
- **Кэширование**: hit rate, размер кэшей, статистика использования
- **Соединения**: активные пулы, использование соединений
- **Безопасность**: неудачные попытки аутентификации

### Получение статистики

```bash
curl -H "Authorization: Bearer <admin_token>" \
     http://localhost:4000/admin/stats
```

## 🚀 Деплой

### Self-hosted (рекомендуемый)

```bash
# Сборка
encore build

# Деплой с секретами
encore deploy --env=production
```

### Environment Variables

```bash
# Production секреты
export ADMIN_SUPABASE_URL="https://admin.supabase.co"
export ADMIN_SUPABASE_SERVICE_KEY="..."
export SERVICE_API_KEY="..."
```

## 📝 Новые возможности

### ✅ Реализовано

- Централизованная аутентификация через `authHandler`
- Middleware система с автоматической валидацией
- Безопасная архитектура с user-level правами
- Современное управление секретами
- Real-time уведомления
- Автоматическая валидация схем
- Оптимизация производительности

### 🔮 Планируется

- WebSocket streaming APIs (полноценные)
- Графические метрики и dashboard
- Автоматическое масштабирование
- Интеграция с внешними auth провайдерами

## 🆘 Troubleshooting

### Частые проблемы

1. **Ошибка аутентификации**:

   - Проверьте правильность JWT токена
   - Убедитесь в наличии заголовка `X-Tenant-ID`

2. **Тенант не найден**:

   - Проверьте конфигурацию в административной БД
   - Убедитесь в активности тенанта

3. **Проблемы с производительностью**:
   - Проверьте метрики кэширования
   - Анализируйте медленные запросы

### Логи и диагностика

```bash
# Логи Encore
encore logs

# Статистика производительности
curl http://localhost:4000/admin/performance-stats
```

---

**Требования**: Node.js 18+, Encore CLI, TypeScript 5+

**Лицензия**: MIT

**Документация**: [Encore TS Docs](https://encore.dev/docs/ts)
