<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# Пересмотренная архитектура для перехода на Event-Driven Encore.ts

Вы правы! Слишком много сервисов усложнит архитектуру. Давайте оптимизируем структуру, учитывая ваши существующие сервисы и особенности системы.

## Предлагаемая архитектура сервисов

### Существующие сервисы:

- **API Gateway**
- **Tenant Management Service** (с отдельной Supabase DB для настроек тенантов)
- **User Management Service**
- **Data Processing Service** (расширим для конвертации)


### Новый сервис:

- **Event Management Service** (для Event Processing + Audit \& Notifications)


## Детальная структура сервисов

### 1. Data Processing Service (расширенный)

```typescript
// data-processing/encore.service.ts
import { Service } from "encore.dev/service";
export default new Service("data-processing");
```

**Модули внутри сервиса:**

#### `/entity-conversion/` - Модуль конвертации сущностей

```typescript
// data-processing/entity-conversion/rules.ts
import { api } from "encore.dev/api";
import { events } from "../events";

// API для управления правилами конвертации
export const createRule = api(
  { method: "POST", path: "/conversion/rules" },
  async (req: CreateRuleRequest): Promise<CreateRuleResponse> => {
    // Создание правила конвертации
    const rule = await db.createConversionRule(req);
    
    // Публикуем событие о создании правила
    await events.ruleCreated.publish({
      ruleId: rule.id,
      sourceEntity: rule.sourceEntity,
      targetEntity: rule.targetEntity,
      createdBy: req.createdBy,
      timestamp: new Date().toISOString()
    });
    
    return { success: true, ruleId: rule.id };
  }
);

export const executeConversion = api(
  { method: "POST", path: "/conversion/execute" },
  async (req: ConversionRequest): Promise<ConversionResponse> => {
    try {
      // Получаем правило конвертации
      const rule = await db.getConversionRule(req.ruleId);
      
      // Выполняем конвертацию
      const result = await performEntityConversion(rule, req);
      
      // Публикуем событие успешной конвертации
      await events.entityConverted.publish({
        ruleId: req.ruleId,
        sourceRecordId: req.sourceRecordId,
        targetRecordId: result.targetRecordId,
        sourceEntity: rule.sourceEntity,
        targetEntity: rule.targetEntity,
        conversionType: req.type,
        performedBy: req.performedBy,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      // Публикуем событие об ошибке
      await events.conversionFailed.publish({
        ruleId: req.ruleId,
        sourceRecordId: req.sourceRecordId,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }
);
```


#### `/schema-discovery/` - Модуль динамического анализа схемы

```typescript
// data-processing/schema-discovery/analyzer.ts
import { api } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";

interface EntitySchema {
  entityType: string;
  fields: FieldDefinition[];
  lastAnalyzed: string;
}

// Кэш схемы с TTL
const schemaCache = new Map<string, { schema: EntitySchema; expires: number }>();

export const analyzeEntitySchema = api(
  { method: "GET", path: "/schema/analyze/:entityType" },
  async ({ entityType }: { entityType: string }): Promise<EntitySchema> => {
    // Проверяем кэш
    const cached = schemaCache.get(entityType);
    if (cached && cached.expires > Date.now()) {
      return cached.schema;
    }
    
    // Анализируем схему БД
    const schema = await performSchemaAnalysis(entityType);
    
    // Кэшируем на 5 минут
    schemaCache.set(entityType, {
      schema,
      expires: Date.now() + 5 * 60 * 1000
    });
    
    // Публикуем событие об обновлении схемы
    await events.schemaAnalyzed.publish({
      entityType,
      fields: schema.fields,
      timestamp: new Date().toISOString()
    });
    
    return schema;
  }
);

export const getFieldMappingSuggestions = api(
  { method: "POST", path: "/schema/suggest-mapping" },
  async (req: MappingSuggestionRequest): Promise<MappingSuggestion[]> => {
    const sourceSchema = await analyzeEntitySchema({ entityType: req.sourceEntity });
    const targetSchema = await analyzeEntitySchema({ entityType: req.targetEntity });
    
    return generateSmartMappingSuggestions(sourceSchema.fields, targetSchema.fields);
  }
);
```


