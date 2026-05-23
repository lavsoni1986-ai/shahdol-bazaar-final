// @ts-nocheck
import {
  Prisma,
  PrismaClient,
  User,
  Shop,
  Product,
  ProductImage,
  Offer,
  Banner,
  Category,
  Order,
  Admin,
  Vendor,
} from "@prisma/client";
import { AsyncLocalStorage } from "node:async_hooks";
import crypto from "crypto";

// Use sovereign district runtime contract
import type { DistrictRuntimeContext as District } from '../shared/contracts/district.contract';

// Type for user with adminProfile included
type UserWithAdmin = User & { adminProfile: Admin | null };

// ============================================
// TENANT CONTEXT FOR MULTI-TENANT SECURITY
// ============================================
export const tenantContext = new AsyncLocalStorage<{ districtId: number; userId?: number; requestId?: string }>();

// ============================================
// DATABASE CONNECTION MANAGEMENT
// ============================================

// Create a global prisma instance to prevent multiple connections in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development" 
    ? ["error", "warn"] 
    : ["error"],
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// ============================================
// PRISMA EXTENSION FOR TENANT ISOLATION + AUDIT LOGGING
// ============================================

// Audit logging helper functions
let lastAuditHash = "0000000000000000000000000000000000000000000000000000000000000000";

async function getLastAuditHash(): Promise<string> {
  try {
    const lastEntry = await prisma.auditLog.findFirst({
      orderBy: { createdAt: "desc" },
      select: { hash: true }
    });
    return lastEntry?.hash || lastAuditHash;
  } catch {
    return lastAuditHash;
  }
}

function computeAuditHash(data: string, prevHash: string): string {
  return crypto.createHash("sha256").update(data + prevHash).digest("hex");
}

const writeOperations = ['create', 'update', 'delete', 'updateMany', 'deleteMany'];

function shouldSkipAudit(modelName: string): boolean {
  const skipModels = ['auditlog', 'adminactionlog', 'session', 'blacklistedtoken'];
  return skipModels.includes(modelName.toLowerCase());
}

async function logAuditEntry(
  action: string,
  userId: number | undefined,
  districtId: number | undefined,
  targetId: number | undefined,
  targetType: string | undefined
) {
  try {
    const prevHash = await getLastAuditHash();
    const dataToHash = JSON.stringify({ action, targetType, targetId, districtId, timestamp: new Date().toISOString() });
    const hash = computeAuditHash(dataToHash, prevHash);

    await prisma.auditLog.create({
      data: {
        action,
        userId,
        // Map model name to entityType for audit schema
        entityType: targetType || 'SYSTEM',
        entityId: (typeof targetId === 'number' && targetId > 0) ? targetId : (districtId || 0),
        targetId,
        targetType,
        districtId: districtId || 0,
        hash,
        prevHash
      }
    }).catch(() => {});
  } catch (error) {
    console.warn("⚠️ [AUDIT] Background logging failed:", error);
  }
}

