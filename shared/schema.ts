import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  doublePrecision,
  json,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

/* ===================== USERS ===================== */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("customer").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  shopName: text("shop_name"),
  shopAddress: text("shop_address"),
  mapsLink: text("maps_link"),
});

/* ===================== SHOPS ===================== */
export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  address: text("address"),
  phone: text("phone").notNull(),
  mobile: text("mobile").notNull(),
  contactNumber: text("contact_number"),
  image: text("image"),
  rating: doublePrecision("rating").default(0),
  reviewCount: integer("review_count").default(0),
  avgRating: doublePrecision("avg_rating").default(0),
  isFeatured: boolean("is_featured").default(false),
  approved: boolean("approved").default(true),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ===================== PRODUCTS ===================== */
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull(),
  sellerId: integer("seller_id").notNull(),
  name: text("name").notNull(),
  price: text("price").notNull(),
  imageUrl: text("image_url"),
  category: text("category").notNull(),
  description: text("description"),
  approved: boolean("approved").default(false).notNull(),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ===================== CATEGORIES ===================== */
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ===================== OFFERS & NEWS ===================== */
// ✅ FIXED: Mapping strictly to case-sensitive Neon SQL columns
export const offers = pgTable("Offer", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  // Hum drizzle ko bata rahe hain ki DB mein column ka naam "isActive" hai (quotes ke saath)
  isActive: boolean("isActive").default(true).notNull(), 
  createdAt: timestamp("createdAt").defaultNow(),
  userId: integer("userId").default(1), 
});

/* ===================== ORDERS ===================== */
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  shopId: integer("shop_id").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerAddress: text("customer_address").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  totalPrice: text("total_price").notNull(),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ===================== CART ITEMS ===================== */
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ===================== BANNERS ===================== */
export const banners = pgTable("banners", {
  id: serial("id").primaryKey(),
  image: text("image").notNull(),
  title: text("title").default(""),
  link: text("link").default("/"),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ===================== REVIEWS ===================== */
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  customerName: text("customer_name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  isApproved: boolean("is_approved").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

/* ===================== ZOD SCHEMAS ===================== */

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const insertShopSchema = createInsertSchema(shops).omit({
  id: true, rating: true, reviewCount: true, avgRating: true, approved: true, isVerified: true, createdAt: true,
});
export type InsertShop = z.infer<typeof insertShopSchema>;
export type Shop = typeof shops.$inferSelect;

export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export const insertCategorySchema = createInsertSchema(categories)
  .omit({ id: true, createdAt: true })
  .extend({
    name: z.string().trim().min(1, "Category name required"),
    imageUrl: z
      .string()
      .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined))
      .optional(),
  });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  createdAt: true,
});
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = typeof offers.$inferSelect;

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

export const insertBannerSchema = createInsertSchema(banners).omit({ id: true, createdAt: true });
export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type Banner = typeof banners.$inferSelect;

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true }).extend({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1, "Comment required"),
});
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;


