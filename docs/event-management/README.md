# Event Management Service

## 1. Обзор

**Event Management Service** — это центральный сервис, отвечающий за обработку, логирование и распространение событий, связанных с процессом конвертации данных в платформе. Он построен на событийно-ориентированной архитектуре (Event-Driven Architecture) с использованием Pub/Sub модели, что обеспечивает слабую связанность между сервисами и высокую масштабируемость.

**Ключевые задачи сервиса:**

- **Прием событий:** Предоставляет единую точку входа (`publishConversionEvent`) для других сервисов (`Data Processing`, `Tenant Management`) для публикации событий.
- **Аудит:** Автоматически логирует все события конвертации для последующего анализа, отладки и построения отчетов.
- **Уведомления:** Отправляет уведомления пользователям и внешним системам о ключевых событиях (например, успешная конвертация, ошибка, изменение правил) через различные каналы (Email, In-App, Webhooks).
- **Статистика:** Собирает и предоставляет статистику по событиям.

---

## 2. Архитектура

Сервис состоит из трех основных, слабо связанных модулей, которые взаимодействуют через Pub/Sub топики.

 <!-- Заменить на реальную диаграмму -->

### 2.1. Pub/Sub Топики

В основе архитектуры лежит система топиков, реализованная с помощью `encore.dev/pubsub`.

- **`conversion-events` (основной топик):**
  - Все события, поступающие в сервис, сначала публикуются в этот топик. Он служит центральным хабом для всех подписчиков.

- **Специализированные топики:**
  - `rule-management-events`: для событий, связанных с CRUD-операциями над правилами.
  - `conversion-execution-events`: для событий, связанных с выполнением конвертации.
  - `auto-trigger-events`: для событий, инициированных автоматическими триггерами.

### 2.2. Модули

- **API (`api.ts`):**
  - Предоставляет публичные HTTP-эндпоинты. Основная его задача — принять событие от внешнего сервиса, обогатить его метаданными (ID, timestamp) и опубликовать в основной топик `conversion-events`.

- **Audit Logger (`src/audit/logger.ts`):**
  - **Автоматически подписывается** на топик `conversion-events`.
  - При получении нового события, он преобразует его в запись `AuditLogEntry` и сохраняет в свою собственную базу данных (`audit_logs`).
  - Предоставляет API для получения истории аудита и статистики.

- **Notifications (`src/notifications/service.ts`):**
  - Также **автоматически подписывается** на топик `conversion-events`.
  - При получении события, он определяет, нужно ли отправлять уведомление, находит получателей, выбирает нужный шаблон и канал (Email, In-App, Webhook) и отправляет его.
  - Управляет настройками уведомлений для каждого тенанта.

---

## 3. Ключевые концепции

### 3.1. События (`src/types/events.ts`)

Все события наследуются от базового интерфейса `BaseEvent` и содержат общие поля: `id`, `timestamp`, `tenantId`, `userId`, `source`.

**Основные типы событий:**

- **Управление правилами:**
  - `conversion-rule-created`
  - `conversion-rule-updated`
  - `conversion-rule-deleted`
- **Выполнение конвертации:**
  - `entity-converted`
  - `conversion-failed`
- **Автоматические триггеры:**
  - `auto-conversion-triggered`

### 3.2. Базы данных

Сервис использует две изолированные базы данных:

1.  **`audit_logs`:** Хранит неизменяемый лог всех событий. Оптимизирована для записи и чтения при построении отчетов.
2.  **`notifications`:** Хранит историю отправленных уведомлений, их статусы, а также настройки и шаблоны уведомлений.

---

## 4. API и Интеграция

### 4.1. Публикация события

Для интеграции с `Event Management Service` другие сервисы должны использовать `eventManagementClient` и вызывать метод `publishConversionEvent`.

**Эндпоинт:** `POST /events/publish`

**Пример вызова из `Data Processing Service`:**

```typescript
import { eventManagementClient } from "../../../gateway/utils/service-clients";

async function publishEvent(data) {
  try {
    await eventManagementClient.publishConversionEvent({
      eventType: 'entity-converted',
      tenantId: data.tenantId,
      userId: data.userId,
      eventData: {
        ruleId: data.ruleId,
        ruleName: data.ruleName,
        sourceEntity: data.sourceEntity,
        targetEntity: data.targetEntity,
        sourceRecordId: data.sourceRecordId,
        targetRecordId: data.targetRecordId,
        conversionType: 'automatic',
        performedBy: data.userId,
        fieldMappings: data.fieldMappings,
        extensionFieldMappings: data.extensionFieldMappings,
      },
    });
  } catch (error) {
    console.error('Failed to publish conversion event:', error);
  }
}
```

### 4.2. Получение статистики

**Эндпоинт:** `GET /events/stats`

Возвращает агрегированную статистику по событиям, используя данные из модуля аудита.

### 4.3. Получение трейла аудита

**Эндпоинт:** `GET /audit/trail/:recordId`

Возвращает полную историю событий, связанных с конкретной записью (по `sourceRecordId` или `targetRecordId`).

### 4.4. Управление настройками уведомлений

- `GET /notifications/settings`: Получить текущие настройки для тенанта.
- `PUT /notifications/settings`: Обновить настройки.
- `GET /notifications/history`: Получить историю отправленных уведомлений.

---

## 5. Как это работает (сквозной пример)

1.  **`Data Processing Service`** успешно завершает конвертацию записи.
2.  Он вызывает `eventManagementClient.publishConversionEvent`, передавая событие `entity-converted` и все связанные данные.
3.  **`Event Management Service`** (`api.ts`) принимает запрос, создает `ConversionEvent` с уникальным `id` и `timestamp`, и публикует его в основной топик `conversion-events`.
4.  **Два подписчика** реагируют одновременно:
    - **`Audit Logger`** получает событие, преобразует его в `AuditLogEntry` и сохраняет в базу `audit_logs`.
    - **`Notifications Service`** получает то же событие, проверяет настройки тенанта, находит получателей (например, пользователя, инициировавшего конвертацию) и отправляет ему In-App уведомление `"Запись успешно конвертирована"`.
5.  Все операции происходят асинхронно, и `Data Processing Service` не ждет их завершения, что обеспечивает высокую производительность.