// Apply the extension
const extendedPrisma = prisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const tenantScopedOperations = [
          'findMany', 'findFirst', 'findFirstOrThrow',
          'update', 'updateMany', 
          'delete', 'deleteMany', 
          'count', 'countDocuments'
        ];

        const ctx = tenantContext.getStore();

        if (
          tenantScopedOperations.includes(operation) &&
          ctx?.districtId != null &&
          ctx.districtId > 0
        ) {
          const modelName = model.toLowerCase();

          const globalModels = ['district', 'districtsettings', 'globalconfig', 'systemconfig'];
          if (globalModels.includes(modelName)) {
            return query(args);
          }

          if (args && typeof args === 'object' && 'where' in args) {
            const currentWhere = (args as any).where || {};

            // MODELS WITH DIRECT districtId FIELD
            const directDistrictModels = [
              'user',
              'vendor',
              'product',
              'order',
              'offer',
              'category',
              'shop',
              'banner',
              'auditlog',
              'adminactionlog'
            ];

            if (directDistrictModels.includes(modelName)) {
              (args as any).where = {
                ...currentWhere,
                districtId: ctx.districtId
              };
            }

            // MODELS REQUIRING RELATIONAL DISTRICT FILTER
            else if (modelName === 'fraudhistory') {
              (args as any).where = {
                ...currentWhere,
                vendor: {
                  districtId: ctx.districtId
                }
              };
            }

            else if (modelName === 'review') {
              (args as any).where = {
                ...currentWhere,
                product: {
                  districtId: ctx.districtId
                }
              };
            }

            else if (modelName === 'productimage') {
              (args as any).where = {
                ...currentWhere,
                product: {
                  districtId: ctx.districtId
                }
              };
            }

            // models without district boundary remain untouched
          }
        }

        const result = await query(args);

        // Background audit logging for write operations (non-blocking)
        if (writeOperations.includes(operation) && !shouldSkipAudit(model)) {
          let targetId: number | undefined;
          
          if (args && typeof args === 'object') {
            if ('where' in args && (args as any).where && typeof (args as any).where === 'object' && 'id' in (args as any).where) {
              targetId = Number((args as any).where.id);
            } else if ('data' in args && (args as any).data && typeof (args as any).data === 'object' && 'id' in (args as any).data) {
              targetId = Number((args as any).data.id);
            }
          }
          
          setImmediate(() => {
            logAuditEntry(
              `${operation}_${model}`,
              ctx?.userId,
              ctx?.districtId,
              targetId || 0,
              model
            );
          });
        }

        return result;
      }
    }
  }
});

// Replace prisma with extended version
export const db = extendedPrisma as typeof prisma;

// Database connection status tracking
let dbConnected = false;
let dbConnectionChecked = false;

/**
 * Check database connection and set status flag
 * Call this on server startup and periodically
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  if (dbConnectionChecked && dbConnected) return true;
  
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
    dbConnectionChecked = true;
    console.log("✅ [DB] Database connection verified");
    return true;
  } catch (error: any) {
    dbConnected = false;
    dbConnectionChecked = true;
    console.error("❌ [DB] Database connection failed:", error?.message);
    return false;
  }
}

/**
 * Get current database connection status
 */
export function isDatabaseConnected(): boolean {
  return dbConnected;
}

/**
 * Wrapper to check DB before operations
 * Throws helpful error if DB is unavailable
 */
function requireDatabase(): void {
  if (!dbConnected) {
    const error = new Error("Database unavailable. Please try again later.");
    (error as any).code = "DB_UNAVAILABLE";
    (error as any).statusCode = 503;
    throw error;
  }
}

function requireTenantContextDistrict(): number {
  const ctx = tenantContext.getStore();
  if (!ctx?.districtId || ctx.districtId <= 0) {
    throw new Error("TENANT_CONTEXT_VIOLATION: district context missing");
  }
  return ctx.districtId;
}



type InsertUser = Prisma.UserUncheckedCreateInput;
type InsertShop = Prisma.ShopUncheckedCreateInput;
type InsertProduct = {
  vendorId: number;
  title?: string;
  name?: string;
  description?: string | null;
  price?: string | number | null;
  mrp?: string | number | null;
  imageUrl?: string | null;
  category?: string | null;
  categoryName?: string | null;
  categoryId?: number | null;
  approved?: boolean;
  status?: string;
  stock?: number;
  vectorEmbedding?: number[];
  districtId: number;
};
type InsertProductImage = Prisma.ProductImageUncheckedCreateInput;
type InsertOffer = Prisma.OfferUncheckedCreateInput & { userId?: number | null };
type InsertBanner = Prisma.BannerUncheckedCreateInput;
type InsertCategory = {
  name: string;
  imageUrl?: string | null;
  slug?: string;
  districtId?: number;
};
type InsertOrder = {
  userId?: number | null;
  productId: number;
  vendorId?: number | null;
  districtId?: number | null;
  quantity?: number;
  totalPrice: number;
  status?: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  paymentStatus?: string;
  paymentMethod?: string | null;
};

const toNullableNumber = (value: string | number | null | undefined): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const toSlug = (input: string): string => {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
};

