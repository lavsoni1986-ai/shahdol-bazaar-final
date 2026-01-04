import {
  users,
  shops,
  products,
  offers,
  orders,
  banners,
  categories,
  type User,
  type InsertUser,
  type Shop,
  type InsertShop,
  type Product,
  type InsertProduct,
  type Offer,
  type InsertOffer,
  type Order,
  type InsertOrder,
  type Banner,
  type InsertBanner,
  type Category,
  type InsertCategory,
} from "../shared/schema.js";
import { db } from "./db.js";
import { eq, and, ilike, or } from "drizzle-orm";

// Interface definitions
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, update: Partial<User>): Promise<User>;
  getShops(): Promise<Shop[]>;
  getShop(id: number): Promise<Shop | undefined>;
  getShopByOwnerId(ownerId: number): Promise<Shop | undefined>;
  createShop(shop: InsertShop): Promise<Shop>;
  updateShop(id: number, shop: Partial<InsertShop>): Promise<Shop>;
  deleteShop(id: number): Promise<void>;
  getProductsByShopId(shopId: number): Promise<Product[]>;
  getProductsByShopIdWithSeller(shopId: number, search?: string | null): Promise<any[]>;
  getAllProducts(approved?: boolean | null): Promise<Product[]>;
  getAllProductsWithSeller(approved?: boolean | null, search?: string | null): Promise<any[]>;
  getAllProductsUnfiltered(): Promise<any[]>;
  getProduct(id: number): Promise<Product | undefined>;
  getProductWithSeller(id: number): Promise<any | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, update: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  getOffers(): Promise<Offer[]>;
  getOffer(id: number): Promise<Offer | undefined>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  updateOffer(id: number, update: Partial<InsertOffer>): Promise<Offer>;
  deleteOffer(id: number): Promise<void>;
  createOrder(order: InsertOrder): Promise<Order>;
  getOrdersByShopId(shopId: number): Promise<Order[]>;
  updateOrderStatus(orderId: number, status: string): Promise<Order>;
  // Banners
  getBanners(): Promise<Banner[]>;
  createBanner(banner: InsertBanner): Promise<Banner>;
  deleteBanner(id: number): Promise<void>;
  updateBanner(id: number, update: Partial<InsertBanner>): Promise<Banner>;
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
  // Categories
  getCategories(): Promise<Category[]>;
  createCategory(category: InsertCategory): Promise<Category>;
  deleteCategory(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // --- USER METHODS ---
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const normalized: InsertUser = {
      ...insertUser,
      shopName: insertUser.shopName ?? null,
      shopAddress: insertUser.shopAddress ?? null,
      mapsLink: insertUser.mapsLink ?? null,
    };
    const [user] = await db.insert(users).values(normalized).returning();
    return user;
  }

  async updateUser(id: number, update: Partial<User>): Promise<User> {
    const [user] = await db.update(users).set(update).where(eq(users.id, id)).returning();
    return user;
  }

  // --- SHOP METHODS ---
  async getShops(): Promise<Shop[]> {
    return await db.select().from(shops);
  }

  async getShop(id: number): Promise<Shop | undefined> {
    const [shop] = await db.select().from(shops).where(eq(shops.id, id));
    return shop;
  }

  async getShopByOwnerId(ownerId: number): Promise<Shop | undefined> {
    const [shop] = await db.select().from(shops).where(eq(shops.ownerId, ownerId));
    return shop;
  }

  async createShop(insertShop: InsertShop): Promise<Shop> {
    const normalized: InsertShop = {
      ...insertShop,
      description: insertShop.description ?? null,
      address: insertShop.address ?? null,
      contactNumber: insertShop.contactNumber ?? null,
      image: insertShop.image ?? null,
    };
    const [shop] = await db.insert(shops).values(normalized).returning();
    return shop;
  }

  async updateShop(id: number, update: Partial<InsertShop>): Promise<Shop> {
    const [shop] = await db.update(shops).set(update).where(eq(shops.id, id)).returning();
    return shop;
  }

  async deleteShop(id: number): Promise<void> {
    await db.delete(shops).where(eq(shops.id, id));
  }

  // --- PRODUCT METHODS ---
  async getProductsByShopId(shopId: number): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.shopId, shopId));
  }

  async getProductsByShopIdWithSeller(shopId: number, search?: string | null): Promise<any[]> {
    const base = db
      .select({
        id: products.id,
        shopId: products.shopId,
        sellerId: products.sellerId,
        name: products.name,
        price: products.price,
        imageUrl: products.imageUrl,
        category: products.category,
        description: products.description,
        approved: products.approved,
        status: products.status,
        createdAt: products.createdAt,
        shopName: users.shopName,
        shopAddress: users.shopAddress,
        contactNumber: shops.contactNumber,
        mobile: shops.mobile,
      })
      .from(products)
      .leftJoin(users, eq(users.id, products.sellerId))
      .leftJoin(shops, eq(shops.id, products.shopId));

    const conditions = [eq(products.shopId, shopId)];
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(products.name, term),
          ilike(products.description, term),
        ),
      );
    }

    return await base.where(and(...conditions));
  }

  async getAllProducts(approved?: boolean | null): Promise<Product[]> {
    if (approved === undefined || approved === null) {
    return await db.select().from(products);
    }
    return await db.select().from(products).where(eq(products.approved, approved));
  }

  async getAllProductsWithSeller(approved?: boolean | null, search?: string | null): Promise<any[]> {
    const base = db
      .select({
        id: products.id,
        shopId: products.shopId,
        sellerId: products.sellerId,
        name: products.name,
        price: products.price,
        imageUrl: products.imageUrl,
        category: products.category,
        description: products.description,
        approved: products.approved,
        status: products.status,
        createdAt: products.createdAt,
        shopName: users.shopName,
        shopAddress: users.shopAddress,
        contactNumber: shops.contactNumber,
        mobile: shops.mobile,
      })
      .from(products)
      .leftJoin(users, eq(users.id, products.sellerId))
      .leftJoin(shops, eq(shops.id, products.shopId));

    const conditions = [];
    if (approved !== undefined && approved !== null) {
      conditions.push(eq(products.approved, approved));
    }
    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(products.name, term),
          ilike(products.category, term),
          ilike(products.description, term),
          ilike(users.shopName, term),
        ),
      );
    }

    if (conditions.length === 0) return await base;
    return await base.where(and(...conditions));
  }

  // Utility to fetch all products unfiltered (used when no search/category applied)
  async getAllProductsUnfiltered(): Promise<any[]> {
    return await db
      .select({
        ...products,
        shopName: users.shopName,
        shopAddress: users.shopAddress,
        contactNumber: shops.contactNumber,
        mobile: shops.mobile,
      })
      .from(products)
      .leftJoin(users, eq(users.id, products.sellerId))
      .leftJoin(shops, eq(shops.id, products.shopId));
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductWithSeller(id: number): Promise<any | undefined> {
    const [product] = await db
      .select({
        id: products.id,
        shopId: products.shopId,
        sellerId: products.sellerId,
        name: products.name,
        price: products.price,
        imageUrl: products.imageUrl,
        category: products.category,
        description: products.description,
        approved: products.approved,
        status: products.status,
        createdAt: products.createdAt,
        shopName: users.shopName,
        shopAddress: users.shopAddress,
        contactNumber: shops.contactNumber,
        mobile: shops.mobile,
      })
      .from(products)
      .leftJoin(users, eq(users.id, products.sellerId))
      .leftJoin(shops, eq(shops.id, products.shopId))
      .where(eq(products.id, id));
    return product;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const { description, imageUrl, ...rest } = insertProduct;
    const normalized: InsertProduct = {
      ...rest,
      imageUrl: imageUrl ?? null,
      description: description ?? null,
      approved: insertProduct.approved ?? false,
      status: insertProduct.status ?? "pending",
    };
    const [product] = await db.insert(products).values(normalized as any).returning();
    return product;
  }

  async updateProduct(id: number, update: Partial<InsertProduct>): Promise<Product> {
    const normalized: Partial<InsertProduct> = {
      ...update,
      ...("description" in update ? { description: update.description ?? null } : {}),
      ...("imageUrl" in update ? { imageUrl: update.imageUrl ?? null } : {}),
      ...("approved" in update ? { approved: update.approved ?? false } : {}),
      ...("status" in update ? { status: update.status ?? "pending" } : {}),
    };
    const [product] = await db.update(products).set(normalized as any).where(eq(products.id, id)).returning();
    return product;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // --- OFFER METHODS (Fixed for Neon "Offer" table) ---
  async getOffers(): Promise<Offer[]> {
    // lowercase 'offers' variable name from schema.ts mapping to Capital "Offer" in Neon
    return await db.select().from(offers);
  }

  async getOffer(id: number): Promise<Offer | undefined> {
    const [offer] = await db.select().from(offers).where(eq(offers.id, id));
    return offer;
  }

  async createOffer(insertOffer: InsertOffer): Promise<Offer> {
    // ✅ Ensure data is inserted into the table mapped to 'offers' in Drizzle
    const [offer] = await db.insert(offers).values(insertOffer).returning();
    return offer;
  }

  async updateOffer(id: number, update: Partial<InsertOffer>): Promise<Offer> {
    const [offer] = await db.update(offers).set(update).where(eq(offers.id, id)).returning();
    return offer;
  }

  async deleteOffer(id: number): Promise<void> {
    await db.delete(offers).where(eq(offers.id, id));
  }

  // --- ORDER METHODS ---
  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async getOrdersByShopId(shopId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.shopId, shopId));
  }

  async updateOrderStatus(orderId: number, status: string): Promise<Order> {
    const [updatedOrder] = await db.update(orders).set({ status }).where(eq(orders.id, orderId)).returning();
    return updatedOrder;
  }

  // --- BANNER METHODS ---
  async getBanners(): Promise<Banner[]> {
    return await db.select().from(banners).orderBy(banners.createdAt);
  }

  async createBanner(banner: InsertBanner): Promise<Banner> {
    const [created] = await db.insert(banners).values(banner).returning();
    return created;
  }

  async updateBanner(id: number, update: Partial<InsertBanner>): Promise<Banner> {
    const [row] = await db.update(banners).set(update).where(eq(banners.id, id)).returning();
    return row;
  }

  async deleteBanner(id: number): Promise<void> {
    await db.delete(banners).where(eq(banners.id, id));
  }

  // --- CATEGORY METHODS ---
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [row] = await db.insert(categories).values(category).returning();
    return row;
  }

  async deleteCategory(id: number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }
}