### 2. Event Management Service (новый)

```typescript
// event-management/encore.service.ts
import { Service } from "encore.dev/service";
export default new Service("event-management");
```

**Модули внутри сервиса:**

#### `/processing/` - Обработка событий

```typescript
// event-management/processing/handlers.ts
import { Topic, Subscription } from "encore.dev/pubsub";

// Топики для событий
export const conversionEvents = new Topic<ConversionEvent>("conversion-events", {
  deliveryGuarantee: "at-least-once",
});

export const auditEvents = new Topic<AuditEvent>("audit-events", {
  deliveryGuarantee: "at-least-once",
});

// Подписчики на события
const _ = new Subscription(conversionEvents, "process-conversion", {
  handler: async (event: ConversionEvent) => {
    // Обработка событий конвертации
    await processConversionEvent(event);
  },
});

const _ = new Subscription(auditEvents, "log-audit", {
  handler: async (event: AuditEvent) => {
    // Логирование аудита
    await logAuditEvent(event);
  },
});

// Автоматические триггеры конвертации
export const checkAutoConversion = api(
  { method: "POST", path: "/triggers/check" },
  async (req: TriggerCheckRequest): Promise<void> => {
    const rules = await getAutoConversionRules(req.entityType);
    
    for (const rule of rules) {
      if (await checkTriggerConditions(rule, req.entityData)) {
        // Публикуем событие для автоматической конвертации
        await conversionEvents.publish({
          type: 'auto-conversion-triggered',
          ruleId: rule.id,
          sourceRecordId: req.recordId,
          triggerData: req.entityData,
          timestamp: new Date().toISOString()
        });
      }
    }
  }
);
```


#### `/notifications/` - Уведомления

```typescript
// event-management/notifications/service.ts
import { api } from "encore.dev/api";

export const sendConversionNotification = api(
  { method: "POST", path: "/notifications/conversion" },
  async (req: NotificationRequest): Promise<void> => {
    // Определяем получателей уведомления
    const recipients = await getNotificationRecipients(req);
    
    // Отправляем уведомления через разные каналы
    await Promise.all([
      sendEmailNotification(recipients.email, req),
      sendInAppNotification(recipients.users, req),
      sendWebhookNotification(recipients.webhooks, req)
    ]);
  }
);

// Подписчик на события конвертации для уведомлений
const _ = new Subscription(conversionEvents, "send-notifications", {
  handler: async (event: ConversionEvent) => {
    await sendConversionNotification({
      eventType: event.type,
      data: event,
      priority: determinePriority(event)
    });
  },
});
```


#### `/audit/` - Аудит и логирование

```typescript
// event-management/audit/logger.ts
import { SQLDatabase } from "encore.dev/storage/sqldb";

const auditDB = new SQLDatabase("audit_logs", {
  migrations: "./migrations",
});

export const logConversionActivity = api(
  { method: "POST", path: "/audit/log" },
  async (req: AuditLogRequest): Promise<void> => {
    await auditDB.exec`
      INSERT INTO conversion_audit_logs (
        event_type, rule_id, source_record_id, target_record_id,
        performed_by, timestamp, details, tenant_id
      ) VALUES (
        ${req.eventType}, ${req.ruleId}, ${req.sourceRecordId}, 
        ${req.targetRecordId}, ${req.performedBy}, ${req.timestamp}, 
        ${JSON.stringify(req.details)}, ${req.tenantId}
      )
    `;
  }
);

export const getAuditTrail = api(
  { method: "GET", path: "/audit/trail/:recordId" },
  async ({ recordId }: { recordId: string }): Promise<AuditTrail[]> => {
    return await auditDB.query`
      SELECT * FROM conversion_audit_logs 
      WHERE source_record_id = ${recordId} OR target_record_id = ${recordId}
      ORDER BY timestamp DESC
    `;
  }
);
```


