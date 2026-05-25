import { createDomainError } from "./errors";
import { getDistrictFromContext } from "../contexts/DistrictContext";
import { normalizeApiUrl } from "./api-client";

// Canonical API Response Type
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: any;
}

// Runtime response validation
export function validateApiResponse<T>(result: any): ApiResponse<T> {
  if (typeof result !== 'object' || result === null) {
    throw createDomainError('api', 'Invalid API response: not an object');
  }

  if (typeof result.success !== 'boolean') {
    throw createDomainError('api', 'Invalid API response: success must be boolean');
  }

  if (!result.success && typeof result.error !== 'string') {
    throw createDomainError('api', 'Invalid API response: error must be string on failure');
  }

  return result as ApiResponse<T>;
}

// District extraction - future-ready for SSR/mobile/service workers
// TODO: Replace with actual DistrictContext consumption

export async function apiRequest<T = any>(
  method: string,
  url: string,
  options?: any
): Promise<ApiResponse<T>> {
  const startTime = Date.now();

  // CANONICAL URL BUILDING - transport layer normalization
  const apiBase = import.meta.env.VITE_API_URL || "";
  const fullUrl = normalizeApiUrl(apiBase, url);

  // Add district header for marketplace routes (exclude admin)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers
  };

  // Add district header for marketplace and analytics routes (exclude admin)
  if ((url.startsWith('marketplace/') || url.startsWith('analytics/')) && !url.includes('/admin/')) {
    const district = getDistrictFromContext();
    if (district) {
      headers['x-district-slug'] = district;
    }
  }

  // 🚀 TRANSPORT OBSERVABILITY
  const districtHeader = headers['x-district-slug'] || null;
  console.log(`[TRANSPORT] ${method} ${fullUrl}`, {
    districtHeader,
    hasAuth: !!headers['Authorization'],
    timestamp: new Date().toISOString()
  });

  const response = await fetch(fullUrl, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined
  });

  const responseTime = Date.now() - startTime;

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    console.log(`[TRANSPORT] ❌ ${method} ${url} - Invalid content-type: ${contentType} (${responseTime}ms)`);
    throw createDomainError('network', 'Invalid API response: expected JSON, got ' + contentType, { status: response.status });
  }

  const payload = await response.json();

  // 🚀 TRANSPORT OBSERVABILITY - Complete request logging
  console.log(`[TRANSPORT] ${response.ok ? '✅' : '❌'} ${method} ${url}`, {
    status: response.status,
    districtHeader,
    responseTime: `${responseTime}ms`,
    success: payload.success,
    hasData: !!payload.data,
    hasError: !!payload.error
  });

  if (!response.ok) {
    return validateApiResponse({
      success: false,
      data: null,
      error: `HTTP ${response.status}: ${response.statusText}`,
      meta: null
    });
  }

  return validateApiResponse(payload);
}