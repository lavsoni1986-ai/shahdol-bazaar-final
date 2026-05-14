/**
 * ============================================
 * STANDARD API RESPONSE LAYER - BharatOS
 * ============================================
 * Consistent, observable, and explainable API responses
 *
 * Ensures all API endpoints return standardized responses
 * Enables frontend predictability and system observability
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    version?: string;
    [key: string]: any;
  };
}

export interface SuccessResponse<T = any> extends ApiResponse<T> {
  success: true;
  data: T;
  meta?: ApiResponse['meta'];
}

export interface ErrorResponse extends ApiResponse<never> {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: ApiResponse['meta'];
}

/**
 * Standard success response
 */
export const success = <T = any>(
  data: T,
  meta: Partial<ApiResponse['meta']> = {}
): SuccessResponse<T> => ({
  success: true,
  data,
  meta: {
    timestamp: new Date().toISOString(),
    version: '1.0',
    ...meta,
  },
});

/**
 * Standard error response
 */
export const failure = (
  code: string,
  message: string,
  details: any = null,
  meta: Partial<ApiResponse['meta']> = {}
): ErrorResponse => ({
  success: false,
  error: {
    code,
    message,
    details,
  },
  meta: {
    timestamp: new Date().toISOString(),
    version: '1.0',
    ...meta,
  },
});

/**
 * Validation error response (from Zod)
 */
export const validationError = (
  errors: Array<{ field: string; message: string; code: string }>,
  meta: Partial<ApiResponse['meta']> = {}
): ErrorResponse => failure(
  'VALIDATION_ERROR',
  'Validation failed',
  { validationErrors: errors },
  meta
);

/**
 * Not found response
 */
export const notFound = (
  resource: string,
  meta: Partial<ApiResponse['meta']> = {}
): ErrorResponse => failure(
  'NOT_FOUND',
  `${resource} not found`,
  { resource },
  meta
);

/**
 * Unauthorized response
 */
export const unauthorized = (
  message: string = 'Authentication required',
  meta: Partial<ApiResponse['meta']> = {}
): ErrorResponse => failure('AUTH_ERROR', message, { type: 'auth' }, meta);

/**
 * Forbidden response
 */
export const forbidden = (
  message: string = 'Access denied',
  meta: Partial<ApiResponse['meta']> = {}
): ErrorResponse => failure('FORBIDDEN', message, { type: 'permission' }, meta);

/**
 * Server error response
 */
export const serverError = (
  message: string = 'Internal server error',
  details: any = null,
  meta: Partial<ApiResponse['meta']> = {}
): ErrorResponse => failure('SERVER_ERROR', message, details, meta);

/**
 * Rate limit exceeded response
 */
export const rateLimitExceeded = (
  retryAfter: number,
  meta: Partial<ApiResponse['meta']> = {}
): ErrorResponse => failure(
  'RATE_LIMIT_EXCEEDED',
  'Rate limit exceeded',
  { retryAfter, type: 'rate_limit' },
  meta
);

/**
 * ENFORCED DISTRICT FILTERING HELPER
 * Ensures ALL queries include districtId for multi-tenant isolation
 *
 * @param where - Base where clause
 * @param req - Express request with districtId
 * @returns Where clause with districtId enforced
 */
export function withDistrict(where: any, req: any): any {
  if (!req.districtId) {
    throw new Error("District context required");
  }
  return {
    ...where,
    districtId: req.districtId
  };
}

export default {
  success,
  failure,
  validationError,
  notFound,
  unauthorized,
  forbidden,
  serverError,
  rateLimitExceeded,
  withDistrict,
};