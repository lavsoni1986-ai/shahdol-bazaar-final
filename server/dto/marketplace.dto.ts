import { z } from "zod";
import { registerSchema } from "../lib/swagger";

/**
 * ============================================
 * MARKETPLACE DTOs - BharatOS Commerce Layer
 * ============================================
 * Type-safe validation for marketplace endpoints
 */

// ============================================
// STORES QUERY DTO
// ============================================
export const storesQueryDTO = z.object({
  district: z.string().optional(),
  districtId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().min(1).max(50).default(20).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
});

// ============================================
// PRODUCTS QUERY DTO
// ============================================
export const productsQueryDTO = z.object({
  district: z.string().optional(),
  districtId: z.coerce.number().int().positive().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().min(0).default(0).optional(),
  sortBy: z.enum(["price", "rating", "newest", "popularity"])
    .default("popularity")
    .optional(),
});

// ============================================
// PRODUCT DETAILS PARAMS DTO
// ============================================
export const productParamsDTO = z.object({
  id: z.string().transform(val => parseInt(val, 10))
    .pipe(z.number().positive("Invalid product ID")),
});

// ============================================
// STORE DETAILS PARAMS DTO
// ============================================
export const storeParamsDTO = z.object({
  slug: z.string()
    .min(1, "Store slug is required")
    .max(100, "Store slug too long"),
});

// ============================================
// CATEGORIES RESPONSE DTO
// ============================================
export const categoriesResponseDTO = z.object({
  data: z.array(z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    imageUrl: z.string().nullable(),
    isActive: z.boolean(),
  })),
  count: z.number(),
});

// ============================================
// STORES RESPONSE DTO
// ============================================
export const storesResponseDTO = z.object({
  data: z.array(z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    logo: z.string().nullable(),
    address: z.string().nullable(),
    phone: z.string().nullable(),
    isVerified: z.boolean(),
    dsslScore: z.number(),
    avgRating: z.number().nullable(),
    totalReviews: z.number().nullable(),
    status: z.string(),
    businessType: z.string(),
    category: z.string().nullable(),
    districtId: z.number().nullable(),
  })),
  count: z.number(),
});

// ============================================
// PRODUCTS RESPONSE DTO
// ============================================
export const productsResponseDTO = z.object({
  data: z.array(z.object({
    id: z.number(),
    title: z.string(),
    name: z.string().nullable(),
    description: z.string().nullable(),
    price: z.number(),
    mrp: z.number().nullable(),
    imageUrl: z.string().nullable(),
    category: z.string(),
    stock: z.number(),
    vendorId: z.number(),
    vendor: z.object({
      id: z.number(),
      name: z.string(),
      slug: z.string(),
      logo: z.string().nullable(),
      dsslScore: z.number(),
      avgRating: z.number().nullable(),
    }),
    dsslScore: z.number(),
    relevanceScore: z.number(),
  })),
  count: z.number(),
  total: z.number().optional(),
});

// ============================================
// PRODUCT DETAIL RESPONSE DTO
// ============================================
export const productDetailResponseDTO = z.object({
  id: z.number(),
  title: z.string(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  price: z.number(),
  mrp: z.number().nullable(),
  imageUrl: z.string().nullable(),
  images: z.array(z.string()),
  category: z.string(),
  stock: z.number(),
  vendorId: z.number(),
  vendor: z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
    description: z.string().nullable(),
    logo: z.string().nullable(),
    address: z.string().nullable(),
    phone: z.string().nullable(),
    isVerified: z.boolean(),
    dsslScore: z.number(),
    avgRating: z.number().nullable(),
    totalReviews: z.number().nullable(),
  }),
  dsslScore: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============================================
// STORE DETAIL RESPONSE DTO
// ============================================
export const storeDetailResponseDTO = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  logo: z.string().nullable(),
  images: z.array(z.string()),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  mobile: z.string().nullable(),
  isVerified: z.boolean(),
  dsslScore: z.number(),
  avgRating: z.number().nullable(),
  totalReviews: z.number().nullable(),
  status: z.string(),
  businessType: z.string(),
  category: z.string().nullable(),
  districtId: z.number().nullable(),
  products: z.array(z.object({
    id: z.number(),
    title: z.string(),
    price: z.number(),
    imageUrl: z.string().nullable(),
    stock: z.number(),
    dsslScore: z.number(),
  })),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============================================
// REGISTER SCHEMAS WITH OPENAPI
// ============================================
registerSchema("StoresQueryDTO", storesQueryDTO);
registerSchema("ProductsQueryDTO", productsQueryDTO);
registerSchema("CategoriesResponseDTO", categoriesResponseDTO);
registerSchema("StoresResponseDTO", storesResponseDTO);
registerSchema("ProductsResponseDTO", productsResponseDTO);
registerSchema("ProductDetailResponseDTO", productDetailResponseDTO);
registerSchema("StoreDetailResponseDTO", storeDetailResponseDTO);

// ============================================
// TYPE EXPORTS
// ============================================
export type StoresQueryDTO = z.infer<typeof storesQueryDTO>;
// These are exported from product.dto.ts to avoid duplicates
export type StoreParamsDTO = z.infer<typeof storeParamsDTO>;
export type CategoriesResponseDTO = z.infer<typeof categoriesResponseDTO>;
export type StoresResponseDTO = z.infer<typeof storesResponseDTO>;
export type ProductsResponseDTO = z.infer<typeof productsResponseDTO>;
export type ProductDetailResponseDTO = z.infer<typeof productDetailResponseDTO>;
export type StoreDetailResponseDTO = z.infer<typeof storeDetailResponseDTO>;

