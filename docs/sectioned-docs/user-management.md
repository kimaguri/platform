# User Management Service

## Назначение
Аутентификация, управление пользователями, профили, роли, позиции. Единая точка для bootstrap-данных.

## Возможности
- Регистрация, вход, выход
- Получение/обновление профиля
- Получение всех справочных и конфигурационных данных (bootstrap)

## Ключевые эндпоинты
- `/auth/login`, `/auth/register`, `/auth/logout` — аутентификация
- `/users/me` — профиль пользователя
- `/bootstrap` — агрегированный ответ

## Пример bootstrap-ответа
```json
{
  "user": {"id": "uuid", "email": "..."},
  "dictionaries": [{"id": "...", "dictionary_value": [...]}, ...],
  "resources": [...],
  "permissions": [...],
  "config": {...}
}
```
