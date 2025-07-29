# Руководство по настройке секретов Encore.ts

## Обзор

Система секретов Encore.ts обеспечивает безопасное управление чувствительными данными (API ключи, URL базы данных, токены) с разделением по средам.

## Архитектура

### Объявление секретов
Секреты объявляются только внутри Encore сервисов:

```typescript
// src/services/tenant-management/service.ts
import { secret } from 'encore.dev/config';

const adminSupabaseUrl = secret('AdminSupabaseUrl');
const adminSupabaseServiceKey = secret('AdminSupabaseServiceKey');
```

### Helper функции
Для доступа к секретам из других модулей используются helper функции:

```typescript
export function getAdminSupabaseUrl(): string {
  return adminSupabaseUrl();
}

export function getAdminSupabaseServiceKey(): string {
  return adminSupabaseServiceKey();
}
```

## Настройка для локальной разработки

### 1. Файл .secrets.local.cue
Создайте файл `.secrets.local.cue` в корне проекта:

```cue
// Local development secrets
AdminSupabaseUrl: "https://zshakbdzhwxfxzyqtizl.supabase.co"
AdminSupabaseServiceKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2. Переменные окружения (fallback)
Альтернативно, используйте переменные окружения:

```bash
export ADMIN_SUPABASE_URL="https://zshakbdzhwxfxzyqtizl.supabase.co"
export ADMIN_SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 3. Запуск
```bash
pnpm dev
# или
encore run
```

## Настройка для production

### 1. Через CLI
```bash
# Установка production секретов
encore secret set --type prod AdminSupabaseUrl
# Введите: https://your-production-db.supabase.co

encore secret set --type prod AdminSupabaseServiceKey  
# Введите ваш production service key
```

### 2. Сборка Docker образа
```bash
# Секреты автоматически включаются в образ
encore build docker myapp:1.0
```

### 3. Запуск на VPS
```bash
docker run -d -p 80:8080 myapp:1.0
# Секреты уже внутри образа
```

## Альтернативный подход: Direct Secrets

Для гибкой ротации секретов используйте direct secrets через ENV:

### 1. Обновите encore.app
```cue
secrets: {
  AdminSupabaseUrl: env:ADMIN_SUPABASE_URL
  AdminSupabaseServiceKey: env:ADMIN_SUPABASE_SERVICE_KEY
}
```

### 2. Запуск с переменными
```bash
docker run -e ADMIN_SUPABASE_URL=$URL -e ADMIN_SUPABASE_SERVICE_KEY=$KEY myapp:1.0
```

## Управление секретами

### Просмотр
```bash
encore secret list
encore secret list --type prod
```

### Обновление
```bash
encore secret set --type prod AdminSupabaseUrl
```

### Удаление
```bash
encore secret delete --type local AdminSupabaseUrl
```

## Безопасность

### ✅ Что делать:
- Использовать `.secrets.local.cue` для локальной разработки
- Добавить `*.secrets.cue` в `.gitignore`
- Разделять секреты по средам (local, dev, prod)
- Использовать service_role ключи для админских операций

### ❌ Что НЕ делать:
- Коммитить файлы с секретами в git
- Хардкодить секреты в коде
- Использовать production секреты в development
- Логировать значения секретов

## Troubleshooting

### Ошибка "secret value is missing"
```bash
# Установите секрет для текущей среды
encore secret set --type local AdminSupabaseUrl
```

### Ошибка "secrets must be loaded from within services"
- Убедитесь, что `secret()` вызывается только внутри Encore сервисов
- Используйте helper функции для доступа из других модулей

### Fallback к переменным окружения
Если Encore секреты недоступны, система автоматически использует:
- `process.env.ADMIN_SUPABASE_URL`
- `process.env.ADMIN_SUPABASE_SERVICE_KEY`

## Примеры использования

### В сервисе
```typescript
// service.ts
import { secret } from 'encore.dev/config';

const dbUrl = secret('AdminSupabaseUrl');

export function getDbUrl(): string {
  return dbUrl();
}
```

### В модуле
```typescript
// module.ts
import { getDbUrl } from '../service';

function connectToDb() {
  const url = getDbUrl();
  // использовать url
}
```

## CI/CD интеграция

### GitHub Actions
```yaml
- name: Set secrets
  run: |
    encore secret set --type prod AdminSupabaseUrl <<< "${{ secrets.ADMIN_SUPABASE_URL }}"
    encore secret set --type prod AdminSupabaseServiceKey <<< "${{ secrets.ADMIN_SERVICE_KEY }}"

- name: Build
  run: encore build docker myapp:${{ github.sha }}
```

### Deployment
```bash
# Секреты уже в образе, просто запускаем
docker run -d myapp:latest
```
