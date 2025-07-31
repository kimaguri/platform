/**
 * Event Management Endpoints
 * Gateway endpoints для работы с Event Management Service
 * Включает события, аудит и уведомления
 */

import { api } from 'encore.dev/api';
import { AuthData } from '../auth';
import { eventManagementClient } from '../utils/service-clients';
import type { ConversionEvent, NotificationRecipient } from '../../services/event-management/src/types/events';

// =================================================================
// INTERFACES FOR PAYLOADS AND RESPONSES
// =================================================================

// Payloads for API endpoints
interface PublishConversionEventPayload {
  eventType: 'conversion.rule.created' | 'conversion.rule.updated' | 'conversion.rule.deleted' | 'entity.converted' | 'conversion.failed' | 'auto.conversion.triggered';
  eventData: Record<string, any>;
}

interface GetEventStatsPayload {
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface GetAuditTrailPayload {
  entityType?: string;
  entityId?: string;
  eventType?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

interface GetAuditStatsPayload {
  dateFrom?: string;
  dateTo?: string;
}

interface SendNotificationPayload {
  eventType: 'conversion.rule.created' | 'conversion.rule.updated' | 'conversion.rule.deleted' | 'entity.converted' | 'conversion.failed' | 'auto.conversion.triggered';
  event: Record<string, any>;
  recipients: Array<{
    type: 'email' | 'in_app' | 'webhook';
    target: string;
  }>;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  template?: string;
  customData?: Record<string, any>;
}

interface UpdateNotificationSettingsPayload {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  webhookEnabled: boolean;
  recipients: NotificationRecipient[];
  templates: Array<{ eventType: string; channel: string; template: string }>;
}

interface GetNotificationHistoryPayload {
  eventType?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

// Response types based on actual service implementations
type EventStats = {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByHour: Array<{ hour: string; count: number }>;
  recentEvents: Array<{
    id: string;
    type: string;
    timestamp: string;
    details: Record<string, any>;
  }>;
};

type AuditTrailResponse = {
  auditEntries: Array<{
    id: string;
    tenantId: string;
    timestamp: string;
    userId?: string;
    eventType: string;
    event: Record<string, any>;
    details: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }>;
  total: number;
};

type AuditStatsResponse = {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByUser: Record<string, number>;
  eventsByDate: Record<string, number>;
};

type NotificationSettings = {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  webhookEnabled: boolean;
  recipients: Array<{
    type: 'email' | 'in_app' | 'webhook';
    target: string;
  }>;
  templates: Array<{
    eventType: string;
    channel: string;
    template: string;
  }>;
};

type NotificationHistoryResponse = {
  notifications: Array<{
    id: string;
    channel: string;
    templateId: string;
    status: string;
    createdAt: string;
    sentAt?: string;
  }>;
  total: number;
};

// =================================================================
// API ENDPOINTS
// =================================================================

/**
 * @summary Публикация события конвертации
 */
export const publishConversionEvent = api(
  { method: 'POST', path: '/api/v1/events/publish', auth: true },
  async ({ payload, auth }: { payload: PublishConversionEventPayload; auth: AuthData }): Promise<{ success: boolean; eventId: string }> => {
    if (!['admin', 'super_admin'].includes(auth.userRole ?? '')) {
      throw new Error('Недостаточно прав для публикации событий');
    }
    // tenantId and source are handled by the service layer, not passed in client
    return eventManagementClient.publishConversionEvent(payload);
  }
);

/**
 * @summary Получение статистики по событиям
 */
export const getEventStats = api(
  { method: 'GET', path: '/api/v1/events/stats', auth: true },
  async ({ params, auth }: { params: GetEventStatsPayload; auth: AuthData }): Promise<EventStats> => {
    if (!['admin', 'super_admin'].includes(auth.userRole ?? '')) {
      throw new Error('Недостаточно прав для просмотра статистики');
    }
    return eventManagementClient.getEventStats({ ...params, tenantId: auth.tenantId });
  }
);

/**
 * @summary Получение аудиторского следа
 */
export const getAuditTrail = api(
  { method: 'GET', path: '/api/v1/audit/trail', auth: true },
  async ({ params, auth }: { params: GetAuditTrailPayload; auth: AuthData }): Promise<AuditTrailResponse> => {
    if (!['admin', 'super_admin'].includes(auth.userRole ?? '')) {
      throw new Error('Недостаточно прав для просмотра аудиторского следа');
    }
    return eventManagementClient.getAuditTrail({
      ...params,
      tenantId: auth.tenantId,
      limit: params.limit || 50,
      offset: params.offset || 0,
    });
  }
);

/**
 * @summary Получение статистики аудита
 */
export const getAuditStats = api(
  { method: 'GET', path: '/api/v1/audit/stats', auth: true },
  async ({ params, auth }: { params: GetAuditStatsPayload; auth: AuthData }): Promise<AuditStatsResponse> => {
    if (!['admin', 'super_admin'].includes(auth.userRole ?? '')) {
      throw new Error('Недостаточно прав для просмотра статистики аудита');
    }
    return eventManagementClient.getAuditStats({ ...params, tenantId: auth.tenantId });
  }
);

/**
 * @summary Отправка уведомления о конвертации
 */
export const sendConversionNotification = api(
  { method: 'POST', path: '/api/v1/notifications/send', auth: true },
  async ({ payload, auth }: { payload: SendNotificationPayload; auth: AuthData }): Promise<{ success: boolean; notificationId: string }> => {
    if (!['admin', 'super_admin'].includes(auth.userRole ?? '')) {
      throw new Error('Недостаточно прав для отправки уведомлений');
    }
    // tenantId is handled by the service layer, not passed in client
    return eventManagementClient.sendConversionNotification(payload);
  }
);

/**
 * @summary Получение настроек уведомлений
 */
export const getNotificationSettings = api(
  { method: 'GET', path: '/api/v1/notifications/settings', auth: true },
  async ({ auth }: { auth: AuthData }): Promise<NotificationSettings> => {
    return eventManagementClient.getNotificationSettings({ tenantId: auth.tenantId });
  }
);

/**
 * @summary Обновление настроек уведомлений
 */
export const updateNotificationSettings = api(
  { method: 'PUT', path: '/api/v1/notifications/settings', auth: true },
  async ({ payload, auth }: { payload: UpdateNotificationSettingsPayload; auth: AuthData }): Promise<NotificationSettings> => {
    if (!['admin', 'super_admin'].includes(auth.userRole ?? '')) {
      throw new Error('Недостаточно прав для изменения настроек уведомлений');
    }
    return eventManagementClient.updateNotificationSettings({ tenantId: auth.tenantId, ...payload });
  }
);

/**
 * @summary Получение истории уведомлений
 */
export const getNotificationHistory = api(
  { method: 'GET', path: '/api/v1/notifications/history', auth: true },
  async ({ params, auth }: { params: GetNotificationHistoryPayload; auth: AuthData }): Promise<NotificationHistoryResponse> => {
    return eventManagementClient.getNotificationHistory({
      ...params,
      tenantId: auth.tenantId,
      limit: params.limit || 50,
      offset: params.offset || 0,
    });
  }
);

/**
 * @summary Проверка работоспособности сервиса событий
 */
export const eventHealthCheck = api(
  { method: 'GET', path: '/api/v1/events/health', auth: true },
  async ({ auth }: { auth: AuthData }): Promise<{ status: string }> => {
    if (!['admin', 'super_admin'].includes(auth.userRole ?? '')) {
      throw new Error('Недостаточно прав для проверки здоровья сервиса');
    }
    return eventManagementClient.healthCheck();
  }
);
