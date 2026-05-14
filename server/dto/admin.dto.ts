import { z } from "zod";

/**
 * ============================================
 * ADMIN DTOs - BharatOS Sovereign Command Center
 * ============================================
 * Type-safe validation for admin operations
 */

// ============================================
// ADMIN LOGIN DTO
// ============================================
export const adminLoginDTO = z.object({
  username: z.string()
    .min(3, "Username required")
    .max(50, "Username too long"),

  password: z.string()
    .min(1, "Password required")
    .max(100, "Password too long"),
});

// ============================================
// VENDOR APPROVAL DTO
// ============================================
export const vendorApprovalDTO = z.object({
  vendorId: z.number().positive("Invalid vendor ID"),
  action: z.enum(["approve", "reject", "suspend"]),
  reason: z.string()
    .max(500, "Reason too long")
    .optional(),
  adminNotes: z.string()
    .max(1000, "Notes too long")
    .optional(),
});

// ============================================
// PRODUCT APPROVAL DTO
// ============================================
export const productApprovalDTO = z.object({
  productId: z.number().positive("Invalid product ID"),
  action: z.enum(["approve", "reject"]),
  reason: z.string()
    .max(500, "Reason too long")
    .optional(),
});

// ============================================
// ORDER STATUS UPDATE DTO
// ============================================
export const orderStatusUpdateDTO = z.object({
  orderId: z.string().min(1, "Order ID required"),
  status: z.enum([
    "PENDING",
    "CONFIRMED",
    "PREPARING",
    "READY",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED"
  ]),
  notes: z.string()
    .max(500, "Notes too long")
    .optional(),
});

// ============================================
// DISTRICT CREATION DTO
// ============================================
export const createDistrictDTO = z.object({
  name: z.string()
    .min(2, "District name required")
    .max(100, "Name too long")
    .trim(),

  slug: z.string()
    .min(2, "Slug required")
    .max(50, "Slug too long")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens")
    .trim(),

  state: z.string()
    .min(2, "State required")
    .max(100, "State name too long")
    .trim(),

  isActive: z.boolean().default(true),

  // Optional branding
  primaryColor: z.string()
    .regex(/^#[0-9A-F]{6}$/i, "Invalid hex color")
    .optional(),

  secondaryColor: z.string()
    .regex(/^#[0-9A-F]{6}$/i, "Invalid hex color")
    .optional(),

  logoUrl: z.string().url("Invalid logo URL").optional(),
  faviconUrl: z.string().url("Invalid favicon URL").optional(),
});

// ============================================
// SYSTEM CONFIG UPDATE DTO
// ============================================
export const systemConfigDTO = z.object({
  districtId: z.number().positive("Invalid district ID"),

  config: z.object({
    // Feature flags
    features: z.record(z.boolean()).optional(),

    // Limits and constraints
    limits: z.object({
      maxProductsPerVendor: z.number().min(1).max(10000).optional(),
      maxOrdersPerDay: z.number().min(1).max(100000).optional(),
      maxRevenuePerDay: z.number().min(1).optional(),
    }).optional(),

    // Business rules
    rules: z.object({
      autoApproveVendors: z.boolean().optional(),
      autoApproveProducts: z.boolean().optional(),
      requireVerification: z.boolean().optional(),
    }).optional(),
  }),
});

// ============================================
// FRAUD ACTION DTO
// ============================================
export const fraudActionDTO = z.object({
  vendorId: z.number().positive("Invalid vendor ID"),
  action: z.enum(["warn", "restrict", "suspend", "ban"]),
  reason: z.string()
    .min(10, "Reason required")
    .max(1000, "Reason too long"),
  duration: z.number()
    .min(1, "Duration must be at least 1 hour")
    .max(8760, "Cannot suspend for more than 1 year")
    .optional(), // Hours
});

// ============================================
// ANALYTICS QUERY DTO
// ============================================
export const analyticsQueryDTO = z.object({
  districtId: z.string().transform(val => parseInt(val, 10))
    .pipe(z.number().positive().optional()),

  startDate: z.string().datetime("Invalid start date").optional(),
  endDate: z.string().datetime("Invalid end date").optional(),

  metrics: z.array(z.enum([
    "orders", "revenue", "users", "vendors", "products",
    "dssl_score", "fraud_incidents", "performance"
  ])).default(["orders", "revenue"]).optional(),

  groupBy: z.enum(["day", "week", "month", "year"])
    .default("day")
    .optional(),

  limit: z.string().transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(365).default(30))
    .optional(),
});

// ============================================
// AUDIT LOG QUERY DTO
// ============================================
export const auditLogQueryDTO = z.object({
  adminId: z.string().transform(val => parseInt(val, 10))
    .pipe(z.number().positive().optional()),

  action: z.string().optional(),
  targetId: z.string().transform(val => parseInt(val, 10))
    .pipe(z.number().positive().optional()),

  startDate: z.string().datetime("Invalid start date").optional(),
  endDate: z.string().datetime("Invalid end date").optional(),

  limit: z.string().transform(val => parseInt(val, 10))
    .pipe(z.number().min(1).max(1000).default(50))
    .optional(),

  offset: z.string().transform(val => parseInt(val, 10))
    .pipe(z.number().min(0).default(0))
    .optional(),
});

// ============================================
// DASHBOARD STATS RESPONSE DTO
// ============================================
export const dashboardStatsDTO = z.object({
  overview: z.object({
    totalUsers: z.number(),
    totalVendors: z.number(),
    totalProducts: z.number(),
    totalOrders: z.number(),
    totalRevenue: z.number(),
    avgOrderValue: z.number(),
  }),

  recentActivity: z.array(z.object({
    id: z.number(),
    type: z.string(),
    description: z.string(),
    timestamp: z.string(),
    user: z.string().optional(),
  })),

  alerts: z.array(z.object({
    id: z.number(),
    type: z.enum(["critical", "warning", "info"]),
    title: z.string(),
    message: z.string(),
    timestamp: z.string(),
  })),

  performance: z.object({
    systemHealth: z.enum(["excellent", "good", "warning", "critical"]),
    responseTime: z.number(),
    uptime: z.number(),
    errorRate: z.number(),
  }),
});

// ============================================
// TYPE EXPORTS
// ============================================
export type AdminLoginDTO = z.infer<typeof adminLoginDTO>;
export type VendorApprovalDTO = z.infer<typeof vendorApprovalDTO>;
export type ProductApprovalDTO = z.infer<typeof productApprovalDTO>;
export type OrderStatusUpdateDTO = z.infer<typeof orderStatusUpdateDTO>;
export type CreateDistrictDTO = z.infer<typeof createDistrictDTO>;
export type SystemConfigDTO = z.infer<typeof systemConfigDTO>;
export type FraudActionDTO = z.infer<typeof fraudActionDTO>;
export type AnalyticsQueryDTO = z.infer<typeof analyticsQueryDTO>;
export type AuditLogQueryDTO = z.infer<typeof auditLogQueryDTO>;
export type DashboardStatsDTO = z.infer<typeof dashboardStatsDTO>;

export default {
  adminLoginDTO,
  vendorApprovalDTO,
  productApprovalDTO,
  orderStatusUpdateDTO,
  createDistrictDTO,
  systemConfigDTO,
  fraudActionDTO,
  analyticsQueryDTO,
  auditLogQueryDTO,
  dashboardStatsDTO,
};