## Event-Driven взаимодействие между сервисами

### Типы событий

```typescript
// shared/events/types.ts
export interface ConversionRuleCreated {
  type: 'rule-created';
  ruleId: string;
  sourceEntity: string;
  targetEntity: string;
  createdBy: string;
  tenantId: string;
  timestamp: string;
}

export interface EntityConverted {
  type: 'entity-converted';
  ruleId: string;
  sourceRecordId: string;
  targetRecordId: string;
  sourceEntity: string;
  targetEntity: string;
  conversionType: 'manual' | 'automatic';
  performedBy: string;
  tenantId: string;
  timestamp: string;
  fieldMappings: Record<string, any>;
}

export interface ConversionFailed {
  type: 'conversion-failed';
  ruleId: string;
  sourceRecordId: string;
  error: string;
  errorCode: string;
  tenantId: string;
  timestamp: string;
}

export interface SchemaAnalyzed {
  type: 'schema-analyzed';
  entityType: string;
  fields: FieldDefinition[];
  tenantId: string;
  timestamp: string;
}
```


### Pub/Sub конфигурация

```typescript
// shared/events/topics.ts
import { Topic } from "encore.dev/pubsub";

// Основные топики для системы конвертации
export const conversionEvents = new Topic<ConversionEvent>("conversion-events", {
  deliveryGuarantee: "at-least-once",
});

export const schemaEvents = new Topic<SchemaEvent>("schema-events", {
  deliveryGuarantee: "at-least-once",
});

export const auditEvents = new Topic<AuditEvent>("audit-events", {
  deliveryGuarantee: "at-least-once",
});

export const notificationEvents = new Topic<NotificationEvent>("notification-events", {
  deliveryGuarantee: "at-least-once",
});
```


## Интеграция с существующими сервисами

### API Gateway - маршрутизация запросов

```typescript
// api-gateway/routes/conversion.ts
import { dataProcessing } from "~encore/clients";

export const createConversionRule = api(
  { method: "POST", path: "/api/v1/conversion/rules", auth: true },
  async (req: CreateRuleRequest, { auth }): Promise<CreateRuleResponse> => {
    // Проверяем права доступа через Tenant Management
    await validateTenantAccess(auth.userID, req.tenantId);
    
    // Делегируем обработку в Data Processing Service
    return await dataProcessing.createRule({
      ...req,
      createdBy: auth.userID
    });
  }
);
```


### Tenant Management Service - мульти-тенантность

```typescript
// tenant-management/conversion-config.ts
export const getConversionConfig = api(
  { method: "GET", path: "/tenants/:tenantId/conversion-config" },
  async ({ tenantId }: { tenantId: string }): Promise<ConversionConfig> => {
    // Получаем конфигурацию конвертации для тенанта из отдельной Supabase DB
    return await tenantDB.getConversionSettings(tenantId);
  }
);
```


### User Management Service - авторизация

```typescript
// user-management/permissions.ts
export const checkConversionPermissions = api(
  { method: "POST", path: "/users/check-permissions" },
  async (req: PermissionRequest): Promise<PermissionResponse> => {
    return {
      canCreateRules: await hasPermission(req.userId, 'conversion:create'),
      canExecuteConversion: await hasPermission(req.userId, 'conversion:execute'),
      canViewAudit: await hasPermission(req.userId, 'audit:view')
    };
  }
);
```


## Пошаговый план миграции

### Этап 1: Подготовка Event Management Service (2 недели)

1. **Создание Event Management Service**
    - Настройка Pub/Sub топиков
    - Базовые обработчики событий
    - Система уведомлений
2. **Настройка аудита и логирования**
    - База данных для audit logs
    - API для записи и чтения логов

### Этап 2: Расширение Data Processing Service (3 недели)

1. **Создание модуля entity-conversion**
    - Перенос логики создания правил
    - API для выполнения конвертации
    - Интеграция с событиями
