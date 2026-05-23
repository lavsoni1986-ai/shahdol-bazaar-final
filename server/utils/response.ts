/**
 * Standardized API Responses
 * All endpoints must use these utilities
 */

export function success<T>(data: T) {
  return {
    success: true,
    data
  };
}

export function error(message: string, details?: unknown) {
  return {
    success: false,
    error: message,
    ...(details ? { details } : {})
  };
}

export function paginated<T>(data: T[], total: number, page: number, limit: number) {
  return {
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    }
  };
}
