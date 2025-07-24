# Task 1: Create New Directory Structure

## Overview

Creating the new directory structure according to the proposed Encore.ts architecture with zonal organization.

## Target Structure

```
platform/
├── src/
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
│   │   └── content-management/          # Управление контентом
│   │       ├── encore.service.ts
│   │       ├── content-api.ts
│   │       ├── content-service.ts
│   │       └── migrations/
│   ├── gateway/                         # API Gateway
│   │   ├── encore.service.ts            # Gateway сервис
│   │   ├── routing/                     # Маршрутизация
│   │   ├── middleware/                  # Gateway middleware
│   │   └── tenant-resolver.ts           # Определение тенанта
│   └── config/                          # Конфигурация
│       ├── database.ts                  # Конфигурация БД
│       ├── environment.ts               # Переменные окружения
│       └── connectors.ts                # Конфигурация коннекторов
```

## Progress

- [x] Create src/shared/ structure
- [x] Create src/connectors/ structure
- [x] Create src/services/ structure
- [x] Create src/gateway/ structure
- [x] Create src/config/ structure

## Created Structure

```
src/
├── config/
├── connectors/
│   ├── base/
│   ├── registry/
│   └── supabase/
│       └── migrations/
├── gateway/
│   ├── middleware/
│   └── routing/
├── services/
│   ├── content-management/
│   │   └── migrations/
│   ├── tenant-management/
│   │   └── migrations/
│   └── user-management/
│       └── migrations/
└── shared/
    ├── adminDb/                    # Existing
    ├── middleware/
    │   ├── auth/
    │   ├── logging/
    │   └── tenant/
    ├── types/
    └── utilities/
        ├── constants/
        ├── helpers/
        └── validation/
```

## Status

- **Started**: 14:00
- **Status**: ✅ Complete
- **Next**: Begin shared components migration
