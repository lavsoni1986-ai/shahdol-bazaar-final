import { z } from "zod";

/**
 * ============================================
 * VENDOR DTOs - BharatOS Partner System
 * ============================================
 * Type-safe validation for vendor management
 */

// ============================================
// CREATE VENDOR DTO
// ============================================
export const createVendorDTO = z.object({
  name: z.string()
    .min(2, "Shop name must be at least 2 characters")
    .max(200, "Shop name must not exceed 200 characters")
    .trim(),

  description: z.string()
    .max(1000, "Description must not exceed 1000 characters")
    .optional()
    .nullable(),

  address: z.string()
    .min(10, "Address is required")
    .max(500, "Address must not exceed 500 characters")
    .trim(),

  phone: z.string()
    .regex(/^[0-9]{10}$/, "Phone must be exactly 10 digits"),

  category: z.string()
    .min(1, "Category is required")
    .max(100, "Category must not exceed 100 characters"),

  mapsLink: z.string()
    .url("Invalid Google Maps URL format")
    .optional()
    .nullable(),

  type: z.enum(["SHOP", "MARKET", "ONLINE"])
    .default("SHOP"),

  // Optional fields for enhanced vendor profile
  businessHours: z.string()
    .max(500, "Business hours description too long")
    .optional(),

  specialties: z.array(z.string())
    .max(10, "Cannot have more than 10 specialties")
    .optional(),

  serviceArea: z.string()
    .max(200, "Service area description too long")
    .optional(),
});

// ============================================
// UPDATE VENDOR DTO
// ============================================
export const updateVendorDTO = createVendorDTO.partial();

// ============================================
// VENDOR PARAMS DTO
// ============================================
export const vendorParamsDTO = z.object({
  id: z.string().transform(val => parseInt(val, 10))
    .pipe(z.number().positive("Invalid vendor ID")),
});

// ============================================
// VENDOR QUERY DTO
// ============================================
export const vendorsQueryDTO = z.object({
  district: z.string().optional(),
  districtId: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED", "RESTRICTED", "MONITORED", "BANNED"])
    .optional(),
  search: z.string().optional(),
  limit: z.string().transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(100).default(20))
    .optional(),
  offset: z.string().transform(val => parseInt(val, 10))
    .pipe(z.number().min(0).default(0))
    .optional(),
  sortBy: z.enum(["name", "createdAt", "dsslScore", "rating"])
    .default("createdAt")
    .optional(),
  sortOrder: z.enum(["asc", "desc"])
    .default("desc")
    .optional(),
});

// ============================================
// VENDOR STATUS UPDATE DTO (ADMIN)
// ============================================
export const updateVendorStatusDTO = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED", "RESTRICTED", "MONITORED", "BANNED"]),
  rejectionReason: z.string()
    .max(500, "Rejection reason too long")
    .optional(),
  adminNotes: z.string()
    .max(1000, "Admin notes too long")
    .optional(),
});

// ============================================
// VENDOR RESPONSE DTO
// ============================================
export const vendorResponseDTO = z.object({
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
  mapsLink: z.string().nullable(),
  businessHours: z.string().nullable(),
  specialties: z.array(z.string()),
  serviceArea: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ============================================
// VENDORS LIST RESPONSE DTO
// ============================================
export const vendorsListResponseDTO = z.object({
  data: z.array(vendorResponseDTO),
  count: z.number(),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

// ============================================
// VENDOR DASHBOARD STATS DTO
// ============================================
export const vendorDashboardStatsDTO = z.object({
  totalOrders: z.number(),
  totalRevenue: z.number(),
  avgOrderValue: z.number(),
  pendingOrders: z.number(),
  completedOrders: z.number(),
  dsslScore: z.number(),
  customerRating: z.number().nullable(),
  totalReviews: z.number(),
  monthlyStats: z.array(z.object({
    month: z.string(),
    orders: z.number(),
    revenue: z.number(),
  })),
});

// ============================================
// TYPE EXPORTS
// ============================================
export type CreateVendorDTO = z.infer<typeof createVendorDTO>;
export type UpdateVendorDTO = z.infer<typeof updateVendorDTO>;
export type VendorParamsDTO = z.infer<typeof vendorParamsDTO>;
export type VendorsQueryDTO = z.infer<typeof vendorsQueryDTO>;
export type UpdateVendorStatusDTO = z.infer<typeof updateVendorStatusDTO>;
export type VendorResponseDTO = z.infer<typeof vendorResponseDTO>;
export type VendorsListResponseDTO = z.infer<typeof vendorsListResponseDTO>;
export type VendorDashboardStatsDTO = z.infer<typeof vendorDashboardStatsDTO>;

export default {
  createVendorDTO,
  updateVendorDTO,
  vendorParamsDTO,
  vendorsQueryDTO,
  updateVendorStatusDTO,
  vendorResponseDTO,
  vendorsListResponseDTO,
  vendorDashboardStatsDTO,
};