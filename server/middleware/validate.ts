import { ZodSchema, ZodError } from "zod";
import type { Request, Response, NextFunction } from "express";

/**
 * ============================================
 * ZOD VALIDATION MIDDLEWARE
 * ============================================
 * Type-safe API Layer for BharatOS
 *
 * Ensures all incoming data conforms to strict schemas
 * Prevents runtime errors from invalid/malformed data
 */

/**
 * Validation middleware factory
 * @param schema - Zod schema to validate against
 * @param source - Request property to validate ('body', 'query', 'params')
 */
export const validate =
  (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);

      if (!result.success) {
        // Detailed error response
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors,
          timestamp: new Date().toISOString(),
        });
      }

      // Replace with validated data
      (req as any)[source] = result.data;
      next();
    } catch (error) {
      console.error("[VALIDATION] Unexpected error:", error);
      return res.status(500).json({
        success: false,
        error: "Internal validation error",
        timestamp: new Date().toISOString(),
      });
    }
  };

/**
 * Query parameter validation (with string conversion)
 */
export const validateQuery = (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      // Convert query params to expected types
      const processedQuery: any = {};

      for (const [key, value] of Object.entries(req.query)) {
        if (Array.isArray(value)) {
          processedQuery[key] = value;
        } else if (value === 'true') {
          processedQuery[key] = true;
        } else if (value === 'false') {
          processedQuery[key] = false;
        } else if (!isNaN(Number(value))) {
          processedQuery[key] = Number(value);
        } else {
          processedQuery[key] = value;
        }
      }

      const result = schema.safeParse(processedQuery);

      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        return res.status(400).json({
          success: false,
          error: "Invalid query parameters",
          details: errors,
          timestamp: new Date().toISOString(),
        });
      }

      req.query = result.data as any;
      next();
    } catch (error) {
      console.error("[VALIDATION] Query validation error:", error);
      return res.status(500).json({
        success: false,
        error: "Query validation error",
        timestamp: new Date().toISOString(),
      });
    }
  };

/**
 * Combined validation wrapper for multiple sources
 */
export const validateRequest = (validations: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  const middlewares = [];

  if (validations.body) {
    middlewares.push(validate(validations.body, 'body'));
  }
  if (validations.query) {
    middlewares.push(validateQuery(validations.query));
  }
  if (validations.params) {
    middlewares.push(validate(validations.params, 'params'));
  }

  return middlewares;
};

/**
 * Utility for conditional validation
 */
export const conditionalValidate =
  (condition: (req: Request) => boolean, schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    if (condition(req)) {
      return validate(schema, source)(req, res, next);
    }
    next();
  };

export default {
  validate,
  validateQuery,
  validateRequest,
  conditionalValidate,
};