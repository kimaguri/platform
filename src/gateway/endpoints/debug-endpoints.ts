import { api, Header } from 'encore.dev/api';

// Debug endpoint to test header extraction
export const debugHeaders = api(
  { method: 'POST', path: '/api/v1/debug/headers', expose: true, auth: false },
  async (data: { 
    tenantId: Header<'X-Tenant-ID'>,
    anyHeader?: Header<string>
  }) => {
    return {
      receivedTenantId: data.tenantId,
      allHeaders: data.anyHeader,
      message: 'Headers received successfully'
    };
  }
);
