import { z } from "zod";

// Note: These are pure Zod schemas for validation
// Prisma types are imported from @prisma/client in storage.ts

/* ===================== PASSWORD VALIDATION ===================== */
// 🛡️ Sovereign Security: 12+ chars, uppercase, lowercase, number, special
export const passwordSchema = z.string()
  .min(12, "Password must be at least 12 characters")
  .max(100, "Password must not exceed 100 characters")
  .regex(/[A-Z]/, "Must have one uppercase letter")
  .regex(/[a-z]/, "Must have one lowercase letter")
  .regex(/[0-9]/, "Must have one number")
  .regex(/[!@#$%^&*(),.?":{}|<>]/, "Must have one special character");

/* ===================== USERS ===================== */
export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: passwordSchema,
  role: z.string().default("customer"),
  isAdmin: z.boolean().default(false),
  shopName: z.string().optional().nullable(),
  shopAddress: z.string().optional().nullable(),
  mapsLink: z.string().url().optional().nullable(),
});
export type InsertUser = z.infer<typeof insertUserSchema>;

/* ===================== SHOPS ===================== */
export const insertShopSchema = z.object({
  ownerId: z.number().int().optional(),
  name: z.string().min(1, "Shop name is required"),
  category: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  mapsLink: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  approved: z.boolean().default(false),
  isVerified: z.boolean().default(false),
  districtId: z.never(),
});
export type InsertShop = z.infer<typeof insertShopSchema>;

/* ===================== PRODUCTS ===================== */
export const insertProductSchema = z.object({
  shopId: z.number().int().optional(),
  sellerId: z.number().int().optional(),
  vendorId: z.number().int(),
  name: z.string().min(1, "Product name is required").optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  price: z.union([z.string(), z.number()]).optional(),
  mrp: z.union([z.string(), z.number()]).optional(),
  category: z.string().optional(),
  categoryId: z.number().int().optional().nullable(),
  imageUrl: z.string().url().optional(),
  stock: z.number().int().min(0).optional(),
  status: z.string().optional(),
  approved: z.boolean().optional(),
  districtId: z.never(), // 🛡️ Client cannot send this - server-side only (Verified JWT)
  vectorEmbedding: z.array(z.number()).optional(),
});
export type InsertProduct = z.infer<typeof insertProductSchema>;

/* ===================== PRODUCT IMAGES ===================== */
export const insertProductImageSchema = z.object({
  productId: z.number().int(),
  url: z.string(),
});
export type InsertProductImage = z.infer<typeof insertProductImageSchema>;

/* ===================== CATEGORIES ===================== */
export const insertCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  imageUrl: z.string().url().optional(),
  slug: z.string().optional(),
  districtId: z.never(),
});
export type InsertCategory = z.infer<typeof insertCategorySchema>;

/* ===================== OFFERS ===================== */
export const insertOfferSchema = z.object({
  title: z.string().min(1, "Offer title is required"),
  description: z.string().optional(),
  discount: z.number().min(0).max(100).optional(),
  code: z.string().optional(),
  userId: z.number().int().optional(),
  isActive: z.boolean().default(true),
  districtId: z.never(),
});
export type InsertOffer = z.infer<typeof insertOfferSchema>;

/* ===================== ORDERS ===================== */
export const insertOrderSchema = z.object({
  productId: z.number().int().positive(),
  shopId: z.number().int().optional(),
  vendorId: z.number().int().optional(),
  userId: z.number().int().optional(),
  districtId: z.never(), // 🛡️ Client cannot send this - server-side only (Verified JWT)
  customerName: z.string().min(1).max(100).optional(),
  customerPhone: z.string().regex(/^[0-9]{10}$/, "Must be 10-digit mobile number").optional(),
  customerAddress: z.string().max(500).optional(),
  quantity: z.number().int().positive().default(1),
  totalPrice: z.union([z.string(), z.number()]).transform(v => {
    const num = Number(v);
    if (!Number.isFinite(num) || num < 0) return 0;
    return num;
  }),
  status: z.enum(["pending", "confirmed", "shipped", "delivered", "cancelled"]).optional(),
  paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]).optional(),
  paymentMethod: z.string().optional(),
  paymentId: z.string().optional(),
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;

/* ===================== BANNERS ===================== */
export const insertBannerSchema = z.object({
  image: z.string().min(1),
  title: z.string().optional(),
  link: z.string().optional(),
});
export type InsertBanner = z.infer<typeof insertBannerSchema>;

/* ===================== CART ITEMS ===================== */
export const insertCartItemSchema = z.object({
  userId: z.number().int().optional(),
  productId: z.number().int(),
  quantity: z.number().int().min(1).optional(),
  sessionId: z.string().optional(),
});
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

/* ===================== REVIEWS ===================== */
export const insertReviewSchema = z.object({
  productId: z.number().int(),
  userId: z.number().int().optional(),
  // SECURITY: Rating is REQUIRED to prevent empty spam reviews
  rating: z.number().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
  // Comment is optional but if provided must have content
  comment: z.string().min(1, "Comment cannot be empty").max(1000, "Comment too long").optional(),
  isApproved: z.boolean().default(false),
});
export type InsertReview = z.infer<typeof insertReviewSchema>;
