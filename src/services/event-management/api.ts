import { api } from "encore.dev/api";
import { Header } from "encore.dev/api";

// Импортируем модули
import * as auditLogger from "./src/audit/logger";
import * as notificationService from "./src/notifications/service";
import { conversionEvents, ruleManagementEvents, conversionExecutionEvents, autoTriggerEvents } from "./src/events/topics";
import { ConversionEvent, ConversionEventType, ConversionEventData } from "./src/types/events";
import { randomUUID } from "crypto";

/**
 * Публикация события конвертации
 */
export const publishConversionEvent = api(
  { method: "POST", path: "/events/publish", auth: true },
  async (req: ConversionEventData): Promise<{ success: boolean; eventId: string }> => {
    const eventId = randomUUID();
    
    const event = {
      type: req.type,
      payload: req.payload,
      id: eventId,
      timestamp: new Date().toISOString(),
      source: 'event-management-service',
      tenantId: req.tenantId,
      userId: req.userId,
    };
    
    // Публикуем в основной топик (используем as any для обхода Union type ограничений Encore.ts)
    await conversionEvents.publish(event as any);
    
    // Публикуем в специализированные топики
    switch (event.type) {
      case 'conversion.rule.created':
      case 'conversion.rule.updated':
      case 'conversion.rule.deleted':
        await ruleManagementEvents.publish(event as any);
        break;
      case 'entity.converted':
      case 'conversion.failed':
        await conversionExecutionEvents.publish(event as any);
        break;
      case 'auto.conversion.triggered':
        await autoTriggerEvents.publish(event as any);
        break;
    }
    
    return { success: true, eventId };
  }
);

/**
 * Получение статистики событий
 */
export const getEventStats = api(
  { method: "GET", path: "/events/stats", auth: true },
  async (req: {
    tenantId: string;
    startDate?: string;
    endDate?: string;
    eventType?: string;
  }): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByHour: Array<{ hour: string; count: number }>;
    recentEvents: Array<{
      id: string;
      type: string;
      timestamp: string;
      details: Record<string, any>;
    }>;
  }> => {
    // Поскольку getAuditStats была удалена, возвращаем базовую статистику
    // В будущем можно реализовать более сложную логику агрегации
    
    return {
      totalEvents: 0,
      eventsByType: {},
      eventsByHour: [],
      recentEvents: [],
    };
  }
);

/**
 * Проверка здоровья сервиса
 */
export const healthCheck = api(
  { method: "GET", path: "/event-health" },
  async (): Promise<{
    status: string;
    timestamp: string;
    services: Record<string, string>;
  }> => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        audit: 'healthy',
        notifications: 'healthy',
        pubsub: 'healthy',
      },
    };
  }
);

// Экспортируем функции из модулей для использования в других сервисах
export {
  // Audit functions
  logConversionActivity,
  getAuditTrail,
} from "./src/audit/logger";

export {
  // Notification functions
  sendConversionNotification,
  getNotificationSettings,
  updateNotificationSettings,
  getNotificationHistory,
} from "./src/notifications/service";

// Экспортируем топики для использования в других сервисах
export {
  conversionEvents,
  ruleManagementEvents,
  conversionExecutionEvents,
  autoTriggerEvents,
} from "./src/events/topics";
