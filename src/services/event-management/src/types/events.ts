// Базовый интерфейс для всех событий
export interface EventBase<T extends string, P> {
  type: T;
  payload: P;
  timestamp: string;
}

// ===============================================
// Event Definitions
// ===============================================

// 1. Правило конвертации создано
export type ConversionRuleCreated = EventBase<
  'conversion.rule.created',
  { ruleId: string; sourceEntity: string; targetEntity: string; createdBy: string; }
>;

// 2. Правило конвертации обновлено
export type ConversionRuleUpdated = EventBase<
  'conversion.rule.updated',
  { ruleId: string; updatedBy: string; changes: Record<string, any>; }
>;

// 3. Правило конвертации удалено
export type ConversionRuleDeleted = EventBase<
  'conversion.rule.deleted',
  { ruleId: string; deletedBy: string; }
>;

// 4. Сущность успешно конвертирована
export type EntityConverted = EventBase<
  'entity.converted',
  { ruleId: string; sourceRecordId: string; targetRecordId: string; executionTimeMs: number; }
>;

// 5. Ошибка конвертации
export type ConversionFailed = EventBase<
  'conversion.failed',
  { ruleId?: string; sourceRecordId: string; error: string; details?: Record<string, any>; }
>;

// 6. Сработал автоматический триггер
export type AutoConversionTriggered = EventBase<
  'auto.conversion.triggered',
  { ruleId: string; sourceRecordId: string; triggerType: 'create' | 'update'; }
>;

// Union-тип для всех событий конвертации
export type ConversionEvent =
  | ConversionRuleCreated
  | ConversionRuleUpdated
  | ConversionRuleDeleted
  | EntityConverted
  | ConversionFailed
  | AutoConversionTriggered;

// Explicit type for event types to avoid indexed access type operation error in Encore
export type ConversionEventType =
  | 'conversion.rule.created'
  | 'conversion.rule.updated'
  | 'conversion.rule.deleted'
  | 'entity.converted'
  | 'conversion.failed'
  | 'auto.conversion.triggered';

// Event payload data without service fields (to avoid Omit with Union types)
export interface ConversionEventData {
  type: ConversionEventType;
  payload: Record<string, any>;
  tenantId: string;
  userId?: string;
}

// ===============================================
// Audit Log
// ===============================================

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  timestamp: string;
  userId?: string;
  event: ConversionEvent; // The full event object, stored as JSON
  eventType: ConversionEventType;
  details: Record<string, any>; // Could be a subset of event.payload for quick access
  ipAddress?: string;
  userAgent?: string;
}

// ===============================================
// Notifications
// ===============================================

export interface NotificationRecipient {
  type: 'email' | 'in_app' | 'webhook';
  target: string; // email address, user ID, или webhook URL
}

export interface NotificationRequest {
  id: string;
  tenantId: string;
  userId: string;
  channel: 'email' | 'in_app' | 'webhook';
  templateId: string;
  data: Record<string, any>;
  createdAt: string;
}

export interface NotificationTemplate {
  id: string;
  eventType: ConversionEventType; // Corrected: No indexed access
  channel: 'email' | 'in_app' | 'webhook';
  subject?: string;
  body: string;
  variables: string[];
  isActive: boolean;
}

