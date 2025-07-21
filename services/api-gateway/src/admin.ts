import { api } from 'encore.dev/api';
import { clearConfigCache } from '../../../src/shared/tenantConfig';
import { ApiResponse } from '../../../src/shared/types';

interface ClearCacheResponse extends ApiResponse {
  data?: {
    cleared: boolean;
    timestamp: string;
  };
}

/**
 * Очищает кэш конфигурации тенантов
 * Полезно после обновления Encore секретов
 */
export const clearCache = api(
  { method: 'POST', path: '/admin/clear-cache', expose: true },
  async (): Promise<ClearCacheResponse> => {
    try {
      clearConfigCache();

      return {
        data: {
          cleared: true,
          timestamp: new Date().toISOString(),
        },
        message: 'Configuration cache cleared successfully',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to clear cache',
        message: 'Cache clearing failed',
      };
    }
  }
);