// Memory storage for fallback (keeping your sample data logic)
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private shops: Map<number, Shop>;
  private products: Map<number, Product>;
  private offers: Map<number, Offer>;
  private orders: Map<number, Order>;
  private banners: Map<number, Banner>;
  private categories: Map<number, Category>;
  private currentIds: { [key: string]: number };

  constructor() {
    this.users = new Map();
    this.shops = new Map();
    this.products = new Map();
    this.offers = new Map();
    this.orders = new Map();
    this.banners = new Map();
    this.currentIds = { users: 1, shops: 1, products: 1, offers: 1, orders: 1, banners: 1, categories: 1 };
    this.categories = new Map();
    this.currentIds = { users: 1, shops: 1, products: 1, offers: 1, orders: 1, banners: 1 };
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    const adminUser: User = {
      id: 1,
      username: "admin",
      password: "shahdol123",
      role: "admin",
      isAdmin: true,
      shopName: null,
      shopAddress: null,
      mapsLink: null,
    };
    this.users.set(1, adminUser);
    this.currentIds.users = 2;
  }

  async getUser(id: number) { return this.users.get(id); }
  async getUserByUsername(username: string) { return Array.from(this.users.values()).find(u => u.username === username); }
  async createUser(insertUser: InsertUser) { 
    const id = this.currentIds.users++;
    const user = {
      ...insertUser,
      id,
      role: insertUser.role || "customer",
      isAdmin: insertUser.isAdmin ?? false,
      shopName: insertUser.shopName ?? null,
      shopAddress: insertUser.shopAddress ?? null,
      mapsLink: insertUser.mapsLink ?? null,
    };
    this.users.set(id, user); return user;
  }
  async updateUser(id: number, update: Partial<User>) {
    const existing = this.users.get(id); if (!existing) throw new Error("User not found");
    const updated = { ...existing, ...update }; this.users.set(id, updated); return updated;
  }
  async getShops() { return Array.from(this.shops.values()); }
  async getShop(id: number) { return this.shops.get(id); }
  async getShopByOwnerId(ownerId: number) { return Array.from(this.shops.values()).find(s => s.ownerId === ownerId); }
  async createShop(insertShop: InsertShop) {
    const id = this.currentIds.shops++;
    const shop = {
      ...insertShop,
      id,
      description: insertShop.description ?? null,
      address: insertShop.address ?? null,
      contactNumber: insertShop.contactNumber ?? null,
      image: insertShop.image ?? null,
      approved: true,
      isFeatured: insertShop.isFeatured ?? false,
      isVerified: false,
      createdAt: new Date(),
      rating: null,
      reviewCount: null,
      avgRating: null,
    };
    this.shops.set(id, shop); return shop;
  }
  async updateShop(id: number, update: Partial<InsertShop>) {
    const existing = this.shops.get(id); if (!existing) throw new Error("Shop not found");
    const updated = { ...existing, ...update }; this.shops.set(id, updated as Shop); return updated as Shop;
  }
  async deleteShop(id: number) { this.shops.delete(id); }
  async getProductsByShopId(shopId: number) { return Array.from(this.products.values()).filter(p => p.shopId === shopId); }
  async getProductsByShopIdWithSeller(shopId: number) {
    return Array.from(this.products.values())
      .filter(p => p.shopId === shopId)
      .map(p => ({ ...p, shopName: undefined, shopAddress: undefined }));
  }
  async getAllProducts(approved?: boolean | null) {
    const list = Array.from(this.products.values());
    if (approved === undefined || approved === null) return list;
    return list.filter(p => p.approved === approved);
  }
  async getAllProductsWithSeller(approved?: boolean | null) {
    const list = await this.getAllProducts(approved);
    return list.map(p => ({ ...p, shopName: undefined, shopAddress: undefined }));
  }
  async getAllProductsUnfiltered(): Promise<any[]> {
    return Array.from(this.products.values());
  }
  async getProduct(id: number) { return this.products.get(id); }
  async getProductWithSeller(id: number) {
    const p = this.products.get(id);
    if (!p) return undefined;
    return { ...p, shopName: undefined, shopAddress: undefined };
  }
  async createProduct(insertProduct: InsertProduct) {
    const id = this.currentIds.products++;
    const product = {
      ...insertProduct,
      id,
      imageUrl: insertProduct.imageUrl ?? null,
      description: insertProduct.description ?? null,
      approved: insertProduct.approved ?? false,
      status: insertProduct.status || "pending",
      createdAt: new Date(),
    };
    this.products.set(id, product as Product); return product as Product;
  }
  async updateProduct(id: number, update: Partial<InsertProduct>) {
    const existing = this.products.get(id); if (!existing) throw new Error("Product not found");
    const updated = {
      ...existing,
      ...update,
      imageUrl: "imageUrl" in update ? update.imageUrl ?? null : existing.imageUrl ?? null,
      description: "description" in update ? update.description ?? null : existing.description ?? null,
      approved: update.approved ?? existing.approved ?? false,
      status: "status" in update ? update.status ?? existing.status ?? "pending" : existing.status ?? "pending",
    };
    this.products.set(id, updated as Product); return updated as Product;
  }
  async deleteProduct(id: number) { this.products.delete(id); }
  async getBanners() { return Array.from(this.banners.values()); }
  async createBanner(banner: InsertBanner) {
    const id = this.currentIds.banners++;
    const record = { ...banner, id, createdAt: new Date() } as Banner;
    this.banners.set(id, record);
    return record;
  }
  async updateBanner(id: number, update: Partial<InsertBanner>) {
    const existing = this.banners.get(id);
    if (!existing) throw new Error("Banner not found");
    const merged = { ...existing, ...update } as Banner;
    this.banners.set(id, merged);
    return merged;
  }
  async deleteBanner(id: number) { this.banners.delete(id); }
  async getCategories() { return Array.from(this.categories.values()); }
  async createCategory(insertCategory: InsertCategory) {
    const id = this.currentIds.categories++;
    const row = { ...insertCategory, id, createdAt: new Date() } as Category;
    this.categories.set(id, row);
    return row;
  }
  async deleteCategory(id: number) { this.categories.delete(id); }
  async getOffers() { return Array.from(this.offers.values()); }
  async getOffer(id: number) { return this.offers.get(id); }
  async createOffer(insertOffer: InsertOffer) {
    const id = this.currentIds.offers++;
    // Ensure userId is never undefined for type safety in TS
    const offer = {
      ...insertOffer,
      userId: insertOffer.userId ?? null,
      id,
      isActive: insertOffer.isActive ?? true,
      createdAt: new Date(),
    };
    this.offers.set(id, offer);
    return offer;
  }
  async updateOffer(id: number, update: Partial<InsertOffer>) {
    const existing = this.offers.get(id); if (!existing) throw new Error("Offer not found");
    const updated = { ...existing, ...update }; this.offers.set(id, updated as Offer); return updated as Offer;
  }
  async deleteOffer(id: number) { this.offers.delete(id); }
  async createOrder(order: InsertOrder) {
    const id = this.currentIds.orders++;
    const newOrder = { ...order, id, createdAt: new Date() };
    this.orders.set(id, newOrder as Order); return newOrder as Order;
  }
  async getOrdersByShopId(shopId: number) { return Array.from(this.orders.values()).filter(o => o.shopId === shopId); }
  async updateOrderStatus(orderId: number, status: string) {
    const order = this.orders.get(orderId); if (!order) throw new Error("Order not found");
    const updated = { ...order, status }; this.orders.set(orderId, updated); return updated;
  }
}

export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();