// Interface definitions
export interface IStorage {
  getUser(id: number): Promise<UserWithAdmin | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, update: Prisma.UserUncheckedUpdateInput): Promise<User>;
  getShops(): Promise<Shop[]>;
  getShop(id: number): Promise<Shop | undefined>;
  getShopByOwnerId(ownerId: number): Promise<Shop | undefined>;
  createShop(shop: InsertShop): Promise<Shop>;
  updateShop(id: number, shop: Prisma.ShopUncheckedUpdateInput): Promise<Shop>;
  deleteShop(id: number): Promise<void>;
  getProductsByShopId(shopId: number): Promise<Product[]>;
  getProductsByShopIdWithSeller(shopId: number, search?: string | null): Promise<any[]>;
  getAllProducts(approved?: boolean | null): Promise<Product[]>;
  getAllProductsWithSeller(districtId: number, approved?: boolean | null, search?: string | null): Promise<any[]>;
  getAllProductsUnfiltered(): Promise<any[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductWithSeller(id: number): Promise<any | undefined>;
  getProductsByMerchant(merchantId: number): Promise<any[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  getProductImages(productId: number): Promise<ProductImage[]>;
  createProductImage(image: InsertProductImage): Promise<ProductImage>;
  deleteProductImage(id: number): Promise<void>;
  getProductImagesBatch(productIds: number[]): Promise<Map<number, ProductImage[]>>;
  getPendingProducts(): Promise<Product[]>;
  getBanners(): Promise<Banner[]>;
  createBanner(banner: InsertBanner): Promise<Banner>;
  updateBanner(id: number, banner: Prisma.BannerUncheckedUpdateInput): Promise<Banner>;
  deleteBanner(id: number): Promise<void>;
  getOffers(districtId: number): Promise<Offer[]>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  deleteOffer(id: number): Promise<void>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(orderId: number, status: string, paymentStatus?: string, paymentId?: string): Promise<Order>;
  getOrdersWithPagination(page: number, limit: number, status?: string, vendorId?: number): Promise<{ data: Order[]; total: number; page: number; limit: number }>;
  getAllOrders(phone?: string): Promise<any[]>;
  getUserOrders(userId: number): Promise<any[]>;
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Prisma.CategoryUncheckedUpdateInput): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
  getDistrict(id: number): Promise<District | undefined>;
  getDistrictBySlug(slug: string): Promise<District | undefined>;
  getAllDistricts(): Promise<District[]>;
  createDistrict(data: any): Promise<District>;
  getAllUsers(): Promise<any[]>;
  getVendors(districtId: number, limit?: number): Promise<any[]>;
  getVendor(id: number): Promise<Vendor | undefined>;
  getVendorBySlug(slug: string, districtId: number): Promise<Vendor | undefined>;
  updateVendor(id: number, data: Prisma.VendorUncheckedUpdateInput): Promise<Vendor>;
  getStoresByDistrict(districtId: number): Promise<any[]>;
  // District analytics methods
  getVendorCountByDistrict(districtId: number): Promise<number>;
  getPendingVendorCountByDistrict(districtId: number): Promise<number>;
  getProductCountByDistrict(districtId: number): Promise<number>;
  getUserCountByDistrict(districtId: number): Promise<number>;
  getPendingVendorsByDistrict(districtId: number): Promise<any[]>;
  createVendor(data: Prisma.VendorUncheckedCreateInput): Promise<Vendor>;
  // Review methods
  getReviews(productId?: number, onlyPending?: boolean): Promise<any[]>;
  createReview(data: any): Promise<any>;
  updateReview(id: number, data: { isApproved?: boolean }): Promise<any>;
  deleteReview(id: number): Promise<void>;
}

