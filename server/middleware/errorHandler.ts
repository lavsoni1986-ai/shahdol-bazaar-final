import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodError } from 'zod';

/**
 * ============================================
 * ERROR HANDLING MIDDLEWARE
 * ============================================
 * PHASE 2 - Standardized Error Handling
 * 
 * Provides consistent error responses across all endpoints.
 * Includes standardized error codes and response format.
 */

// ============================================
// ERROR CODES
// ============================================

/**
 * Standard error codes for API responses
 */
export enum ErrorCode {
  // General errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  BAD_REQUEST = 'BAD_REQUEST',
  
  // Authentication & Authorization
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  FORBIDDEN = 'FORBIDDEN',
  AUTH_FAILED = 'AUTH_FAILED',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Business logic
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  
  // Multi-tenancy
  DISTRICT_REQUIRED = 'DISTRICT_REQUIRED',
  INVALID_DISTRICT = 'INVALID_DISTRICT',
  CROSS_TENANT_ACCESS = 'CROSS_TENANT_ACCESS',
  
  // External services
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  PAYMENT_GATEWAY_ERROR = 'PAYMENT_GATEWAY_ERROR',
}

/**
 * Success codes
 */
export enum SuccessCode {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  SUCCESS = 'SUCCESS',
}

// ============================================
// TYPES
// ============================================

/**
 * API error response structure
 */
export interface ApiError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    field?: string;
  };
  timestamp: string;
  path?: string;
}

/**
 * API success response structure
 */
export interface ApiSuccess<T = unknown> {
  success: true;
  data?: T;
  message?: string;
  code?: SuccessCode;
  timestamp: string;
}

/**
 * Application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================
// RESPONSE HELPERS
// ============================================

/**
 * Send error response
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>,
  field?: string
): Response<ApiError> {
  const errorResponse: ApiError = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(field && { field }),
    },
    timestamp: new Date().toISOString(),
  };

  return res.status(statusCode).json(errorResponse);
}

/**
 * Send success response
 */
export function sendSuccess<T>(
  res: Response,
  data?: T,
  message?: string,
  code?: SuccessCode
): Response<ApiSuccess<T>> {
  const successResponse: ApiSuccess<T> = {
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message }),
    ...(code && { code }),
    timestamp: new Date().toISOString(),
  };

  return res.status(200).json(successResponse);
}

/**
 * Send created response
 */
export function sendCreated<T>(
  res: Response,
  data: T,
  message: string = 'Resource created successfully'
): Response<ApiSuccess<T>> {
  const successResponse: ApiSuccess<T> = {
    success: true,
    data,
    message,
    code: SuccessCode.CREATED,
    timestamp: new Date().toISOString(),
  };

  return res.status(201).json(successResponse);
}

/**
 * Send no content response
 */
export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

// ============================================
// ERROR FACTORIES
// ============================================

/**
 * Create not found error
 */
export function notFoundError(
  resource: string,
  details?: Record<string, unknown>
): AppError {
  return new AppError(
    `${resource} not found`,
    404,
    ErrorCode.NOT_FOUND,
    details
  );
}

/**
 * Create bad request error
 */
export function badRequestError(
  message: string,
  details?: Record<string, unknown>
): AppError {
  return new AppError(message, 400, ErrorCode.BAD_REQUEST, details);
}

/**
 * Create validation error
 */
export function validationError(
  message: string,
  field?: string,
  details?: Record<string, unknown>
): AppError {
  return new AppError(
    message,
    400,
    ErrorCode.VALIDATION_ERROR,
    { ...details, field }
  );
}

/**
 * Create unauthorized error
 */
export function unauthorizedError(
  message: string = 'Authentication required'
): AppError {
  return new AppError(message, 401, ErrorCode.AUTH_REQUIRED);
}

/**
 * Create forbidden error
 */
export function forbiddenError(
  message: string = 'Access denied'
): AppError {
  return new AppError(message, 403, ErrorCode.FORBIDDEN);
}

/**
 * Create conflict error (already exists)
 */
export function conflictError(
  message: string,
  details?: Record<string, unknown>
): AppError {
  return new AppError(message, 409, ErrorCode.ALREADY_EXISTS, details);
}

// ============================================
// EXPRESS MIDDLEWARE
// ============================================

/**
 * Global error handler middleware
 * 
 * Must be the last middleware in the chain.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response<ApiError> {
  // Log error for debugging
  console.error('❌ [ERROR]', {
    name: err.name,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Handle known error types
  if (err instanceof AppError) {
    return sendError(
      res,
      err.statusCode,
      err.code,
      err.message,
      err.details
    );
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const firstError = err.errors[0];
    return sendError(
      res,
      400,
      ErrorCode.VALIDATION_ERROR,
      firstError?.message || 'Validation failed',
      { 
        errors: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
      firstError?.path.join('.')
    );
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    
    // P2002 = Unique constraint violation
    if (prismaError.code === 'P2002') {
      return sendError(
        res,
        409,
        ErrorCode.ALREADY_EXISTS,
        `A record with this ${prismaError.meta?.target?.join(', ')} already exists`
      );
    }
    
    // P2025 = Record not found
    if (prismaError.code === 'P2025') {
      return sendError(
        res,
        404,
        ErrorCode.NOT_FOUND,
        'Record not found'
      );
    }
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(
      res,
      401,
      ErrorCode.INVALID_TOKEN,
      'Invalid or malformed token'
    );
  }

  if (err.name === 'TokenExpiredError') {
    return sendError(
      res,
      401,
      ErrorCode.TOKEN_EXPIRED,
      'Token has expired'
    );
  }

  // Default to internal server error
  return sendError(
    res,
    500,
    ErrorCode.INTERNAL_ERROR,
    process.env.NODE_ENV === 'development'
      ? err.message
      : 'An unexpected error occurred'
  );
}

/**
 * Async handler wrapper - catches errors and passes to error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Not found handler for unmatched routes
 */
export function notFoundHandler(_req: Request, res: Response): Response<ApiError> {
  return sendError(
    res,
    404,
    ErrorCode.NOT_FOUND,
    'Endpoint not found'
  );
}

// ============================================
// VALIDATION MIDDLEWARE
// ============================================

/**
 * Create validation middleware from Zod schema
 */
export function validate(schema: any, property: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const result = schema.parse(req[property]);
      req[property] = result;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const firstError = error.errors[0];
        next(
          validationError(
            firstError?.message || 'Validation failed',
            firstError?.path.join('.'),
            { errors: error.errors }
          )
        );
      } else {
        next(error);
      }
    }
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  // Classes
  AppError,
  
  // Enums
  ErrorCode,
  SuccessCode,
  
  // Response helpers
  sendError,
  sendSuccess,
  sendCreated,
  sendNoContent,
  
  // Error factories
  notFoundError,
  badRequestError,
  validationError,
  unauthorizedError,
  forbiddenError,
  conflictError,
  
  // Middleware
  errorHandler,
  asyncHandler,
  notFoundHandler,
  validate,
};