2. **Создание модуля schema-discovery**
    - Динамический анализ схемы БД
    - Кэширование метаданных
    - Умные предложения маппинга

### Этап 3: Интеграция с существующими сервисами (2 недели)

1. **Обновление API Gateway**
    - Новые роуты для конвертации
    - Интеграция с Data Processing Service
2. **Расширение Tenant Management**
    - Конфигурация конвертации per tenant
    - Настройки уведомлений

### Этап 4: Постепенная миграция фронтенда (4 недели)

1. **Обновление EntityConversionRulesManager**
    - Замена прямых вызовов Supabase на API calls
    - Адаптация под новую архитектуру событий
2. **Тестирование и оптимизация**
    - A/B тестирование старой и новой системы
    - Мониторинг производительности

## Преимущества предложенной архитектуры

### 1. **Модульность без избыточности**[^1][^2]

- Логичное разделение по существующим сервисам
- Модули внутри сервисов для детальной организации
- Переиспользование существующей инфраструктуры


### 2. **Event-Driven коммуникация**[^3][^4]

- Асинхронная обработка конвертаций
- Надежная доставка событий через Pub/Sub
- Возможность добавления новых обработчиков без изменения кода


### 3. **Масштабируемость**[^5][^6]

- Независимое масштабирование модулей
- Горизонтальное масштабирование через Encore
- Оптимизация ресурсов под нагрузку


### 4. **Мульти-тенантность**

- Изоляция данных между тенантами
- Гибкая конфигурация per tenant
- Централизованное управление настройками


### 5. **Observability и мониторинг**[^5]

- Автоматический трейсинг между сервисами
- Структурированное логирование событий
- Метрики производительности из коробки

Эта архитектура позволяет сохранить существующую структуру сервисов, добавив только один новый сервис для управления событиями, при этом получив все преимущества event-driven архитектуры и современных практик разработки с Encore.ts.

<div style="text-align: center">⁂</div>

[^1]: https://www.youtube.com/watch?v=hmrqTf4ReLw

[^2]: https://encore.dev/docs/ts/primitives/app-structure

[^3]: https://dev.to/encore/building-simple-event-driven-applications-with-pubsub-k57

[^4]: https://encore.cloud/resources/event-driven-architecture

[^5]: https://bestofjs.org/projects/encore

[^6]: https://encore.dev

[^7]: https://encore.dev/docs/ts/primitives/services

[^8]: https://ieeechicago.org/microservices-design-patterns-for-cloud-architecture/

[^9]: https://github.com/encoredev/examples/blob/main/ts/hello-world/README.md

[^10]: https://www.geeksforgeeks.org/system-design/microservices-design-patterns/

[^11]: https://www.youtube.com/watch?v=HCQCuvoEL04

[^12]: https://microservices.io/post/architecture/2024/09/09/modular-monolith-patterns-for-fast-flow.html

[^13]: https://encore.dev/docs/platform/migration/try-encore

[^14]: https://phptutorialpoints.in/encore-ts/

[^15]: https://vfunction.com/blog/microservices-architecture-guide/

[^16]: https://dev.to/shanu001x/encorets-back-end-development-game-changer-3lkl

[^17]: https://encore.cloud/resources/node-js-frameworks

[^18]: https://microservices.io/patterns/microservices.html

[^19]: https://encore.dev/docs/ts/primitives/defining-apis

[^20]: https://www.codesee.io/learning-center/microservices-design-patterns

[^21]: https://dev.to/encore/nestjs-vs-encorets-choosing-the-right-framework-for-your-typescript-microservices-1g61

[^22]: https://pretius.com/blog/modular-software-architecture

[^23]: https://dev.to/encore/how-to-build-a-polling-system-with-node-typescript-using-encorets-1219

[^24]: https://www.linkedin.com/pulse/should-i-use-microservices-modular-architecture-vs-dinesh-dhongade-5fglf

