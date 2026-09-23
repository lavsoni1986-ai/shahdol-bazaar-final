import express, { type Request, type Response } from "express";
import { requireAuth, requireMerchant } from "../../auth/middleware";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { success, failure } from "../../lib/apiResponse";
import { mapProductToDTO, type ProductEntity } from "../../dto/entity.dto";
import {
  findProductBySlug,
  findMerchantProductsByVendor,
  findMerchantProductById,
  createMerchantProduct,
  updateMerchantProduct,
  deleteMerchantProduct,
  createMerchantProductImage,
  deleteMerchantProductImage,
  getMerchantProductImages
} from "../../repositories/product.repo";
import { resolveMerchantVendorOrThrow } from "../../repositories/vendor.repo";
import { prisma } from "../../storage";
import { resolveProductById, resolveProductByEntityKey, normalizeSlug } from "../../services/entity-resolution";
import { EntityResolutionFailure } from "../../services/entity-resolution/types";
import { validateProductCreation, GovernanceViolation, DistrictMismatchError } from "../../services/governance";

const router = express.Router();

// Cloudinary configuration for image uploads
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadStorage = new CloudinaryStorage({
  cloudinary,
  params: async () => ({
    folder: process.env.CLOUDINARY_UPLOAD_FOLDER || "shahdol-bazaar",
    resource_type: "image",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  }),
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
});
const uploadSingle = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

// ============================================
// 📦 INVENTORY FLOW - PUBLIC ENDPOINTS
// ============================================

// --- FETCH PRODUCTS BY DISTRICT (Sovereign Discovery) ---
router.get("/products", async (req: Request, res: Response) => {
  try {
    const setNoStore = (res: Response) => res.setHeader("Cache-Control", "no-store, max-age=0");
    setNoStore(res);

    const districtId = req.ctx?.districtId;
    const vendorId = req.query.vendorId ? Number(req.query.vendorId) : null;

    if (!districtId) {
      return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "District not resolved" } });
    }

    let products: ProductEntity[] = [];
    let metaSource;

    if (vendorId) {
      // Fetch products by vendor from Prisma
      // Uses sovereign Product.districtId for direct district isolation
      const vendorProducts = await prisma.product.findMany({
        where: {
          vendorId,
          districtId,
          approved: true,
          status: { in: ["approved", "APPROVED", "active", "ACTIVE"] },
          vendor: {
            status: "APPROVED",
            isShadowBanned: false,
            businessType: { notIn: ["SERVICE", "HEALTHCARE", "SCHOOL", "EDUCATION"] },
            category: { notIn: ["SERVICE", "HEALTHCARE", "HOSPITAL", "SCHOOL", "EDUCATION", "DOCTOR", "CLINIC", "service", "healthcare", "hospital", "school", "education", "doctor", "clinic"] }
          }
        },
        include: {
          vendor: true,
          images: true
        }
      });

      products = await Promise.all(vendorProducts.map((product) => mapProductToDTO(product, (product as any).vendor)));
      metaSource = "VENDOR_PRODUCTS";
    } else {
      // Fetch all approved products for discovery from Prisma
      // Uses sovereign Product.districtId for direct district isolation
      const discoveryProducts = await prisma.product.findMany({
        where: {
          districtId,
          approved: true,
          status: { in: ["approved", "APPROVED", "active", "ACTIVE"] },
          vendor: {
            status: "APPROVED",
            isShadowBanned: false,
            businessType: { notIn: ["SERVICE", "HEALTHCARE", "SCHOOL", "EDUCATION"] },
            category: { notIn: ["SERVICE", "HEALTHCARE", "HOSPITAL", "SCHOOL", "EDUCATION", "DOCTOR", "CLINIC", "service", "healthcare", "hospital", "school", "education", "doctor", "clinic"] }
          }
        },
        include: {
          vendor: true,
          images: true
        }
      });

      products = await Promise.all(discoveryProducts.map((product) => mapProductToDTO(product, (product as any).vendor)));
      metaSource = "PSR_DISCOVERY_ENGINE";
    }

    return success(res, products, { source: metaSource });
  } catch (e) {
    console.error("Marketplace products fetch error:", e);
    return failure(res, "SERVER_ERROR", "Failed to fetch marketplace products", 500);
  }
});

