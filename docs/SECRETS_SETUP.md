# Настройка секретов для self-host деплоя

## Обзор

Для безопасного self-host деплоя приложения SimplX необходимо правильно настроить систему секретов EncoreTS. В приложении используются следующие секреты:

1. `AdminSupabaseUrl` - URL административной базы данных Supabase
2. `AdminSupabaseServiceKey` - Service key для административной базы данных Supabase

## Установка секретов

Для установки секретов используется команда `encore secret set`. Секреты должны быть установлены для всех типов окружений, которые будут использоваться:

```bash
# Установка секретов для всех типов окружений
encore secret set --type dev,prod,local,pr AdminSupabaseUrl
encore secret set --type dev,prod,local,pr AdminSupabaseServiceKey
```

После выполнения команды будет предложено ввести значение секрета. Для production окружения используйте реальные значения, для локальной разработки можно использовать тестовые значения.

## Проверка установленных секретов

Для проверки установленных секретов можно использовать команду:

```bash
encore secret list
```

## Использование секретов в коде

В коде секреты используются через функцию `secret()` из `encore.dev/config`. Пример использования:

```typescript
import { secret } from 'encore.dev/config';

const adminSupabaseUrl = secret('AdminSupabaseUrl');
const adminSupabaseServiceKey = secret('AdminSupabaseServiceKey');

// Использование в коде
const url = adminSupabaseUrl();
const key = adminSupabaseServiceKey();
```

## Особенности self-host деплоя

1. При self-host деплое секреты должны быть установлены до запуска приложения
2. Секреты не должны храниться в репозитории (файлы .secrets.*.cue добавлены в .gitignore)
3. Для локальной разработки можно использовать файл `.secrets.local.cue` (см. пример в репозитории)

## Переменные окружения

В `encore.app` объявлены следующие переменные окружения для секретов:

```json
{
  "ADMIN_SUPABASE_URL": { "required": true },
  "ADMIN_SUPABASE_SERVICE_KEY": { "required": true }
}
```

Эти переменные будут автоматически заполнены значениями из системы секретов Encore при запуске приложения.

## Решение проблем

Если при запуске приложения возникает ошибка "secret not set", убедитесь что:

1. Секрет установлен для соответствующего типа окружения
2. Приложение запускается в правильном окружении
3. Команда `encore secret set` была выполнена успешно
