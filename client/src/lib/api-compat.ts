// TEMPORARY compatibility helper for bridged callers
// Usage: import { legacyApiRequest } from '@/lib/api-compat';
// This file is intentionally minimal and will be removed after migration.

import { apiRequest } from './api-client';

export async function legacyApiRequest(method: string, endpoint: string, body?: any) {
  try {
    const res = await apiRequest(method, endpoint, body);
    // api-client uses throw on non-ok; on success, backend returns { success: boolean, data }
    // To preserve legacy callers that expect { success, data, error }, return as-is
    if (res && typeof res === 'object' && ('success' in res || 'data' in res)) {
      return res;
    }

    // Wrap raw payload into canonical ApiResponse-like shape for legacy consumers
    return { success: true, data: res };
  } catch (err: any) {
    // Convert thrown error into legacy-shaped failure for bridged callers
    const message = err?.message || String(err) || 'API Error';
    return { success: false, data: null, error: message };
  }
}
