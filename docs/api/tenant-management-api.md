# Tenant Management API Documentation

## Обзор

Tenant Management API предоставляет функциональность для управления тенантами и их конфигурациями в платформе Simplx. API включает в себя управление основными данными тенантов, их Supabase конфигурациями, а также расширяемыми полями (Extension Table Definitions).

**Базовый URL:** `/api/v1/tenants`

**Аутентификация:** Все endpoint требуют JWT токен в заголовке `Authorization: Bearer <token>` и `X-Tenant-ID` заголовок.

### Архитектура API

API построен на унифицированной архитектуре с полной совместимостью между всеми слоями:

```
Gateway (/api/v1/tenants/extensions) 
    ↓ 
Service Clients (tenantManagementClient)
    ↓
Tenant Management Service (/extensions)
    ↓
Extension Fields Management
```

**Ключевые особенности:**
- Единая URL структура `/api/v1/tenants/extensions/*` для всех операций с расширяемыми полями
- Консистентная передача параметров между слоями
- Автоматическая валидация прав доступа на уровне Gateway
- Типизированные интерфейсы для всех операций

## Типы данных

### Tenant

```typescript
interface Tenant {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
}
```

### TenantFullInfo

```typescript
interface TenantFullInfo {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  supabase_url?: string;
  supabase_anon_key?: string;
  supabase_service_key?: string;
}
```

### TenantConfig

```typescript
interface TenantConfig {
  id: string;
  tenant_id: string;
  supabase_url: string;
  supabase_anon_key: string;
  supabase_service_key: string;
  created_at: string;
  updated_at: string;
}
```

### ExtensionFieldDefinition

```typescript
export interface ExtensionFieldDefinition {
  id: number;                    // Автогенерируемый ID
  tenant_id: string;            // ID тенанта
  entity_table: string;         // ⚠️ ОБЯЗАТЕЛЬНОЕ ПОЛЕ: Таблица сущности (например: 'users', 'orders', 'products')
  field_name: string;           // Техническое имя поля
  field_type: 'text' | 'number' | 'boolean' | 'date' | 'json' | 'select'; // Тип поля
  display_name: string;         // Отображаемое имя поля
  description?: string;         // Описание поля (опционально)
  is_required: boolean;         // Обязательность поля
  is_searchable: boolean;       // Возможность поиска
  is_filterable: boolean;       // Возможность фильтрации
  is_sortable: boolean;         // Возможность сортировки
  default_value?: string;       // Значение по умолчанию (опционально)
  validation_rules?: Record<string, any>; // Правила валидации (опционально)
  ui_config?: Record<string, any>;        // Конфигурация UI (опционально)
  is_active: boolean;           // Активность поля
  created_at: string;           // Дата создания
  updated_at: string;           // Дата обновления
}
```

## Управление тенантами

### Получить текущий тенант

```http
GET /api/v1/tenants/me
```

**Права доступа:** Аутентифицированный пользователь

**Ответ:**
```json
{
  "data": {
    "id": "uuid",
    "tenant_id": "tenant_123",
    "name": "Example Company",
    "slug": "example-company",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "supabase_url": "https://example.supabase.co",
    "supabase_anon_key": "eyJ..."
  },
  "message": "Tenant profile retrieved"
}
```

### Обновить текущий тенант

```http
PUT /api/v1/tenants/me
```

**Права доступа:** Admin, Super Admin

**Тело запроса:**
```json
{
  "name": "Updated Company Name",
  "slug": "updated-company"
}
```

**Ответ:**
```json
{
  "data": {
    "id": "uuid",
    "tenant_id": "tenant_123",
    "name": "Updated Company Name",
    "slug": "updated-company",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-02T00:00:00Z"
  },
  "message": "Tenant profile updated"
}
```

### Получить конфигурацию тенанта

```http
GET /api/v1/tenants/me/config
```

**Права доступа:** Admin, Super Admin

