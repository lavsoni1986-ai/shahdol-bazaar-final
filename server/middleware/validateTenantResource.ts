import { Request, Response, NextFunction } from 'express';
import { prisma } from '../storage';
import { sendError, ErrorCode } from './errorHandler';

/**
 * ============================================
 * TENANT RESOURCE VALIDATOR - BharatOS
 * ============================================
 * Validates that a resource belongs to the current tenant
 * Prevents cross-tenant data access attacks
 * 
 * Returns 404 (not 403) to avoid leaking information about
 * whether a resource exists in another district
 */

type PrismaModel = keyof typeof prisma;

export const validateTenantResource = (model: PrismaModel) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return sendError(
        res,
        400,
        ErrorCode.BAD_REQUEST,
        'Invalid resource ID'
      );
    }

    // Get districtId from request (set by tenantResolver)
    const districtId = req.districtId;
    
    if (!districtId) {
      return sendError(
        res,
        400,
        ErrorCode.DISTRICT_REQUIRED,
        'District context is required'
      );
    }

    try {
      // @ts-ignore - dynamic model access
      const resource = await prisma[model].findUnique({
        where: { id },
      });

      if (!resource) {
        return sendError(
          res,
          404,
          ErrorCode.NOT_FOUND,
          'Resource not found'
        );
      }

      // Check if resource belongs to the current district
      // @ts-ignore - districtId may not exist on all models
      if (resource.districtId !== districtId) {
        // Return 404 to avoid leaking information
        return sendError(
          res,
          404,
          ErrorCode.NOT_FOUND,
          'Resource not found'
        );
      }

      // Attach resource to request for next handler
      (req as Request & { resource?: unknown }).resource = resource;
      next();
    } catch (error) {
      console.error(`[TENANT_VALIDATION_ERROR] Model: ${String(model)}, ID: ${id}`, error);
      next(error);
    }
  };
};

/**
 * Validate that user can only access their own district's resources
 * Use for /:id endpoints
 */
export const validateDistrictOwnership = (
  resourceField: string = 'districtId'
) => {
  return (req: Request & { resource?: Record<string, unknown> }, res: Response, next: NextFunction): Response | void => {
    const districtId = req.districtId;
    const resource = req.resource;

    if (!resource) {
      return next();
    }

    // @ts-ignore - dynamic field access
    if (resource[String(resourceField)] !== districtId) {
      return sendError(
        res,
        404,
        ErrorCode.NOT_FOUND,
        'Resource not found'
      );
    }

    next();
  };
};

export default { validateTenantResource, validateDistrictOwnership };
