import { z } from "zod";

/**
 * ============================================
 * PRODUCT DTOs - BharatOS Product Management
 * ============================================
 * Type-safe validation for product operations
 */

// ============================================
// CREATE PRODUCT DTO
// ============================================
export const createProductDTO = z.object({
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Title must not exceed 200 characters")
    .trim(),

  name: z.string()
    .max(200, "Name must not exceed 200 characters")
    .optional()
    .nullable(),

  description: z.string()
    .max(2000, "Description must not exceed 2000 characters")
    .optional()
    .nullable(),

  price: z.number()
    .positive("Price must be a positive number")
    .max(1000000, "Price seems unreasonably high"),

  mrp: z.number()
    .positive("MRP must be a positive number")
    .optional()
    .nullable(),

  category: z.string()
    .min(1, "Category is required")
    .max(100, "Category must not exceed 100 characters"),

  stock: z.number()
    .int("Stock must be a whole number")
    .nonnegative("Stock cannot be negative")
    .default(0),

  // Image handling
  images: z.array(z.string().url("Invalid image URL"))
    .max(10, "Cannot have more than 10 images")
    .optional(),

  // Optional metadata
  tags: z.array(z.string())
    .max(20, "Cannot have more than 20 tags")
    .optional(),

  specifications: z.record(z.string())
    .optional(),

  weight: z.number()
    .positive("Weight must be positive")
    .optional(),

  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().positive(),
    unit: z.enum(["cm", "inch"]).default("cm"),
  }).optional(),

  isActive: z.boolean().default(true),
});

// ============================================
// UPDATE PRODUCT DTO
// ============================================
export const updateProductDTO = createProductDTO.partial();

// ============================================
// PRODUCT PARAMS DTO
// ============================================
export const productParamsDTO = z.object({
  id: z.string().transform(val => parseInt(val, 10))
    .pipe(z.number().positive("Invalid product ID")),
});

// ============================================
// PRODUCTS QUERY DTO
// ============================================
export const productsQueryDTO = z.object({
  vendorId: z.string().transform(val => parseInt(val, 10))
    .pipe(z.number().positive().optional()),

  category: z.string().optional(),

  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"])
    .optional(),

  search: z.string().optional(),

  limit: z.string().transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(100).default(20))
    .optional(),

  offset: z.string().transform(val => parseInt(val, 10))
    .pipe(z.number().min(0).default(0))
    .optional(),

  sortBy: z.enum(["title", "price", "createdAt", "stock", "dsslScore"])
    .default("createdAt")
    .optional(),

  sortOrder: z.enum(["asc", "desc"])
    .default("desc")
    .optional(),

  minPrice: z.string().transform(val => parseFloat(val))
    .pipe(z.number().min(0).optional())
    .optional(),

  maxPrice: z.string().transform(val => parseFloat(val))
    .pipe(z.number().positive().optional())
    .optional(),
});

// ============================================
// PRODUCT STATUS UPDATE DTO (VENDOR/ADMIN)
// ============================================
export const updateProductStatusDTO = z.object({
  isActive: z.boolean(),
  reason: z.string()
    .max(500, "Reason too long")
    .optional(),
});

// ============================================
// BULK PRODUCT UPDATE DTO
// ============================================
export const bulkUpdateProductsDTO = z.object({
  productIds: z.array(z.number().positive())
    .min(1, "At least one product required")
    .max(100, "Cannot update more than 100 products at once"),

  updates: z.object({
    price: z.number().positive().optional(),
    stock: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
    category: z.string().optional(),
  }),
});

// ============================================
// PRODUCT RESPONSE DTO
// ============================================
export const productResponseDTO = z.object({
  id: z.number(),
  title: z.string(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  price: z.number(),
  mrp: z.number().nullable(),
  imageUrl: z.string().nullable(),
  images: z.array(z.string()),
  category: z.string(),
  categoryName: z.string().nullable(),
  stock: z.number(),
  vendorId: z.number(),
  vendor: z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    isVerified: z.boolean(),
    dsslScore: z.number(),
  }),
  dsslScore: z.number(),
  tags: z.array(z.string()),
  specifications: z.record(z.string()).nullable(),
  weight: z.number().nullable(),
  dimensions: z.object({
    length: z.number(),
    width: z.number(),
    height: z.number(),
    unit: z.string(),
  }).nullable(),
  isActive: z.boolean(),
  approved: z.boolean(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============================================
// PRODUCTS LIST RESPONSE DTO
// ============================================
export const productsListResponseDTO = z.object({
  data: z.array(productResponseDTO),
  count: z.number(),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

// ============================================
// PRODUCT ANALYTICS DTO
// ============================================
export const productAnalyticsDTO = z.object({
  productId: z.number(),
  views: z.number(),
  orders: z.number(),
  conversionRate: z.number(),
  revenue: z.number(),
  avgRating: z.number().nullable(),
  totalReviews: z.number(),
  stockAlerts: z.boolean(),
  performance: z.enum(["EXCELLENT", "GOOD", "AVERAGE", "POOR"]),
  recommendations: z.array(z.string()),
});

// ============================================
// TYPE EXPORTS
// ============================================
export type CreateProductDTO = z.infer<typeof createProductDTO>;
export type UpdateProductDTO = z.infer<typeof updateProductDTO>;
// These are exported from marketplace.dto.ts to avoid duplicates
export type UpdateProductStatusDTO = z.infer<typeof updateProductStatusDTO>;
export type BulkUpdateProductsDTO = z.infer<typeof bulkUpdateProductsDTO>;
export type ProductResponseDTO = z.infer<typeof productResponseDTO>;
export type ProductsListResponseDTO = z.infer<typeof productsListResponseDTO>;
export type ProductAnalyticsDTO = z.infer<typeof productAnalyticsDTO>;

export default {
  createProductDTO,
  updateProductDTO,
  productParamsDTO,
  productsQueryDTO,
  updateProductStatusDTO,
  bulkUpdateProductsDTO,
  productResponseDTO,
  productsListResponseDTO,
  productAnalyticsDTO,
};