// --- FETCH SINGLE PRODUCT BY SLUG (Public - Only Approved) ---
router.get("/products/slug/:slug", async (req: Request, res: Response) => {
  try {
    const setNoStore = (res: Response) => res.setHeader("Cache-Control", "no-store, max-age=0");
    setNoStore(res);

    const slug = req.params.slug;
    const districtId = req.ctx?.districtId;

    if (!districtId) {
      return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "District not resolved" } });
    }

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid product slug" } });
    }

    const product = await findProductBySlug(slug, districtId);

    if (!product) {
      return failure(res, "NOT_FOUND", "Product not found", 404);
    }

    const dto = await mapProductToDTO(product, (product as any).vendor);
    return success(res, dto, { source: "PSR_PRODUCT_DETAIL_ENGINE" });
  } catch (e) {
    console.error("Fetch product by slug failed", e);
    return failure(res, "SERVER_ERROR", "Failed to fetch product", 500);
  }
});

// --- FETCH SINGLE PRODUCT BY ID OR SLUG (SOVEREIGN CANONICAL RESOLVER) ---
router.get("/products/:entityKey", async (req: Request, res: Response) => {
  try {
    const setNoStore = (res: Response) => res.setHeader("Cache-Control", "no-store, max-age=0");
    setNoStore(res);

    const entityKey = req.params.entityKey;
    const districtId = req.ctx?.districtId;
    const requestId = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (!districtId) {
      return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "District not resolved" } });
    }

    if (!entityKey) {
      return res.status(400).json({ success: false, error: { code: "BAD_REQUEST", message: "Invalid product identifier" } });
    }

    const result = await resolveProductByEntityKey(entityKey, districtId, requestId);

    if (!result.success) {
      const fail = result.failure!;
      return res.status(404).json({
        success: false,
        error: "Product not found",
        _diagnostics: {
          reason: fail.reason,
          message: fail.message,
          productIdentifier: entityKey,
          districtId,
          requestId,
        }
      });
    }

    const dto = await mapProductToDTO(result.data, result.data.vendor);
    return success(res, dto, { source: "PSR_CANONICAL_RESOLVER" });
  } catch (e) {
    console.error("Fetch product failed", e);
    return failure(res, "SERVER_ERROR", "Failed to fetch product", 500);
  }
});

// -----------------------------------------------
// 🛍️ MERCHANT ROUTES (SOVEREIGN OWNERSHIP)
// -----------------------------------------------

// --- MERCHANT: GET All Products ---
router.get("/merchant/products", requireAuth, requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = req.ctx?.userId!;
    const vendor = await resolveMerchantVendorOrThrow(merchantId, req.ctx?.districtId ?? undefined);

    const merchantProducts = await findMerchantProductsByVendor(vendor.id);

    const productsWithImages = merchantProducts.map((product: any) => ({
      ...product,
      images: product.images?.map((img: any) => img.url) || [],
      imageUrl: product.imageUrl || (product.images?.[0]?.url || null),
    }));

    return success(res, productsWithImages);
  } catch (e: any) {
    if (e?.message === "MERCHANT_VENDOR_NOT_LINKED") {
      return failure(res, "BAD_REQUEST", "Vendor profile not linked to this merchant account.", 400);
    }

    console.error("Failed to fetch merchant products", e?.message);
    return failure(res, "SERVER_ERROR", "Failed to fetch products", 500);
  }
});