// Storage implementation using Prisma
export const storage: IStorage = {
  // User methods
  async getUser(id: number): Promise<UserWithAdmin | undefined> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { adminProfile: true }
    });
    return user ?? undefined;
  },

  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({ where: { username } });
    return user ?? undefined;
  },

  async createUser(user: InsertUser): Promise<User> {
    return prisma.user.create({ data: user });
  },

  async updateUser(id: number, update: Prisma.UserUncheckedUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data: update });
  },

  // Shop methods
  async getShops(): Promise<Shop[]> {
    return prisma.shop.findMany();
  },

  async getShop(id: number): Promise<Shop | undefined> {
    const districtId = requireTenantContextDistrict();
    const shop = await prisma.shop.findFirst({
      where: { id, districtId }
    });
    return shop ?? undefined;
  },

  async getShopByOwnerId(ownerId: number): Promise<Shop | undefined> {
    const districtId = requireTenantContextDistrict();
    const shop = await prisma.shop.findFirst({
      where: { ownerId, districtId }
    });
    return shop ?? undefined;
  },

  async createShop(shop: InsertShop): Promise<Shop> {
    const data: Prisma.ShopUncheckedCreateInput = {
      name: shop.name,
      ownerId: shop.ownerId ?? null,
      slug: shop.slug ?? undefined,
      description: shop.description ?? null,
      image: shop.image ?? null,
      address: shop.address ?? null,
      phone: shop.phone ?? null,
      mobile: shop.mobile ?? null,
      category: shop.category ?? null,
      isVerified: shop.isVerified ?? false,
      approved: shop.approved ?? false,
      avgRating: shop.avgRating ?? null,
      districtId: shop.districtId,
    };

    return prisma.shop.create({ data });
  },

  async updateShop(id: number, shop: Prisma.ShopUncheckedUpdateInput): Promise<Shop> {
    return prisma.shop.update({ where: { id }, data: shop });
  },

  async deleteShop(id: number): Promise<void> {
    await prisma.shop.delete({ where: { id } });
  },

  // Product methods
  async getProductsByShopId(shopId: number): Promise<Product[]> {
    // Note: Prisma Product uses vendorId, not shopId
    // For compatibility, we treat shopId as vendorId
    return prisma.product.findMany({ where: { vendorId: shopId } });
  },

  async getProductsByShopIdWithSeller(shopId: number, search?: string | null): Promise<any[]> {
    const where: Prisma.ProductWhereInput = { vendorId: shopId };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    return prisma.product.findMany({
      where,
      include: { vendor: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async getAllProducts(approved?: boolean | null): Promise<Product[]> {
    const where: Prisma.ProductWhereInput = {};
    if (approved !== null && approved !== undefined) {
      where.approved = approved;
    }
    return prisma.product.findMany({ where });
  },

  async getAllProductsWithSeller(districtId: number, approved?: boolean | null, search?: string | null): Promise<any[]> {
    // 🚨 STRICT STORAGE: districtId is required for data isolation
    if (!districtId) {
      throw new Error('STORAGE_VIOLATION: districtId is required for data access');
    }
    
    const where: Prisma.ProductWhereInput = {};
    if (approved !== null && approved !== undefined) {
      where.approved = approved;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    // Add district filtering for tenant isolation (REQUIRED)
    where.vendor = { districtId };

    return prisma.product.findMany({
      where,
      include: { 
        vendor: { include: { vendorMLProfile: true } }, 
        category: true 
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async getAllProductsUnfiltered(): Promise<any[]> {
    const districtId = requireTenantContextDistrict();
    return prisma.product.findMany({
      where: { districtId },
      include: { vendor: true, category: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async getProduct(id: number): Promise<Product | undefined> {
    const districtId = requireTenantContextDistrict();
    const product = await prisma.product.findFirst({
      where: { id, districtId }
    });
    return product ?? undefined;
  },

  async getProductWithSeller(id: number): Promise<any | undefined> {
    const districtId = requireTenantContextDistrict();
    const product = await prisma.product.findFirst({
      where: { id, districtId },
      include: { vendor: true, category: true },
    });
    return product ?? undefined;
  },

  async getProductsByMerchant(merchantId: number): Promise<any[]> {
    const districtId = requireTenantContextDistrict();
    return prisma.product.findMany({
      where: {
        vendorId: merchantId,
        districtId
      },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async createProduct(product: InsertProduct): Promise<Product> {
    const data: Prisma.ProductUncheckedCreateInput = {
      vendorId: product.vendorId,
      title: (product.title ?? product.name ?? "").trim() || "Untitled Product",
      description: product.description ?? null,
      price: toNullableNumber(product.price),
      mrp: toNullableNumber(product.mrp),
      imageUrl: product.imageUrl ?? null,
      categoryName: product.categoryName ?? (product.category ?? null),
      categoryId: product.categoryId ?? undefined,
      approved: product.approved ?? false,
       status: product.status ?? "pending",
       ...(product.vectorEmbedding !== undefined && {
         vectorEmbedding: product.vectorEmbedding as Prisma.InputJsonValue,
       }),
       districtId: product.districtId,
     };

    return prisma.product.create({ data });
  },

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product> {
    const data: Prisma.ProductUncheckedUpdateInput = {
      ...(product.title !== undefined && { title: product.title }),
      ...(product.name !== undefined && { title: product.name }),
      ...(product.description !== undefined && { description: product.description }),
      ...(product.price !== undefined && { price: toNullableNumber(product.price) }),
      ...(product.mrp !== undefined && { mrp: toNullableNumber(product.mrp) }),
      ...(product.imageUrl !== undefined && { imageUrl: product.imageUrl }),
      ...(product.categoryName !== undefined && { categoryName: product.categoryName }),
      ...(product.category !== undefined && { categoryName: product.category }),
      ...(product.categoryId !== undefined && { categoryId: product.categoryId }),
      ...(product.status !== undefined && { status: product.status }),
      ...(product.approved !== undefined && { approved: product.approved }),
      ...(product.vectorEmbedding !== undefined && {
        vectorEmbedding: product.vectorEmbedding as Prisma.InputJsonValue,
      }),
    };

    return prisma.product.update({ where: { id }, data });
  },

  async deleteProduct(id: number): Promise<void> {
    await prisma.product.delete({ where: { id } });
  },

  // Product Image methods
  async getProductImages(productId: number): Promise<ProductImage[]> {
    return prisma.productImage.findMany({ where: { productId } });
  },

  async createProductImage(image: InsertProductImage): Promise<ProductImage> {
    return prisma.productImage.create({ data: image });
  },

  async deleteProductImage(id: number): Promise<void> {
    await prisma.productImage.delete({ where: { id } });
  },

  async getProductImagesBatch(productIds: number[]): Promise<Map<number, ProductImage[]>> {
    const images = await prisma.productImage.findMany({
      where: { productId: { in: productIds } },
    });

    const map = new Map<number, ProductImage[]>();
    for (const img of images) {
      const list = map.get(img.productId) || [];
      list.push(img);
      map.set(img.productId, list);
    }
    return map;
  },

  async getPendingProducts(): Promise<Product[]> {
    const districtId = requireTenantContextDistrict();
    return prisma.product.findMany({
      where: {
        approved: false,
        districtId
      }
    });
  },

  // Banner methods
  async getBanners(): Promise<Banner[]> {
    return prisma.banner.findMany({ where: { isActive: true } });
  },

  async createBanner(banner: InsertBanner): Promise<Banner> {
    return prisma.banner.create({ data: banner });
  },

  async updateBanner(id: number, banner: Prisma.BannerUncheckedUpdateInput): Promise<Banner> {
    return prisma.banner.update({ where: { id }, data: banner });
  },

  async deleteBanner(id: number): Promise<void> {
    await prisma.banner.delete({ where: { id } });
  },

  // Offer methods
  async getOffers(districtId: number): Promise<Offer[]> {
    // 🚨 STRICT STORAGE: districtId is required for data isolation
    if (!districtId) {
      throw new Error('STORAGE_VIOLATION: districtId is required for data access');
    }
    
    try {
      return await prisma.offer.findMany({ 
        where: { 
          isActive: true,
          districtId  // REQUIRED - no more optional
        } 
      });
    } catch (error) {
      console.error('[Storage] getOffers error:', error);
      return [];
    }
  },

  async createOffer(offer: InsertOffer): Promise<Offer> {
    // Determine the type based on whether userId is provided (Admin = GLOBAL_NEWS)
    const type = offer.userId ? "GLOBAL_NEWS" : (offer.type || "VENDOR_OFFER");
    const data = { ...offer, type } as Prisma.OfferUncheckedCreateInput;
    return prisma.offer.create({ data });
  },

  async deleteOffer(id: number): Promise<void> {
    await prisma.offer.delete({ where: { id } });
  },

  // Order methods - using real Order model
  async createOrder(order: InsertOrder): Promise<Order> {
    const data: Prisma.OrderUncheckedCreateInput = {
      userId: order.userId || null,
      productId: order.productId,
      vendorId: order.vendorId || null,
      districtId: order.districtId ?? 0,
      quantity: order.quantity || 1,
      totalPrice: order.totalPrice,
      status: order.status || "Confirmed",
      customerName: order.customerName || null,
      customerPhone: order.customerPhone || null,
      customerAddress: order.customerAddress || null,
      paymentStatus: order.paymentStatus || "pending",
      paymentMethod: order.paymentMethod || null,
    };

    return prisma.order.create({ data });
  },

  async updateOrderStatus(
    orderId: number,
    status: string,
    paymentStatus?: string,
    paymentId?: string
  ): Promise<Order> {
    const updateData: Prisma.OrderUncheckedUpdateInput = {
      status,
    };

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }

    // Store payment ID in the dedicated field
    if (paymentId) {
      updateData.paymentId = paymentId;
    }

    return prisma.order.update({ where: { id: orderId }, data: updateData });
  },

  async getOrdersWithPagination(
    page: number,
    limit: number,
    status?: string,
    vendorId?: number
  ): Promise<{ data: Order[]; total: number; page: number; limit: number }> {
    const districtId = requireTenantContextDistrict();
    const skip = (page - 1) * limit;
    const where: Prisma.OrderWhereInput = {
      districtId,
    };

    if (status) {
      where.status = status;
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          product: true,
          user: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    return { data, total, page, limit };
  },

  // Get all orders (for admin) with optional phone filter
  async getAllOrders(phone?: string): Promise<any[]> {
    try {
      const districtId = requireTenantContextDistrict();
      const where: Prisma.OrderWhereInput = {
        districtId,
        ...(phone ? { customerPhone: phone } : {})
      };
      
      const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          product: {
            include: {
              vendor: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  address: true,
                  logo: true,
                  isVerified: true,
                  dsslScore: true,
                  safetyBadges: true,
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              username: true,
            }
          }
        },
      });

      return orders.map(order => ({
        id: order.id,
        userId: order.userId,
        productId: order.productId,
        vendorId: order.vendorId,
        districtId: order.districtId,
        quantity: order.quantity,
        totalPrice: order.totalPrice,
        status: order.status,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        paymentId: order.paymentId,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        product: order.product ? {
          id: order.product.id,
          name: (order.product as any).title || (order.product as any).name || "Unknown Product",
          imageUrl: (order.product as any).imageUrl,
          price: (order.product as any).price,
        } : undefined,
        vendor: order.product?.vendor ? {
          id: order.product.vendor.id,
          name: order.product.vendor.name,
          phone: order.product.vendor.phone,
        } : undefined,
        user: order.user ? {
          id: order.user.id,
          username: order.user.username,
        } : undefined,
      }));
    } catch (error) {
      console.error('[Storage] getAllOrders error:', error);
      return [];
    }
  },

  // Get all orders for a specific user with product and vendor details
  async getUserOrders(userId: number): Promise<any[]> {
    const orders = await prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
                phone: true,
                address: true,
                logo: true,
                isVerified: true,
                dsslScore: true,
                safetyBadges: true,
              }
            }
          }
        },
      },
    });

    // Transform to match frontend interface
    return orders.map(order => ({
      id: order.id,
      productId: order.productId,
      vendorId: order.vendorId,
      quantity: order.quantity,
      totalPrice: order.totalPrice,
      status: order.status,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      vendor: order.product?.vendor ? {
        name: order.product.vendor.name,
        phone: order.product.vendor.phone,
        address: order.product.vendor.address,
        logo: order.product.vendor.logo,
        isVerified: order.product.vendor.isVerified,
        dsslScore: order.product.vendor.dsslScore,
        safetyBadges: order.product.vendor.safetyBadges,
      } : undefined,
      product: order.product ? {
        name: (order.product as any).title || (order.product as any).name || "Unknown Product",
        imageUrl: (order.product as any).imageUrl,
        price: (order.product as any).price,
      } : undefined,
    }));
  },

  // Review methods - using Prisma instead of Drizzle
  async getReviews(productId?: number, onlyPending?: boolean): Promise<any[]> {
    try {
      const districtId = requireTenantContextDistrict();
      const where: Prisma.ReviewWhereInput = {};
      if (productId) {
        where.productId = productId;
      }
      if (onlyPending) {
        where.isApproved = false;
      }
      where.product = { districtId };
      
      const reviews = await prisma.review.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              title: true,
              imageUrl: true,
            }
          },
          user: {
            select: {
              id: true,
              username: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return reviews;
    } catch (error) {
      console.error('[Storage] getReviews error:', error);
      return [];
    }
  },

  async createReview(data: any): Promise<any> {
    try {
      const review = await prisma.review.create({
        data: {
          productId: data.productId,
          userId: data.userId || null,
          rating: data.rating,
          comment: data.comment || null,
          isApproved: false,
        }
      });
      return review;
    } catch (error) {
      console.error('[Storage] createReview error:', error);
      throw error;
    }
  },

  async updateReview(id: number, data: { isApproved?: boolean }): Promise<any> {
    try {
      const review = await prisma.review.update({
        where: { id },
        data: { isApproved: data.isApproved }
      });
      return review;
    } catch (error) {
      console.error('[Storage] updateReview error:', error);
      throw error;
    }
  },

  async deleteReview(id: number): Promise<void> {
    try {
      await prisma.review.delete({ where: { id } });
    } catch (error) {
      console.error('[Storage] deleteReview error:', error);
      throw error;
    }
  },

  // Category methods
  async getCategories(): Promise<Category[]> {
    return prisma.category.findMany({ where: { isActive: true } });
  },

  async createCategory(category: InsertCategory): Promise<Category> {
    const data: Prisma.CategoryUncheckedCreateInput = {
      name: category.name,
      slug: category.slug ?? toSlug(category.name),
      imageUrl: category.imageUrl ?? null,
      districtId: category.districtId ?? 0,
    };

    return prisma.category.create({ data });
  },

  async updateCategory(id: number, category: Prisma.CategoryUncheckedUpdateInput): Promise<Category> {
    return prisma.category.update({ where: { id }, data: category });
  },

  async deleteCategory(id: number): Promise<void> {
    await prisma.category.delete({ where: { id } });
  },

  // District methods
  async getDistrict(id: number): Promise<District | undefined> {
    try {
      const district = await prisma.district.findUnique({ where: { id } });
      return district ?? undefined;
    } catch (error) {
      console.error('[Storage] getDistrict error:', error);
      return undefined;
    }
  },

  async getDistrictBySlug(slug: string): Promise<District | undefined> {
    try {
      const district = await prisma.district.findFirst({ where: { slug } });
      return district ?? undefined;
    } catch (error) {
      console.error('[Storage] getDistrictBySlug error:', error);
      return undefined;
    }
  },

  async getAllDistricts(): Promise<District[]> {
    try {
      return await prisma.district.findMany({
        orderBy: { name: 'asc' }
      });
    } catch (error) {
      console.error('[Storage] getAllDistricts error:', error);
      return [];
    }
  },

  async createDistrict(data: any): Promise<District> {
    try {
      return await prisma.district.create({
        data: {
          name: data.name,
          slug: data.slug,
          state: data.state,
          primaryColor: data.primaryColor || '#f97316',
          secondaryColor: data.secondaryColor || '#22c55e',
          logoUrl: data.logoUrl,
          faviconUrl: data.faviconUrl,
          dsslContact: data.dsslContact,
          dsslEmail: data.dsslEmail,
          isActive: data.isActive ?? true,
          isDefault: data.isDefault ?? false,
          metaTitle: data.metaTitle,
          metaDescription: data.metaDescription,
          themeConfig: data.themeConfig || null,
        }
      });
    } catch (error) {
      console.error('[Storage] createDistrict error:', error);
      throw error;
    }
  },

  async getAllUsers(): Promise<any[]> {
    try {
      const districtId = requireTenantContextDistrict();
      return await prisma.user.findMany({
        where: { districtId },
        include: {
          district: true
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('[Storage] getAllUsers error:', error);
      return [];
    }
  },

  // Vendor methods
  async getVendors(districtId: number, limit?: number): Promise<any[]> {
    // 🚨 STRICT STORAGE: districtId is required for data isolation
    if (!districtId) {
      throw new Error('STORAGE_VIOLATION: districtId is required for data access');
    }
    
    try {
      const vendors = await prisma.vendor.findMany({
        where: { districtId },  // REQUIRED - no more optional
        take: limit,
        orderBy: { id: 'desc' }
      });
      
      return vendors;
    } catch (error) {
      console.error('[Storage] getVendors error:', error);
      return [];
    }
  },

  // Get a single vendor by ID
  async getVendor(id: number): Promise<Vendor | undefined> {
    const districtId = requireTenantContextDistrict();
    const vendor = await prisma.vendor.findFirst({
      where: { id, districtId }
    });
    return vendor || undefined;
  },

  // Get a single vendor by slug
  async getVendorBySlug(slug: string, districtId: number): Promise<any | undefined> {
    const vendor = await prisma.vendor.findFirst({
      where: {
        slug,
        districtId, // 🛡️ 'Sovereign' बाउंड्री बहाल
        isShadowBanned: false
      },
      include: { products: true }
    });

    if (!vendor) return undefined;

    // Frontend needs 'image' field, which is 'logo' in Vendor table
    return {
      ...vendor,
      image: vendor.logo || null,
      category: (vendor as any).category || vendor.businessType || 'Retail'
    };
  },

  // Update a vendor
  async updateVendor(id: number, data: Prisma.VendorUncheckedUpdateInput): Promise<Vendor> {
    return prisma.vendor.update({
      where: { id },
      data
    });
  },

  // Create a new vendor
  async createVendor(data: Prisma.VendorUncheckedCreateInput): Promise<Vendor> {
    return prisma.vendor.create({
      data
    });
  },

  // Store methods (alias for vendors)
  async getStoresByDistrict(districtId: number): Promise<any[]> {
    const vendors = await prisma.vendor.findMany({
      where: { districtId },
      orderBy: { name: 'asc' }
    });
    
    // Map vendor fields to frontend expected format
    return vendors.map(vendor => ({
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      category: (vendor as any).category || vendor.businessType || null,
      businessType: vendor.businessType,
      type: vendor.businessType,
      description: vendor.description,
      image: vendor.logo || null,  // Map logo to image for frontend
      logo: vendor.logo,
      address: vendor.address,
      phone: vendor.phone,
      mobile: vendor.mobile,
      rating: null,
      avgRating: null,
      reviewCount: null,
      isVerified: vendor.isVerified,
      isHospital: vendor.isHospital,
      dsslScore: vendor.dsslScore ?? 0,
      safetyBadges: vendor.safetyBadges || [],
    }));
  },

  // District analytics methods
  async getVendorCountByDistrict(districtId: number): Promise<number> {
    return prisma.vendor.count({
      where: { districtId }
    });
  },

  async getPendingVendorCountByDistrict(districtId: number): Promise<number> {
    return prisma.vendor.count({
      where: { 
        districtId,
        status: 'PENDING'
      }
    });
  },

  async getProductCountByDistrict(districtId: number): Promise<number> {
    // Count products belonging to vendors in this district
    const vendorsInDistrict = await prisma.vendor.findMany({
      where: { districtId },
      select: { id: true }
    });
    const vendorIds = vendorsInDistrict.map(v => v.id);
    
    return prisma.product.count({
      where: { vendorId: { in: vendorIds } }
    });
  },

  async getUserCountByDistrict(districtId: number): Promise<number> {
    return prisma.user.count({
      where: { districtId }
    });
  },

  async getPendingVendorsByDistrict(districtId: number): Promise<any[]> {
    const vendors = await prisma.vendor.findMany({
      where: { 
        districtId,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return vendors.map(vendor => ({
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      category: (vendor as any).category || vendor.businessType || null,
      businessType: vendor.businessType,
      type: vendor.businessType,
      description: vendor.description,
      image: vendor.logo || null,
      logo: vendor.logo,
      address: vendor.address,
      phone: vendor.phone,
      mobile: vendor.mobile,
      isVerified: vendor.isVerified,
      status: vendor.status,
      createdAt: vendor.createdAt,
    }));
  },
};
