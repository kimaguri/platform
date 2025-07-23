import type { ConnectorType } from '../types';
import { getTenantConfigById } from './tenant-config';

/**
 * Получает тип коннектора для указанного тенанта
 * @param tenantId ID тенанта
 * @returns Тип коннектора ('supabase' или 'native')
 */
export async function getConnectorType(tenantId: string): Promise<ConnectorType> {
  try {
    const config = await getTenantConfigById(tenantId);

    // Возвращаем тип коннектора из конфигурации или дефолтный 'supabase'
    return config?.connector_type || 'supabase';
  } catch (error) {
    console.warn(
      `Failed to get connector type for tenant ${tenantId}, using default 'supabase':`,
      error
    );
    return 'supabase'; // Дефолтное значение
  }
}

/**
 * Проверяет, поддерживается ли указанный тип коннектора
 * @param connectorType Тип коннектора для проверки
 * @returns true если тип поддерживается
 */
export function isSupportedConnectorType(connectorType: string): connectorType is ConnectorType {
  return connectorType === 'supabase' || connectorType === 'native';
}

/**
 * Получает список всех поддерживаемых типов коннекторов
 * @returns Массив поддерживаемых типов
 */
export function getSupportedConnectorTypes(): ConnectorType[] {
  return ['supabase', 'native'];
}