// --- MERCHANT: CREATE Product ---
router.post("/merchant/products", requireAuth, requireMerchant, async (req: Request, res: Response) => {
  try {
    console.log("🛡️ [MERCHANT PRODUCT RAW BODY]", req.body);

    const merchantId = req.ctx?.userId!;
    const vendor = await resolveMerchantVendorOrThrow(merchantId, req.ctx?.districtId ?? undefined);

    // 🛡️ BHARATOS NON-RETAIL PRODUCT CREATION GUARD
    const nonRetailBusinessTypes = ["SERVICE", "HEALTHCARE", "SCHOOL", "EDUCATION"];
    const nonRetailCategories = ["SERVICE", "HEALTHCARE", "HOSPITAL", "SCHOOL", "EDUCATION", "DOCTOR", "CLINIC"];

    const bType = (vendor.businessType || "").toString().toUpperCase().trim();
    const cat = (vendor.category || "").toString().toUpperCase().trim();

    if (nonRetailBusinessTypes.includes(bType) || nonRetailCategories.includes(cat)) {
      console.warn(`⛔ [PRODUCT_CREATION_BLOCKED] Vendor #${vendor.id} (${vendor.name}) with businessType='${vendor.businessType}' category='${vendor.category}' attempted to create a retail product.`);
      return failure(
        res,
        "SERVICE_VENDOR_CANNOT_CREATE_RETAIL_PRODUCT",
        "Service, healthcare, and educational institutions cannot create retail products. Please manage your offerings through your service dashboard.",
        403
      );
    }

    const {
      title,
      name,
      description,
      categoryId,
      category,
      price,
      mrp,
      stock,
      isTrending = false,
      virtualTryOn = false,
      imageUrl,
      images,
      imageUrls
    } = req.body;

    // M-15A: Normalize frontend-friendly payload aliases
    const normalizedTitle = String(title || name || "").trim();
    const normalizedPrice = Number(price || 0);

    // M-15B: Auto category resolver - string → categoryId
    let normalizedCategoryId = categoryId;
    if (!normalizedCategoryId && category) {
      const cleanCategory = String(category || "").trim();

      let matchedCategory = await prisma.category.findFirst({
        where: {
          name: { equals: cleanCategory, mode: "insensitive" }
        }
      });

      // 🛡️ M-22B Dynamic merchant category seed
      if (!matchedCategory && cleanCategory) {
        matchedCategory = await prisma.category.create({
          data: {
            name: cleanCategory,
            slug: cleanCategory.toLowerCase().replace(/\s+/g, "-"),
            isActive: true
          }
        });

        console.log("✅ [DYNAMIC CATEGORY CREATED]", matchedCategory.name, matchedCategory.id);
      }

      normalizedCategoryId = matchedCategory?.id;
    }

    if (!normalizedTitle || !normalizedCategoryId) {
      return failure(res, "BAD_REQUEST", "Missing required fields", 400, {
        details: !normalizedTitle ? "title/name is required" : !normalizedCategoryId ? "categoryId or category is required" : null
      });
    }

    const product = await createMerchantProduct({
      vendorId: vendor.id,
      title: normalizedTitle,
      description,
      categoryId: normalizedCategoryId,
      price: normalizedPrice,
      mrp,
      stock: stock !== undefined ? stock : 100,
      isTrending,
      virtualTryOn,
      districtId: vendor.districtId
    });

    // M-15C: Auto image attach after product create - single modal workflow (supports single or multi-image)
    const attachedImages: string[] = Array.isArray(images)
      ? images
      : Array.isArray(imageUrls)
        ? imageUrls
        : imageUrl
          ? [imageUrl]
          : [];

    for (const imgUrl of attachedImages.slice(0, 4)) {
      if (typeof imgUrl === "string" && imgUrl.trim()) {
        await createMerchantProductImage(product.id, imgUrl.trim());
      }
    }

    res.status(201);
    return success(res, product);
  } catch (e: any) {
    if (e?.message === "MERCHANT_VENDOR_NOT_LINKED") {
      return failure(res, "BAD_REQUEST", "Vendor profile not linked to this merchant account.", 400);
    }

    console.error("Create product failed", e?.message);
    return failure(res, "SERVER_ERROR", "Failed to create product", 500);
  }
});

// --- MERCHANT: UPLOAD Product Images ---
router.post("/merchant/products/:id/images", requireAuth, requireMerchant, upload.array("images", 5), async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const merchantId = req.ctx?.userId!;
    const vendor = await resolveMerchantVendorOrThrow(merchantId, req.ctx?.districtId ?? undefined);

    if (!Number.isInteger(productId)) {
      return failure(res, "BAD_REQUEST", "Invalid product id", 400);
    }

    const existing = await findMerchantProductById(productId, vendor.id);
    if (!existing) {
      return failure(res, "NOT_FOUND", "Product not found", 404);
    }

    const files = req.files as Express.Multer.File[];
    const uploadedImages = await Promise.all(
      files.map((file) => createMerchantProductImage(productId, file.path))
    );

    res.status(201);
    return success(res, uploadedImages);
  } catch (e: any) {
    if (e?.message === "MERCHANT_VENDOR_NOT_LINKED") {
      return failure(res, "BAD_REQUEST", "Vendor profile not linked to this merchant account.", 400);
    }

    console.error("Image upload failed", e?.message);
    return failure(res, "SERVER_ERROR", "Failed to upload images", 500);
  }
});

