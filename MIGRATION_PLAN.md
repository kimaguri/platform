# 📋 ПЛАН МИГРАЦИИ И ИСПРАВЛЕНИЙ

## 🚨 КРИТИЧЕСКИЕ ПРОБЛЕМЫ И РЕШЕНИЯ

### 1. **Файлы вне места - МИГРАЦИЯ НУЖНА**

**Проблема:** Старые файлы используются, но лежат не в новой архитектуре.

**Файлы для миграции:**

```
src/shared/middleware.ts → src/shared/middleware/index.ts
src/shared/supabaseClient.ts → УДАЛИТЬ (перенесено в utilities)
src/shared/tenantConfig.ts → УДАЛИТЬ (перенесено в utilities)
src/shared/types.ts → src/shared/types/index.ts
```

**Действия:**

1. ✅ Создан `src/shared/utilities/helpers/tenant-client.ts` с функциями из supabaseClient.ts
2. ✅ Создан `src/shared/utilities/tenant-config.ts` с функциями из tenantConfig.ts
3. 🔄 Нужно обновить все импорты в старых сервисах
4. 🔄 Удалить старые файлы после миграции импортов

### 2. **TENANT_CONFIG - ИСПРАВЛЕНИЕ КОНФИГУРАЦИИ**

**Проблема:** В env.example указан TENANT_CONFIG, но он должен загружаться из БД.

**Правильный подход:**

- ✅ **Только админские credentials** через environment: `ADMIN_SUPABASE_URL`, `ADMIN_SUPABASE_SERVICE_KEY`
- ✅ **Tenant configs** динамически из админской БД `simplx_crm_tenant`
- ✅ **Остальные настройки** через стартовый скрипт с дефолтами

**Исправления:**

1. ✅ Обновлен `start.sh` с правильной логикой
2. ✅ Обновлен `env.example` с пояснениями
3. ✅ Убрано TENANT_CONFIG из обязательных переменных

### 3. **Encore.ts authHandler - КРИТИЧЕСКИ ВАЖНО!**

**Проблема:** Наш API Gateway НЕ ИСПОЛЬЗУЕТ встроенный authHandler Encore.ts.

**Что было неправильно:**

- Создавали свой Gateway класс
- Не использовали встроенную аутентификацию
- Middleware работал отдельно от Encore.ts auth

**Правильное решение:**

- ✅ Создан правильный authHandler с `//encore:authhandler` аннотацией
- ✅ Поддержка JWT токенов и API ключей
- ✅ Валидация тенантов
- ✅ Интеграция с Supabase для проверки токенов

## 🔧 ПЛАН ДЕЙСТВИЙ

### Шаг 1: Обновить импорты в старых сервисах

**Файлы для обновления:**

```typescript
// В services/api-gateway/src/auth.ts
import { getSupabaseAnonClient } from '../../../src/shared/supabaseClient';
// ↓ ЗАМЕНИТЬ НА ↓
import { getSupabaseAnonClient } from '@shared/utilities/helpers/tenant-client';

// В services/api-gateway/src/config.ts
import { getFrontendConfig } from '../../../src/shared/supabaseClient';
// ↓ ЗАМЕНИТЬ НА ↓
import { getFrontendConfig } from '@shared/utilities/helpers/tenant-client';

// В services/api-gateway/src/admin.ts
import { clearConfigCache } from '../../../src/shared/tenantConfig';
// ↓ ЗАМЕНИТЬ НА ↓
import { clearConfigCache } from '@shared/utilities/tenant-config';

// И так далее для всех старых сервисов...
```

### Шаг 2: Интегрировать authHandler в сервисы

**Обновить сервисы для использования Encore.ts auth:**

```typescript
// В каждом сервисе вместо middleware использовать:
import { api } from 'encore.dev/api';

export const someEndpoint = api(
  { method: 'GET', path: '/endpoint', auth: true }, // ← Использовать встроенную auth
  async (): Promise<Response> => {
    // Автоматически получаем auth data из authHandler
    return { data: 'success' };
  }
);
```

### Шаг 3: Обновить API Gateway

**Удалить самодельный Gateway, использовать Encore.ts routing:**

```typescript
// Вместо создания Gateway класса, использовать обычные api endpoints
// с централизованным authHandler
```

### Шаг 4: Тестирование

1. **Проверить аутентификацию:**

   ```bash
   curl -H "Authorization: Bearer <jwt_token>" \
        -H "X-Tenant-ID: test_tenant" \
        http://localhost:4000/api/v1/health
   ```

2. **Проверить API ключи:**
   ```bash
   curl -H "Authorization: ApiKey <service_key>" \
        -H "X-Tenant-ID: test_tenant" \
        http://localhost:4000/api/v1/admin/health
   ```

### Шаг 5: Очистка

1. Удалить старые файлы:

   ```bash
   rm src/shared/middleware.ts
   rm src/shared/supabaseClient.ts
   rm src/shared/tenantConfig.ts
   rm src/shared/types.ts
   ```

2. Удалить старые сервисы (уже сделано):
   ```bash
   rm -rf services/
   ```

## 🎯 ПРАВИЛЬНАЯ АРХИТЕКТУРА

### Environment Variables (правильно)

```bash
# ОБЯЗАТЕЛЬНЫЕ (через environment)
export ADMIN_SUPABASE_URL=https://admin-project.supabase.co
export ADMIN_SUPABASE_SERVICE_KEY=admin-service-key

# ОПЦИОНАЛЬНЫЕ (через start.sh с дефолтами)
export NODE_ENV=development
export PORT=4000
export LOG_LEVEL=debug
# ... остальные с дефолтами

# TENANT_CONFIG - НЕ ЧЕРЕЗ ENV! Загружается из админской БД
```

### Encore.ts AuthHandler (правильно)

```typescript
//encore:authhandler
export async function authHandler(params: AuthParams): Promise<AuthData> {
  // Валидация тенанта
  // Проверка JWT/API ключей
  // Возврат AuthData для всех authenticated endpoints
}
```

### API Endpoints (правильно)

```typescript
export const endpoint = api(
  { method: 'GET', path: '/path', auth: true }, // ← Использует authHandler
  async (): Promise<Response> => {
    // Автоматически получаем auth data
    return response;
  }
);
```

## ✅ СТАТУС ВЫПОЛНЕНИЯ

- ✅ **Создан правильный authHandler**
- ✅ **Обновлен стартовый скрипт**
- ✅ **Исправлен env.example**
- ✅ **Созданы utility функции**
- 🔄 **Обновить импорты в старых сервисах**
- 🔄 **Интегрировать authHandler в новые сервисы**
- 🔄 **Удалить старые файлы**
- 🔄 **Протестировать аутентификацию**

## 🚀 СЛЕДУЮЩИЕ ШАГИ

1. Обновить импорты в старых сервисах
2. Создать новые сервисы с правильным authHandler
3. Протестировать аутентификацию
4. Удалить старые файлы
5. Обновить документацию
