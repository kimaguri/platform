# Encore Secrets & Configuration Guide

## Схема работы с секретами в Encore

### 🔧 Development (локальная разработка)

**Способ 1: Локальные переопределения (рекомендуется)**
Создайте файл `.secrets.local.cue` в корне проекта:

```cue
// .secrets.local.cue
AdminSupabaseUrl: "https://your-project.supabase.co"
AdminSupabaseServiceKey: "your-service-role-key"
```

**Способ 2: Через Encore CLI**
```bash
# Установка секретов для development
encore secret set --type dev AdminSupabaseUrl
encore secret set --type dev AdminSupabaseServiceKey
```

### 🚀 Production (Docker deployment)

**ВАЖНО:** Согласно актуальной документации Encore, `infra-config.json` должен передаваться **при сборке образа**, а не в runtime!

#### **Правильный workflow для production:**

**1. Подготовьте конфигурацию:**
```json
// infra-config.production.json
{
  "secrets": {
    "AdminSupabaseUrl": {
      "$env": "ADMIN_SUPABASE_URL"
    },
    "AdminSupabaseServiceKey": {
      "$env": "ADMIN_SUPABASE_SERVICE_KEY"
    }
  },
  "service_discovery": {
    "tenant-management": { "base_url": "http://tenant-management:4001" },
    "user-management": { "base_url": "http://user-management:4002" },
    "data-processing": { "base_url": "http://data-processing:4003" },
    "event-management": { "base_url": "http://event-management:4004" }
  }
}
```

**2. Установите переменные окружения:**
```bash
export ADMIN_SUPABASE_URL="https://your-project.supabase.co"
export ADMIN_SUPABASE_SERVICE_KEY="your-service-role-key"
```

**3. Соберите образы с конфигурацией:**
```bash
# Автоматическая сборка всех сервисов
./build-images.sh

# Или вручную для каждого сервиса:
encore build docker --config infra-config.production.json tenant-management:latest
encore build docker --config infra-config.production.json user-management:latest
encore build docker --config infra-config.production.json data-processing:latest
encore build docker --config infra-config.production.json event-management:latest
encore build docker --config infra-config.production.json gateway:latest
```

**4. Запустите единым скриптом:**
```bash
# Автоматическая сборка + запуск
./start.sh

# Или пошагово:
./build-images.sh
docker-compose up -d
```

**5. Остановка:**
```bash
./stop.sh
```

### Запуск в Production

1. **Создайте `.env` файл:**
   ```bash
   cp .env.example .env
   # Отредактируйте .env с реальными значениями
   ```

2. **Запустите с переменными окружения:**
   ```bash
   docker-compose --env-file .env up -d --build
   ```

3. **Или экспортируйте переменные:**
   ```bash
   export ADMIN_SUPABASE_URL="https://your-project.supabase.co"
   export ADMIN_SUPABASE_SERVICE_KEY="your-service-role-key"
   docker-compose up -d --build
   ```

### Безопасность

- ✅ Секреты передаются через переменные окружения
- ✅ Нет хардкода секретов в docker-compose.yml
- ✅ Файл `.env` добавлен в `.gitignore`
- ✅ Создан `.env.example` для документации

### Конфигурационные файлы

- `infra-config.json` - для development/local
- `infra-config.production.json` - для production (с переменными окружения)

### Мониторинг

Все сервисы имеют healthcheck на эндпоинте `/_encore/health`:
- Gateway: http://localhost:4000/_encore/health
- Tenant Management: http://localhost:4001/_encore/health  
- User Management: http://localhost:4002/_encore/health
- Data Processing: http://localhost:4003/_encore/health
- Event Management: http://localhost:4004/_encore/health

### Troubleshooting

Если healthcheck падает:
1. Проверьте логи: `docker-compose logs [service-name]`
2. Убедитесь, что переменные окружения установлены
3. Проверьте доступность Supabase
4. Убедитесь, что service_role ключ корректный