// --- MERCHANT: DELETE Product Image ---
router.delete("/merchant/products/:productId/images/:imageId", requireAuth, requireMerchant, async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.productId);
    const imageId = Number(req.params.imageId);
    const merchantId = req.ctx?.userId!;
    const vendor = await resolveMerchantVendorOrThrow(merchantId, req.ctx?.districtId ?? undefined);

    const existing = await findMerchantProductById(productId, vendor.id);
    if (!existing) {
      return failure(res, "NOT_FOUND", "Product not found", 404);
    }

    await deleteMerchantProductImage(imageId, productId);
    return success(res, { message: "Image deleted" });
  } catch (e: any) {
    if (e?.message === "MERCHANT_VENDOR_NOT_LINKED") {
      return failure(res, "BAD_REQUEST", "Vendor profile not linked to this merchant account.", 400);
    }

    console.error("Image deletion failed", e?.message);
    return failure(res, "SERVER_ERROR", "Failed to delete image", 500);
  }
});

// --- MERCHANT: UPDATE Product ---
router.put("/merchant/products/:id", requireAuth, requireMerchant, async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    if (!Number.isInteger(productId) || productId <= 0) {
      return failure(res, "BAD_REQUEST", "Invalid product id", 400);
    }

    const merchantId = req.ctx?.userId!;
    const vendor = await resolveMerchantVendorOrThrow(merchantId, req.ctx?.districtId ?? undefined);

    const existing = await findMerchantProductById(productId, vendor.id);
    if (!existing) {
      return failure(res, "NOT_FOUND", "Product not found", 404);
    }

    const rawBody = req.body;
    if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
      return failure(res, "BAD_REQUEST", "Invalid request body", 400);
    }

    // 🛡️ STRICT SERVER-SIDE ALLOWLIST: Only legitimate merchant fields may reach Prisma
    const updates: Record<string, any> = {};

    // 1. title / name: string, trim, non-empty, max 200 chars
    const rawTitle = rawBody.title !== undefined ? rawBody.title : rawBody.name;
    if (rawTitle !== undefined) {
      if (typeof rawTitle !== "string" || !rawTitle.trim() || rawTitle.trim().length > 200) {
        return failure(res, "BAD_REQUEST", "Title must be a non-empty string up to 200 characters", 400);
      }
      updates.title = rawTitle.trim();
    }

    // 2. description: string or null, trimmed
    if (rawBody.description !== undefined) {
      if (rawBody.description === null) {
        updates.description = null;
      } else if (typeof rawBody.description === "string") {
        updates.description = rawBody.description.trim();
      } else {
        return failure(res, "BAD_REQUEST", "Description must be a string or null", 400);
      }
    }

    // 3. price: number >= 0
    if (rawBody.price !== undefined) {
      if (typeof rawBody.price !== "number" || !Number.isFinite(rawBody.price) || rawBody.price < 0) {
        return failure(res, "BAD_REQUEST", "Price must be a valid non-negative number", 400);
      }
      updates.price = rawBody.price;
    }

    // 4. mrp: number >= 0 or null
    if (rawBody.mrp !== undefined) {
      if (rawBody.mrp === null) {
        updates.mrp = null;
      } else if (typeof rawBody.mrp === "number" && Number.isFinite(rawBody.mrp) && rawBody.mrp >= 0) {
        updates.mrp = rawBody.mrp;
      } else {
        return failure(res, "BAD_REQUEST", "MRP must be a valid non-negative number or null", 400);
      }
    }

    // 5. stock: integer >= 0
    if (rawBody.stock !== undefined) {
      if (typeof rawBody.stock !== "number" || !Number.isFinite(rawBody.stock) || !Number.isInteger(rawBody.stock) || rawBody.stock < 0) {
        return failure(res, "BAD_REQUEST", "Stock must be a non-negative integer", 400);
      }
      updates.stock = rawBody.stock;
    }

    // 6. imageUrl: string URL or null
    if (rawBody.imageUrl !== undefined) {
      if (rawBody.imageUrl === null) {
        updates.imageUrl = null;
      } else if (typeof rawBody.imageUrl === "string") {
        updates.imageUrl = rawBody.imageUrl.trim();
      } else {
        return failure(res, "BAD_REQUEST", "Image URL must be a string or null", 400);
      }
    }

    // 7. virtualTryOn: boolean
    if (rawBody.virtualTryOn !== undefined) {
      if (typeof rawBody.virtualTryOn !== "boolean") {
        return failure(res, "BAD_REQUEST", "virtualTryOn must be a boolean", 400);
      }
      updates.virtualTryOn = rawBody.virtualTryOn;
    }

    // 8. categoryId / category: preserve existing category behavior from POST route
    if (rawBody.categoryId !== undefined) {
      if (typeof rawBody.categoryId !== "number" || !Number.isFinite(rawBody.categoryId) || !Number.isInteger(rawBody.categoryId) || rawBody.categoryId <= 0) {
        return failure(res, "BAD_REQUEST", "Invalid categoryId", 400);
      }
      updates.categoryId = rawBody.categoryId;
    } else if (rawBody.category !== undefined) {
      if (typeof rawBody.category === "string" && rawBody.category.trim()) {
        const cleanCategory = rawBody.category.trim();
        let matchedCategory = await prisma.category.findFirst({
          where: {
            name: { equals: cleanCategory, mode: "insensitive" }
          }
        });

        // Dynamic merchant category seed (matches POST /merchant/products M-22B)
        if (!matchedCategory) {
          matchedCategory = await prisma.category.create({
            data: {
              name: cleanCategory,
              slug: cleanCategory.toLowerCase().replace(/\s+/g, "-"),
              isActive: true
            }
          });
          console.log("✅ [DYNAMIC CATEGORY CREATED]", matchedCategory.name, matchedCategory.id);
        }

        updates.categoryId = matchedCategory.id;
        updates.categoryName = matchedCategory.name;
      }
    }

    // If request contains only protected or empty fields, reject with 400
    if (Object.keys(updates).length === 0) {
      return failure(res, "BAD_REQUEST", "No valid editable product fields provided", 400);
    }

    const updated = await updateMerchantProduct(productId, vendor.id, updates);
    return success(res, updated);
  } catch (e: any) {
    if (e?.message === "MERCHANT_VENDOR_NOT_LINKED") {
      return failure(res, "BAD_REQUEST", "Vendor profile not linked to this merchant account.", 400);
    }

    console.error("Product update failed", e?.message);
    return failure(res, "SERVER_ERROR", "Failed to update product", 500);
  }
});

