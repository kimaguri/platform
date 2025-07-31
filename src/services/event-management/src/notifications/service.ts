import { api } from "encore.dev/api";
import { NotificationRecipient, NotificationTemplate } from "../types/events";
import { randomUUID } from "crypto";
// Используем существующую систему коннекторов и адаптеров
import { getAdapterForTenant, getAdminAdapter } from "../../../../connectors/registry/connector-registry";

// Интерфейс для параметров отправки уведомлений
interface SendNotificationRequest {
  tenantId: string;
  userId?: string;
  eventType: string;
  templateId: string;
  data: Record<string, any>;
  channel: 'email' | 'in_app' | 'webhook';
}

/**
 * Отправка уведомления о конвертации
 * Сообщения хранятся в БД каждого тенанта через адаптеры
 */
export const sendConversionNotification = api(
  { method: "POST", path: "/notifications/send", auth: true },
  async (req: SendNotificationRequest): Promise<{ success: boolean; notificationId: string }> => {
    const notificationId = randomUUID();
    
    try {
      // Получаем адаптер для тенанта через существующую систему
      const notificationAdapter = await getAdapterForTenant(req.tenantId, 'notifications');
      
      // Сохраняем уведомление в БД тенанта через адаптер
      await notificationAdapter.insert({
        user_id: req.userId || null,
        channel: req.channel,
        template_id: req.templateId,
        event_type: req.eventType,
        data: req.data,
        status: 'pending',
        created_at: new Date().toISOString(),
        sent_at: null,
        error_message: null,
      });
      
      // Простая реализация отправки (в будущем можно расширить)
      console.log(`Notification ${notificationId} queued for ${req.channel} channel`);
      
      // Обновляем статус на отправлено
      const notificationAdapter2 = await getAdapterForTenant(req.tenantId, 'notifications');
      await notificationAdapter2.update(notificationId, {
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
      
      return { success: true, notificationId };
    } catch (error) {
      console.error('Failed to send notification:', error);
      
      try {
        const notificationAdapter3 = await getAdapterForTenant(req.tenantId, 'notifications');
        await notificationAdapter3.update(notificationId, {
          status: 'failed',
          error_message: (error as Error).message,
        });
      } catch (updateError) {
        console.error('Failed to update notification status:', updateError);
      }
      
      throw error;
    }
  }
);

/**
 * Получение настроек уведомлений для тенанта
 * Конфигурации хранятся в админской БД
 */
export const getNotificationSettings = api(
  { method: "GET", path: "/notifications/settings", auth: true },
  async (req: { tenantId: string }): Promise<{
    emailEnabled: boolean;
    inAppEnabled: boolean;
    webhookEnabled: boolean;
    recipients: NotificationRecipient[];
    templates: NotificationTemplate[];
  }> => {
    const { tenantId } = req;
    
    // Получаем настройки из админской БД через адаптер
    const adminAdapter = getAdminAdapter('notification_configs');
    const rows = await adminAdapter.query({
      filter: { tenant_id: tenantId }
    });
    
    if (rows.length === 0) {
      // Возвращаем настройки по умолчанию, если не найдены
      return {
        emailEnabled: true,
        inAppEnabled: true,
        webhookEnabled: false,
        recipients: [],
        templates: [],
      };
    }
    
    const config = rows[0] || {
      email_enabled: true,
      in_app_enabled: true,
      webhook_enabled: false,
      recipients: [],
      templates: []
    };
    return {
      emailEnabled: config.email_enabled ?? true,
      inAppEnabled: config.in_app_enabled ?? true,
      webhookEnabled: config.webhook_enabled ?? false,
      recipients: config.recipients ? (typeof config.recipients === 'string' ? JSON.parse(config.recipients) : config.recipients) : [],
      templates: config.templates ? (typeof config.templates === 'string' ? JSON.parse(config.templates) : config.templates) : [],
    };
  }
);

/**
 * Обновление настроек уведомлений
 * Конфигурации хранятся в админской БД
 */
export const updateNotificationSettings = api(
  { method: "PUT", path: "/notifications/settings", auth: true },
  async (req: {
    tenantId: string;
    emailEnabled: boolean;
    inAppEnabled: boolean;
    webhookEnabled: boolean;
    recipients?: NotificationRecipient[];
    templates?: NotificationTemplate[];
  }): Promise<{ success: boolean }> => {
    const { tenantId, emailEnabled, inAppEnabled, webhookEnabled, recipients = [], templates = [] } = req;
    
    // Вставка или обновление конфигурации в админской БД через адаптер
    const adminAdapter = getAdminAdapter('notification_configs');
    
    // Проверяем, существует ли конфигурация
    const existingConfigs = await adminAdapter.query({
      filter: { tenant_id: tenantId }
    });
    
    if (existingConfigs.length > 0) {
      // Обновляем существующую конфигурацию
      await adminAdapter.update(existingConfigs[0].id, {
        email_enabled: emailEnabled,
        in_app_enabled: inAppEnabled,
        webhook_enabled: webhookEnabled,
        recipients: recipients,
        templates: templates,
        updated_at: new Date().toISOString(),
      });
    } else {
      // Создаем новую конфигурацию
      await adminAdapter.insert({
        tenant_id: tenantId,
        email_enabled: emailEnabled,
        in_app_enabled: inAppEnabled,
        webhook_enabled: webhookEnabled,
        recipients: recipients,
        templates: templates,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    
    return { success: true };
  }
);

/**
 * Получение истории уведомлений
 * Сообщения хранятся в БД каждого тенанта через адаптеры
 */
export const getNotificationHistory = api(
  { method: "GET", path: "/notifications/history", auth: true },
  async (req: { 
    tenantId: string; 
    limit?: number; 
    offset?: number 
  }): Promise<{
    notifications: Array<{
      id: string;
      channel: string;
      templateId: string;
      status: string;
      createdAt: string;
      sentAt?: string;
    }>;
    total: number;
  }> => {
    const { tenantId, limit = 50, offset = 0 } = req;
    
    // Получаем адаптер для тенанта через существующую систему
    const notificationAdapter = await getAdapterForTenant(tenantId, 'notifications');
    
    // Получаем уведомления из БД тенанта через адаптер
    const notifications = [];
    const rows = await notificationAdapter.query({
      limit,
      offset,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    });
    
    for (const row of rows) {
      notifications.push({
        id: row.id,
        channel: row.channel,
        templateId: row.template_id,
        status: row.status,
        createdAt: row.created_at,
        sentAt: row.sent_at,
      });
    }
    
    // Получаем общее количество
    const total = await notificationAdapter.count();
    
    return {
      notifications,
      total,
    };
  }
);