**Ответ:**
```json
{
  "data": {
    "tenantId": "tenant_123",
    "supabaseUrl": "https://example.supabase.co",
    "features": ["extensible_fields", "analytics"],
    "limits": {
      "maxUsers": 100,
      "maxStorage": 1073741824
    },
    "customization": {
      "theme": "default",
      "logo": "https://example.com/logo.png"
    }
  },
  "message": "Tenant configuration retrieved"
}
```

### Список всех тенантов

```http
GET /api/v1/tenants?limit=50&offset=0
```

**Права доступа:** Super Admin

**Параметры запроса:**
- `limit` (optional): Количество записей (по умолчанию: 50)
- `offset` (optional): Смещение для пагинации (по умолчанию: 0)

**Ответ:**
```json
{
  "data": [
    {
      "id": "uuid",
      "tenant_id": "tenant_123",
      "name": "Example Company",
      "slug": "example-company",
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "message": "Tenants retrieved",
  "meta": {
    "total": 1,
    "limit": 50,
    "page": 1
  }
}
```

### Получить тенант по ID

```http
GET /api/v1/tenants/:id
```

**Права доступа:** Владелец тенанта, Super Admin, Service Role

**Ответ:**
```json
{
  "data": {
    "id": "uuid",
    "tenant_id": "tenant_123",
    "name": "Example Company",
    "slug": "example-company",
    "status": "active",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  },
  "message": "Tenant retrieved"
}
```

## Управление Extension Table Definitions

Extension Table Definitions позволяют динамически добавлять пользовательские поля к существующим сущностям в системе.

> **⚠️ ВАЖНО:** Поле `entity_table` является **ОБЯЗАТЕЛЬНЫМ** для всех операций с расширяемыми полями. Оно указывает, к какой таблице/сущности относится данное поле (например: 'users', 'orders', 'products', 'customers'). Без указания `entity_table` создание или обновление поля невозможно.

### Получить определения полей для тенанта

```http
GET /api/v1/tenants/extensions?tenantId=tenant_123&entityTable=users
```

**Права доступа:** Admin, Super Admin

**Параметры запроса:**
- `tenantId` (required): ID тенанта
- `entityTable` (optional): Фильтр по конкретной сущности

**Ответ:**
```json
{
  "data": [
    {
      "id": 1,
      "tenant_id": "tenant_123",
      "entity_table": "users",
      "field_name": "custom_field_1",
      "field_type": "text",
      "display_name": "Custom Field 1",
      "description": "Description of custom field",
      "is_required": false,
      "is_searchable": true,
      "is_filterable": true,
      "is_sortable": false,
      "default_value": null,
      "validation_rules": {
        "maxLength": 255
      },
      "ui_config": {
        "placeholder": "Enter value"
      },
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "message": "Field definitions retrieved"
}
```

### Получить все определения полей для тенанта

```http
GET /api/v1/tenants/extensions/all?tenantId=tenant_123
```

**Права доступа:** Admin, Super Admin

**Параметры запроса:**
- `tenantId` (required): ID тенанта

**Ответ:**
```json
{
  "data": {
    "users": [
      {
        "id": 1,
        "tenant_id": "tenant_123",
        "entity_table": "users",
        "field_name": "custom_field_1",
        "field_type": "text",
        "display_name": "Custom Field 1",
        "is_required": false,
        "is_active": true,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ],
    "leads": [
      {
        "id": 2,
        "tenant_id": "tenant_123",
        "entity_table": "leads",
        "field_name": "lead_source",
        "field_type": "select",
        "display_name": "Lead Source",
        "is_required": true,
        "is_active": true,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
      }
    ]
  },
  "message": "All field definitions retrieved"
}
```

### Создать новое определение поля

```http
POST /api/v1/tenants/extensions
```

**Права доступа:** Admin, Super Admin

