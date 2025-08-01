# Конфигурация секретов для Encore TS Self-Host

## Обзор

Этот документ описывает, как правильно настроить секреты для безопасного развертывания платформы SimplX в production окружении с использованием Encore TS self-host.

## Файлы конфигурации

### 1. infra-config.json

Основной файл конфигурации инфраструктуры для self-host развертывания. Содержит метаданные приложения и определения секретов.

```json
{
  "$schema": "https://encore.dev/schemas/infra.schema.json",
  "metadata": {
    "app_id": "simplx-platform",
    "env_name": "production",
    "env_type": "production",
    "cloud": "self-hosted",
    "base_url": "https://your-domain.com"
  },
  "secrets": {
    "ADMIN_SUPABASE_URL": {"$env": "ADMIN_SUPABASE_URL"},
    "ADMIN_SUPABASE_SERVICE_KEY": {"$env": "ADMIN_SUPABASE_SERVICE_KEY"},
    "JWT_SECRET": {"$env": "JWT_SECRET"},
    "ENCRYPTION_KEY": {"$env": "ENCRYPTION_KEY"}
  }
}
```

### 2. .env файлы

Для локальной разработки и тестирования используйте `.env` файлы. В production окружении переменные окружения должны быть установлены через систему оркестрации (Docker, Kubernetes, etc).

Пример `.env` файла:

```env
# Supabase Admin Credentials
ADMIN_SUPABASE_URL=https://your-project.supabase.co
ADMIN_SUPABASE_SERVICE_KEY=your-service-role-key

# Security Secrets
JWT_SECRET=your-strong-jwt-secret
ENCRYPTION_KEY=your-strong-encryption-key
```

## Безопасность в Production

### 1. Переменные окружения

В production окружении никогда не храните секреты в файлах, которые могут попасть в репозиторий. Используйте:

- Docker secrets (для Docker Swarm)
- Kubernetes secrets (для Kubernetes)
- Систему управления секретами (HashiCorp Vault, AWS Secrets Manager, etc)
- Environment variables через платформу оркестрации

### 2. Docker Compose

В файле `docker-compose.yml` используются переменные окружения:

```yaml
services:
  gateway:
    environment:
      - ADMIN_SUPABASE_URL=${ADMIN_SUPABASE_URL}
      - ADMIN_SUPABASE_SERVICE_KEY=${ADMIN_SUPABASE_SERVICE_KEY}
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
```

### 3. Использование секретов в коде

Для self-host развертывания используется подход с переменными окружениями:

```typescript
// В конфигурационных файлах
const adminSupabaseUrl = () => process.env.ADMIN_SUPABASE_URL || '';
const adminSupabaseServiceKey = () => process.env.ADMIN_SUPABASE_SERVICE_KEY || '';

// В коде используйте функции для получения секретов
import { getSecret } from '../config/environment';

const url = getSecret('ADMIN_SUPABASE_URL');
const key = getSecret('ADMIN_SUPABASE_SERVICE_KEY');

// Или используйте специализированные функции
import { getAdminSupabaseUrl, getAdminSupabaseServiceKey } from '../lib/utils/helpers/secrets';

const url = getAdminSupabaseUrl();
const key = getAdminSupabaseServiceKey();
```

## Рекомендации по безопасности

1. **Никогда не коммитьте секреты в репозиторий**
   - Все файлы с секретами добавлены в `.gitignore`
   - Используйте `.env.example` как шаблон для новых разработчиков

2. **Ротация секретов**
   - Регулярно обновляйте JWT_SECRET и ENCRYPTION_KEY
   - Используйте короткоживущие service keys при возможности

3. **Минимизация доступа**
   - Используйте минимально необходимые права для service keys
   - Разделяйте секреты по сервисам, если возможно

4. **Мониторинг и аудит**
   - Ведите логи использования секретов
   - Настройте оповещения при подозрительном использовании

## Локальная разработка

Для локальной разработки:

1. Скопируйте `.env.example` в `.env`
2. Заполните значениями для локальной среды
3. Запустите приложение через `encore run`

```bash
cp .env.example .env
# Отредактируйте .env с локальными значениями
encore run
```

## Troubleshooting

### Ошибка: "secret not found"

Убедитесь, что:
1. Секрет определен в `infra-config.json`
2. Переменная окружения установлена в среде выполнения
3. Название секрета совпадает в конфигурации и коде

### Ошибка: "access denied to Supabase"

Проверьте:
1. Правильность ADMIN_SUPABASE_URL
2. Валидность ADMIN_SUPABASE_SERVICE_KEY
3. Что service key имеет роль `service_role`
