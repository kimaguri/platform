import { api, Header } from 'encore.dev/api';
import { getFrontendConfig } from '../../../src/shared/supabaseClient';
import { ApiResponse } from '../../../src/shared/types';

interface ConfigRequest {
  tenantId: Header<'X-Tenant-ID'>; // Получаем tenant ID из заголовка
}

interface ConfigResponse extends ApiResponse {
  data?: {
    url: string;
    anonKey: string;
  };
}

export const getConfig = api(
  { method: 'GET', path: '/config', expose: true },
  async ({ tenantId }: ConfigRequest): Promise<ConfigResponse> => {
    try {
      const config = await getFrontendConfig(tenantId);
      return {
        data: config,
        message: 'Configuration retrieved successfully',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to get configuration',
        message: 'Configuration retrieval failed',
      };
    }
  }
);
