import { Request } from 'express';

/**
 * ============================================
 * PAGINATION UTILITIES
 * ============================================
 * PHASE 2 - Performance Optimization
 * 
 * Provides consistent pagination across all API endpoints.
 * Supports page-based and cursor-based pagination.
 */

// ============================================
// TYPES
// ============================================

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Pagination metadata for response headers
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
  links?: {
    self: string;
    first: string;
    last: string;
    next?: string;
    prev?: string;
  };
}

/**
 * Default pagination settings
 */
export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 20,
  maxLimit: 100,
} as const;

// ============================================
// PARSING FUNCTIONS
// ============================================

/**
 * Parse pagination parameters from request query
 * 
 * @param req - Express request object
 * @param options - Optional configuration
 * @returns PaginationParams
 * 
 * @example
 * // GET /api/products?page=2&limit=50&sortBy=price&sortOrder=desc
 * const params = parsePaginationParams(req);
 * // { page: 2, limit: 50, skip: 50, sortBy: 'price', sortOrder: 'desc' }
 */
export function parsePaginationParams(
  req: Request,
  options?: {
    defaultPage?: number;
    defaultLimit?: number;
    maxLimit?: number;
    allowedSortFields?: string[];
    defaultSortBy?: string;
    defaultSortOrder?: 'asc' | 'desc';
  }
): PaginationParams {
  const {
    defaultPage = DEFAULT_PAGINATION.page,
    defaultLimit = DEFAULT_PAGINATION.limit,
    maxLimit = DEFAULT_PAGINATION.maxLimit,
    allowedSortFields = [],
    defaultSortBy,
    defaultSortOrder = 'desc',
  } = options || {};

  // Parse page number
  const pageQuery = req.query.page as string | undefined;
  const page = pageQuery 
    ? Math.max(1, parseInt(pageQuery, 10) || defaultPage)
    : defaultPage;

  // Parse limit
  const limitQuery = req.query.limit as string | undefined;
  const limit = limitQuery
    ? Math.min(maxLimit, Math.max(1, parseInt(limitQuery, 10) || defaultLimit))
    : defaultLimit;

  // Calculate skip
  const skip = (page - 1) * limit;

  // Parse sort parameters
  let sortBy = defaultSortBy;
  let sortOrder: 'asc' | 'desc' = defaultSortOrder;

  const sortByQuery = req.query.sortBy as string | undefined;
  const sortOrderQuery = req.query.sortOrder as string | undefined;

  if (sortByQuery && allowedSortFields.length > 0) {
    if (allowedSortFields.includes(sortByQuery)) {
      sortBy = sortByQuery;
    }
  } else if (sortByQuery) {
    sortBy = sortByQuery;
  }

  if (sortOrderQuery === 'asc' || sortOrderQuery === 'desc') {
    sortOrder = sortOrderQuery;
  }

  return {
    page,
    limit,
    skip,
    sortBy,
    sortOrder,
  };
}

/**
 * Parse simple pagination (without sorting)
 */
export function parseSimplePagination(req: Request): PaginationParams {
  return parsePaginationParams(req);
}

// ============================================
// FORMATTING FUNCTIONS
// ============================================

/**
 * Format pagination metadata
 * 
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns PaginationMeta
 */
export function formatPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Format complete paginated response
 * 
 * @param data - Array of data items
 * @param page - Current page
 * @param limit - Items per page
 * @param total - Total items
 * @param baseUrl - Base URL for generating links
 * @returns PaginatedResponse
 */
export function formatPaginationResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  baseUrl?: string
): PaginatedResponse<T> {
  const pagination = formatPaginationMeta(page, limit, total);
  
  // Generate links if baseUrl provided
  const links = baseUrl ? generatePaginationLinks(baseUrl, page, limit, pagination.totalPages) : undefined;
  
  return {
    data,
    pagination,
    ...(links && { links }),
  };
}

/**
 * Generate pagination links for HATEOAS
 */
function generatePaginationLinks(
  baseUrl: string,
  page: number,
  limit: number,
  totalPages: number
): PaginatedResponse<unknown>['links'] {
  const getUrl = (p: number) => `${baseUrl}?page=${p}&limit=${limit}`;
  
  return {
    self: getUrl(page),
    first: getUrl(1),
    last: getUrl(totalPages),
    ...(page > 1 && { prev: getUrl(page - 1) }),
    ...(page < totalPages && { next: getUrl(page + 1) }),
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate offset for database queries
 */
export function getOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Get pagination bounds for display (e.g., "Showing 1-20 of 100")
 */
export function getPaginationBounds(page: number, limit: number, total: number): {
  from: number;
  to: number;
  of: number;
} {
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return { from, to, of: total };
}

/**
 * Create Prisma-compatible orderBy object
 */
export function createPrismaOrderBy(
  sortBy?: string | null,
  sortOrder?: 'asc' | 'desc'
): Record<string, 'asc' | 'desc'> | undefined {
  if (!sortBy) return undefined;
  
  return {
    [sortBy]: sortOrder || 'desc',
  };
}

// ============================================
// EXPRESS MIDDLEWARE
// ============================================

/**
 * Pagination options for route handlers
 */
export interface PaginationRouteOptions {
  defaultPage?: number;
  defaultLimit?: number;
  maxLimit?: number;
  allowedSortFields?: string[];
  defaultSortBy?: string;
  defaultSortOrder?: 'asc' | 'desc';
}

/**
 * Attach pagination params to request
 */
export function attachPagination(options?: PaginationRouteOptions) {
  return (req: Request): PaginationParams => {
    return parsePaginationParams(req, options);
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  parsePaginationParams,
  parseSimplePagination,
  formatPaginationMeta,
  formatPaginationResponse,
  getOffset,
  getPaginationBounds,
  createPrismaOrderBy,
  attachPagination,
  DEFAULT_PAGINATION,
};
