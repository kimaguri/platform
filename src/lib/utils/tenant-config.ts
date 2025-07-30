import { TenantsConfig, TenantConfig } from '../types';
import {
  getAllTenantConfigs,
  getTenantConfigById as getAdminTenantConfigById,
  checkAdminConnection,
} from '../../services/tenant-management/src/admin-operations';

// Кэш для конфигураций тенантов
let configCache: TenantsConfig | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 2 * 60 * 1000; // 2 минуты для DB подхода

/**
 * Парсит конфигурацию тенантов из базы данных
 * @returns Объект с конфигурациями всех тенантов
 */
export async function getTenantConfig(): Promise<TenantsConfig> {
  // Проверяем кэш
  const now = Date.now();
  if (configCache && now - cacheTimestamp < CACHE_TTL) {
    return configCache;
  }

  try {
    // Загружаем из базы данных
    const isDbConnected = await checkAdminConnection();

    if (isDbConnected) {
      console.log('Loading tenant configs from database...');
      const dbConfigsArray = await getAllTenantConfigs();

      if (dbConfigsArray.length > 0) {
        // Преобразуем массив в объект TenantsConfig
        const dbConfigs: TenantsConfig = {};
        dbConfigsArray.forEach(config => {
          dbConfigs[config.tenant_id] = {
            SUPABASE_URL: config.supabase_url,
            ANON_KEY: config.supabase_anon_key,
            SERVICE_KEY: config.supabase_service_key,
          };
        });

        // Обновляем кэш
        configCache = dbConfigs;
        cacheTimestamp = now;

        console.log(`Loaded ${Object.keys(dbConfigs).length} tenant configs from database`);
        return dbConfigs;
      }
    }
  } catch (error) {
    console.error('Failed to load from database:', error);
  }

  throw new Error('Unable to load tenant configurations from database');
}

/**
 * Сбрасывает кэш конфигурации (для принудительного обновления)
 */
export function clearConfigCache(): void {
  configCache = null;
  cacheTimestamp = 0;
  console.log('Tenant config cache cleared');
}

/**
 * Получает конфигурацию для конкретного тенанта из базы данных
 * @param tenantId ID тенанта
 * @returns Конфигурация тенанта
 */
export async function getTenantConfigById(tenantId: string): Promise<TenantConfig> {
  try {
    // Загружаем из базы данных
    const dbConfig = await getAdminTenantConfigById(tenantId);

    if (dbConfig) {
      // Приводим к any, так как реальные поля из БД отличаются от типов
      const config = dbConfig as any;
      return {
        SUPABASE_URL: config.supabase_url,
        ANON_KEY: config.anon_key,
        SERVICE_KEY: config.service_key,
      };
    }
  } catch (error) {
    console.warn(`Failed to load tenant ${tenantId} from database:`, error);
  }

  throw new Error(`Configuration for tenant '${tenantId}' not found in database`);
}

/**
 * Проверяет, существует ли конфигурация для тенанта
 * @param tenantId ID тенанта
 * @returns true если конфигурация существует
 */
export async function hasTenantConfig(tenantId: string): Promise<boolean> {
  try {
    await getTenantConfigById(tenantId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Получает список всех доступных тенантов
 * @returns Массив ID тенантов
 */
export async function getAvailableTenants(): Promise<string[]> {
  const config = await getTenantConfig();
  return Object.keys(config);
}
