/**
 * Error Handler Utility
 * Centralized error handling for better debugging and user experience
 */

export interface AppError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

/**
 * Format error for user display
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Log error with context
 */
export function logError(error: unknown, context?: string): void {
  const timestamp = new Date().toISOString();
  const errorMessage = formatError(error);
  
  console.error(`[ERROR] ${timestamp}${context ? ` [${context}]` : ''}:`, errorMessage);
  
  if (error instanceof Error && error.stack) {
    console.error('Stack trace:', error.stack);
  }
  
  // In production, send to error tracking service (e.g., Sentry)
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate error tracking service
    // trackError(error, context);
  }
}

/**
 * Handle API errors gracefully
 */
export function handleApiError(error: unknown, defaultMessage = 'Request failed'): AppError {
  logError(error, 'API');
  
  if (error instanceof Error) {
    // Check for network errors
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      return {
        message: 'Network error. Please check your internet connection.',
        code: 'NETWORK_ERROR',
        status: 0,
      };
    }
    
    // Check for timeout errors
    if (error.message.includes('timeout') || error.message.includes('Timeout')) {
      return {
        message: 'Request timed out. Please try again.',
        code: 'TIMEOUT',
        status: 408,
      };
    }
    
    return {
      message: error.message || defaultMessage,
      code: 'API_ERROR',
    };
  }
  
  return {
    message: defaultMessage,
    code: 'UNKNOWN_ERROR',
  };
}

/**
 * Handle database errors
 */
export function handleDbError(error: unknown): AppError {
  logError(error, 'DATABASE');
  
  const defaultMessage = 'Database error. Please try again later.';
  
  if (error instanceof Error) {
    // Check for connection errors
    if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
      return {
        message: 'Database connection failed. Please try again later.',
        code: 'DB_CONNECTION_ERROR',
        status: 503,
      };
    }
    
    // Check for timeout errors
    if (error.message.includes('timeout')) {
      return {
        message: 'Database request timed out. Please try again.',
        code: 'DB_TIMEOUT',
        status: 504,
      };
    }
  }
  
  return {
    message: defaultMessage,
    code: 'DB_ERROR',
    status: 500,
  };
}

/**
 * Validate error response from API
 */
export function validateErrorResponse(response: Response): Promise<AppError> {
  return response.json()
    .then((data: any) => {
      return {
        message: data.message || `HTTP ${response.status}: ${response.statusText}`,
        code: data.code || 'HTTP_ERROR',
        status: response.status,
        details: data,
      };
    })
    .catch(() => {
      return {
        message: `HTTP ${response.status}: ${response.statusText}`,
        code: 'HTTP_ERROR',
        status: response.status,
      };
    });
}