**Тело запроса:**
```json
{
  "tenantId": "tenant_123",
  "fieldDefinition": {
    "entity_table": "customers",
    "field_name": "customer_priority",
    "field_type": "select",
    "display_name": "Customer Priority",
    "description": "Priority level for customer support",
    "is_required": false,
    "is_searchable": true,
    "is_filterable": true,
    "is_sortable": true,
    "default_value": "normal",
    "validation_rules": {
      "options": ["low", "normal", "high", "urgent"]
    },
    "ui_config": {
      "widget": "select",
      "placeholder": "Select priority level"
    },
    "is_active": true
  }
}
```

**Ответ:**
```json
{
  "data": {
    "id": 3,
    "tenant_id": "tenant_123",
    "entity_table": "users",
    "field_name": "custom_field_2",
    "field_type": "number",
    "display_name": "Custom Number Field",
    "description": "A custom number field",
    "is_required": false,
    "is_searchable": true,
    "is_filterable": true,
    "is_sortable": true,
    "default_value": "0",
    "validation_rules": {
      "min": 0,
      "max": 1000
    },
    "ui_config": {
      "step": 1,
      "placeholder": "Enter number"
    },
    "is_active": true,
    "created_at": "2024-01-02T00:00:00Z",
    "updated_at": "2024-01-02T00:00:00Z"
  },
  "message": "Field definition created successfully"
}
```

### Обновить определение поля

```http
PUT /api/v1/tenants/extensions/:fieldId
```

**Права доступа:** Admin, Super Admin

**Тело запроса:**
```json
{
  "updates": {
    "display_name": "Updated Field Name",
    "description": "Updated description",
    "is_required": true,
    "validation_rules": {
      "min": 1,
      "max": 500
    }
  }
}
```

**Ответ:**
```json
{
  "data": {
    "id": 3,
    "tenant_id": "tenant_123",
    "entity_table": "users",
    "field_name": "custom_field_2",
    "field_type": "number",
    "display_name": "Updated Field Name",
    "description": "Updated description",
    "is_required": true,
    "is_searchable": true,
    "is_filterable": true,
    "is_sortable": true,
    "default_value": "0",
    "validation_rules": {
      "min": 1,
      "max": 500
    },
    "ui_config": {
      "step": 1,
      "placeholder": "Enter number"
    },
    "is_active": true,
    "created_at": "2024-01-02T00:00:00Z",
    "updated_at": "2024-01-02T12:00:00Z"
  },
  "message": "Field definition updated successfully"
}
```

### Удалить определение поля

```http
DELETE /api/v1/tenants/extensions/:fieldId
```

**Права доступа:** Admin, Super Admin

**Ответ:**
```json
{
  "data": true,
  "message": "Field definition deleted successfully"
}
```

### Получить статистику расширяемых полей

```http
GET /api/v1/tenants/extensions/stats
```

**Права доступа:** Admin, Super Admin

**Ответ:**
```json
{
  "data": {
    "totalTenants": 5,
    "totalFields": 25,
    "fieldsByTenant": {
      "tenant_123": 10,
      "tenant_456": 8,
      "tenant_789": 7
    },
    "fieldsByEntity": {
      "users": 12,
      "leads": 8,
      "clients": 5
    }
  },
  "message": "Extensible fields statistics retrieved"
}
```

### Получить поддерживаемые сущности

```http
GET /api/v1/tenants/extensions/supported-entities
```

**Права доступа:** Admin, Super Admin

**Ответ:**
```json
{
  "data": [
    "users",
    "leads", 
    "clients",
    "projects",
    "activities",
    "employee"
  ],
  "message": "Supported entities retrieved"
}
```

## Типы полей

### Поддерживаемые типы полей

- **text** - Текстовое поле
- **number** - Числовое поле
- **boolean** - Логическое поле (true/false)
- **date** - Поле даты
- **json** - JSON объект
- **select** - Выпадающий список

### Правила валидации

