import { ConnectorRegistry } from './registry/connector-registry';
import { getConnectorType } from '../shared/utilities/connector-helper';
import { getTenantConfigById } from '../shared/utilities/tenant-config';
import type { DatabaseAdapter } from './base/database-adapter';
import type { ConnectorType } from '../shared/types';
import type { ConnectionConfig } from '../shared/types/connector';

// Глобальный реестр коннекторов
const registry = new ConnectorRegistry();

/**
 * Получает коннектор для тенанта с автоматическим определением типа
 * @param tenantId ID тенанта
 * @param keyType Тип ключа ('anon' или 'service')
 * @returns Database adapter instance
 */
export async function getConnector(
  tenantId: string,
  options: { type?: 'anon' | 'service' } = {}
): Promise<DatabaseAdapter> {
  // Получаем тип коннектора из конфигурации тенанта
  const connectorType = await getConnectorType(tenantId);

  // Получаем конфигурацию тенанта
  const tenantConfig = await getTenantConfigById(tenantId);
  if (!tenantConfig) {
    throw new Error(`Configuration for tenant '${tenantId}' not found`);
  }

  // Создаем конфигурацию подключения в зависимости от типа коннектора
  let connectionConfig: ConnectionConfig;

  if (connectorType === 'supabase') {
    connectionConfig = {
      url: tenantConfig.SUPABASE_URL,
      key: options.type === 'service' ? tenantConfig.SERVICE_KEY : tenantConfig.ANON_KEY,
      type: connectorType,
    };
  } else if (connectorType === 'native') {
    // Для native коннектора используем другую конфигурацию
    // Пока используем те же параметры, но можно расширить
    connectionConfig = {
      url: tenantConfig.SUPABASE_URL,
      key: options.type === 'service' ? tenantConfig.SERVICE_KEY : tenantConfig.ANON_KEY,
      type: connectorType,
    };
  } else {
    throw new Error(`Unsupported connector type: ${connectorType}`);
  }

  // Получаем коннектор через реестр
  return registry.getConnector(tenantId, connectorType, connectionConfig);
}

/**
 * Получает коннектор с явным указанием типа (для обратной совместимости)
 * @param connectorType Тип коннектора
 * @param tenantId ID тенанта
 * @param options Опции подключения
 * @returns Database adapter instance
 * @deprecated Используйте getConnector() для автоматического определения типа
 */
export async function getConnectorExplicit(
  connectorType: ConnectorType,
  tenantId: string,
  options: { type?: 'anon' | 'service' } = {}
): Promise<DatabaseAdapter> {
  const tenantConfig = await getTenantConfigById(tenantId);
  if (!tenantConfig) {
    throw new Error(`Configuration for tenant '${tenantId}' not found`);
  }

  const connectionConfig: ConnectionConfig = {
    url: tenantConfig.SUPABASE_URL,
    key: options.type === 'service' ? tenantConfig.SERVICE_KEY : tenantConfig.ANON_KEY,
    type: connectorType,
  };

  return registry.getConnector(tenantId, connectorType, connectionConfig);
}

/**
 * Получает статистику коннекторов
 */
export function getConnectorStats() {
  return registry.getStats();
}

/**
 * Отключает все коннекторы
 */
export async function disconnectAllConnectors(): Promise<void> {
  return registry.disconnectAll();
}

/**
 * Получает список поддерживаемых типов коннекторов
 */
export function getSupportedConnectorTypes(): string[] {
  return registry.getRegisteredTypes();
}
