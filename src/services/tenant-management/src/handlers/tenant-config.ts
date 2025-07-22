import { api } from 'encore.dev/api';
import { createSupabaseConfig } from '../../../../shared/adminDb/client';
import {
  CreateSupabaseConfigRequest,
  TenantSupabaseConfig,
} from '../../../../shared/adminDb/types';
import { clearConfigCache } from '../../../../shared/tenantConfig';
import { ApiResponse } from '../../../../shared/types';

// ===== КОНФИГУРАЦИЯ SUPABASE =====

interface CreateConfigApiRequest extends CreateSupabaseConfigRequest {
  tenantId: string;
}

export const createTenantConfig = api(
  { method: 'POST', path: '/tenants/:tenantId/config', expose: true },
  async ({
    tenantId,
    ...configData
  }: CreateConfigApiRequest): Promise<ApiResponse<TenantSupabaseConfig>> => {
    try {
      const config = await createSupabaseConfig({
        ...configData,
        tenant_id: tenantId,
      });

      if (!config) {
        return {
          error: 'Failed to create Supabase configuration',
          message: 'Configuration creation failed',
        };
      }

      // Очищаем кэш после создания конфигурации
      clearConfigCache();

      return {
        data: config,
        message: 'Supabase configuration created successfully',
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Failed to create configuration',
        message: 'Configuration creation failed',
      };
    }
  }
);