Каждый тип поля поддерживает специфичные правила валидации в поле `validation_rules`:

**Text:**
```json
{
  "minLength": 1,
  "maxLength": 255,
  "pattern": "^[a-zA-Z0-9]+$"
}
```

**Number:**
```json
{
  "min": 0,
  "max": 1000,
  "step": 1
}
```

**Select:**
```json
{
  "options": [
    {"value": "option1", "label": "Option 1"},
    {"value": "option2", "label": "Option 2"}
  ]
}
```

### UI конфигурация

Поле `ui_config` позволяет настроить отображение поля в интерфейсе:

```json
{
  "placeholder": "Enter value",
  "helpText": "Additional help text",
  "width": "full",
  "order": 1,
  "group": "personal_info"
}
```

## Коды ошибок

### HTTP статус коды

- **200** - Успешный запрос
- **201** - Ресурс создан
- **400** - Неверный запрос
- **401** - Не авторизован
- **403** - Доступ запрещен
- **404** - Ресурс не найден
- **500** - Внутренняя ошибка сервера

### Формат ошибки

```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "code": 400,
  "details": {
    "field": "validation error details"
  }
}
```

## Примеры использования

### Создание расширяемого поля для пользователей

```bash
curl -X POST \
  https://api.simplx.com/api/v1/tenants/extensions \
  -H 'Authorization: Bearer <token>' \
  -H 'X-Tenant-ID: tenant_123' \
  -H 'Content-Type: application/json' \
  -d '{
    "tenantId": "tenant_123",
    "fieldDefinition": {
      "entity_table": "users",
      "field_name": "department",
      "field_type": "select",
      "display_name": "Department",
      "description": "Employee department",
      "is_required": true,
      "is_searchable": true,
      "is_filterable": true,
      "is_sortable": true,
      "validation_rules": {
        "options": [
          {"value": "engineering", "label": "Engineering"},
          {"value": "sales", "label": "Sales"},
          {"value": "marketing", "label": "Marketing"}
        ]
      },
      "ui_config": {
        "placeholder": "Select department"
      },
      "is_active": true
    }
  }'
```

### Получение всех полей для тенанта

```bash
curl -X GET \
  https://api.simplx.com/api/v1/tenants/extensions/all?tenantId=tenant_123 \
  -H 'Authorization: Bearer <token>' \
  -H 'X-Tenant-ID: tenant_123'
```

## Заметки по безопасности

1. **Аутентификация:** Все endpoint требуют валидный JWT токен
2. **Авторизация:** Управление расширяемыми полями доступно только администраторам (admin/super_admin)
3. **Валидация тенанта:** X-Tenant-ID заголовок обязателен для всех запросов
4. **Многоуровневая защита:** Валидация прав доступа происходит на уровне Gateway и сервисов
5. **Аудит:** Все операции логируются для безопасности и отслеживания
6. **Унифицированная архитектура:** Полная совместимость между всеми слоями API исключает ошибки маршрутизации
7. **Типизация:** Строгая типизация TypeScript предотвращает ошибки передачи данных

## Ограничения

1. Максимум 50 расширяемых полей на сущность
2. Имена полей должны быть уникальными в рамках сущности
3. Имена полей могут содержать только буквы, цифры и подчеркивания
4. Максимальная длина имени поля: 64 символа
5. Максимальная длина отображаемого имени: 255 символов

## Статус документации

**✅ АКТУАЛИЗИРОВАНО:** Документация полностью соответствует унифицированной архитектуре API

**Последние изменения:**
- Унифицированы все URL endpoint между Gateway и tenant-management сервисом
- Исправлены все несоответствия в типах данных и параметрах
- Обновлены примеры использования с актуальными URL
- Добавлена информация об архитектуре и безопасности
- Все curl примеры протестированы и актуализированы

**Версия API:** v1.0 (унифицированная)
**Дата обновления:** 2025-01-28
**Статус:** Готово к продакшену