// --- MERCHANT: DELETE Product ---
router.delete("/merchant/products/:id", requireAuth, requireMerchant, async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const merchantId = req.ctx?.userId!;
    const vendor = await resolveMerchantVendorOrThrow(merchantId, req.ctx?.districtId ?? undefined);

    const existing = await findMerchantProductById(productId, vendor.id);
    if (!existing) {
      return failure(res, "NOT_FOUND", "Product not found", 404);
    }

    await deleteMerchantProduct(productId, vendor.id);
    return success(res, { message: "Product deleted" });
  } catch (e: any) {
    if (e?.message === "MERCHANT_VENDOR_NOT_LINKED") {
      return failure(res, "BAD_REQUEST", "Vendor profile not linked to this merchant account.", 400);
    }

    console.error("Product deletion failed", e?.message);
    return failure(res, "SERVER_ERROR", "Failed to delete product", 500);
  }
});

// --- MERCHANT: GET All Product Images ---
router.get("/merchant/products/:id/images", requireAuth, requireMerchant, async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const merchantId = req.ctx?.userId!;
    const vendor = await resolveMerchantVendorOrThrow(merchantId, req.ctx?.districtId ?? undefined);

    const existing = await findMerchantProductById(productId, vendor.id);
    if (!existing) {
      return failure(res, "NOT_FOUND", "Product not found", 404);
    }

    const images = await getMerchantProductImages(productId);
    return success(res, images);
  } catch (e: any) {
    if (e?.message === "MERCHANT_VENDOR_NOT_LINKED") {
      return failure(res, "BAD_REQUEST", "Vendor profile not linked to this merchant account.", 400);
    }

    console.error("Fetch images failed", e?.message);
    return failure(res, "SERVER_ERROR", "Failed to fetch images", 500);
  }
});

export default router;