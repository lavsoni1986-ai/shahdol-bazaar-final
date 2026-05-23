import express, { type Request, type Response } from "express";
import { requireAuth, requireMerchant } from "../../auth/middleware";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import { ErrorCode, sendCreated, sendError, sendSuccess } from "../../middleware/errorHandler";
import { FEATURES } from "../../config/featureFlags";
import {
  findActiveProductsByDistrict,
  findProductBySlug,
  countProductsByVendor,
  findProductById,
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
import { getDiscoveryByType } from "../../services/discovery.service";

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

    if (!districtId) {
      return res.status(400).json({ message: "District not resolved" });
    }

    const products = await getDiscoveryByType(districtId, "PRODUCT");

    const productList = products.map((product: any) => ({
      id: product.sourceId,
      name: product.title || "Untitled",
      title: product.title,
      slug: product.slug,
      price: product.meta?.price?.toString() || "0",
      mrp: product.meta?.mrp?.toString() || null,
      imageUrl: product.image || null,
      category: product.subtitle || null,
      shopName: product.meta?.vendorName || null,
      stock: product.meta?.stock || 0,
      isTrending: (product.rankScore || 0) > 85,
      vendorScore: product.dsslScore || 0,
      sovereignRanked: true
    }));

    return res.json({
      data: productList,
      count: productList.length,
      meta: {
        source: "PSR_DISCOVERY_ENGINE"
      }
    });
  } catch (e) {
    console.error("Marketplace products fetch error:", e);
    return res.status(500).json({ message: "Failed to fetch products" });
  }
});

// --- FETCH SINGLE PRODUCT (Public - Only Approved) ---
router.get("/products/:id", async (req: Request, res: Response) => {
  try {
    const setNoStore = (res: Response) => res.setHeader("Cache-Control", "no-store, max-age=0");
    setNoStore(res);

    const id = Number(req.params.id);
    const districtId = req.ctx?.districtId;

    if (!districtId) {
      return res.status(400).json({ message: "District not resolved" });
    }

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const product = await prisma.product.findFirst({
      where: {
        id,
        districtId,
        approved: true,
        status: "approved",
        vendor: {
          status: "APPROVED" as any,
          isShadowBanned: false
        }
      },
      include: {
        vendor: true
      }
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json({
      ...product,
      meta: {
        source: "PSR_PRODUCT_DETAIL_ENGINE"
      }
    });
  } catch (e) {
    console.error("Fetch product failed", e);
    return res.status(500).json({ message: "Failed to fetch product" });
  }
});

// -----------------------------------------------
// 🛍️ MERCHANT ROUTES (SOVEREIGN OWNERSHIP)
// -----------------------------------------------

// --- MERCHANT: GET All Products ---
router.get("/merchant/products", requireAuth, requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = req.ctx?.userId!;
    const vendor = await resolveMerchantVendorOrThrow(merchantId, req.ctx?.districtId);

    const merchantProducts = await findMerchantProductsByVendor(vendor.id);

    const productsWithImages = merchantProducts.map((product: any) => ({
      ...product,
      images: product.images?.map((img: any) => img.url) || [],
      imageUrl: product.imageUrl || (product.images?.[0]?.url || null),
    }));

    return res.json({ data: productsWithImages });
  } catch (e: any) {
    if (e?.message === "MERCHANT_VENDOR_NOT_LINKED") {
      return res.status(400).json({
        message: "Vendor profile not linked to this merchant account."
      });
    }

    console.error("Failed to fetch merchant products", e?.message);
    return res.status(500).json({ message: "Failed to fetch products" });
  }
});

// --- MERCHANT: CREATE Product ---
router.post("/merchant/products", requireAuth, requireMerchant, async (req: Request, res: Response) => {
  try {
    const merchantId = req.ctx?.userId!;
    const vendor = await resolveMerchantVendorOrThrow(merchantId, req.ctx?.districtId);

    const {
      title,
      description,
      categoryId,
      price,
      mrp,
      stock,
      isTrending = false,
      virtualTryOn = false
    } = req.body;

    if (!title || !categoryId || !price) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const districtId = req.ctx?.districtId;
    if (!districtId) {
      return res.status(400).json({ message: "District not resolved" });
    }

    const product = await createMerchantProduct({
      vendorId: vendor.id,
      districtId,
      title,
      description,
      categoryId,
      price,
      mrp,
      stock: stock || 0,
      isTrending,
      virtualTryOn
    });

    return res.status(201).json({ data: product });
  } catch (e: any) {
    if (e?.message === "MERCHANT_VENDOR_NOT_LINKED") {
      return res.status(400).json({
        message: "Vendor profile not linked to this merchant account."
      });
    }

    console.error("Create product failed", e?.message);
    return res.status(500).json({ message: "Failed to create product" });
  }
});

// --- MERCHANT: UPLOAD Product Images ---
router.post("/merchant/products/:id/images", requireAuth, requireMerchant, upload.array("images", 5), async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const merchantId = req.ctx?.userId!;
    const vendor = await resolveMerchantVendorOrThrow(merchantId, req.ctx?.districtId);

    if (!Number.isInteger(productId)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const existing = await findMerchantProductById(productId, vendor.id);
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    const files = req.files as Express.Multer.File[];
    const uploadedImages = await Promise.all(
      files.map((file) => createMerchantProductImage(productId, file.path))
    );

    return res.status(201).json({ data: uploadedImages });
  } catch (e: any) {
    if (e?.message === "MERCHANT_VENDOR_NOT_LINKED") {
      return res.status(400).json({
        message: "Vendor profile not linked to this merchant account."
      });
    }

    console.error("Image upload failed", e?.message);
    return res.status(500).json({ message: "Failed to upload images" });
  }
});

// --- MERCHANT: DELETE Product Image ---
router.delete("/merchant/products/:productId/images/:imageId", requireAuth, requireMerchant, async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.productId);
    const imageId = Number(req.params.imageId);
    const merchantId = req.ctx?.userId!;
    const vendor = await resolveMerchantVendorOrThrow(merchantId, req.ctx?.districtId);

    const existing = await findMerchantProductById(productId, vendor.id);
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    await deleteMerchantProductImage(imageId, productId);
    return res.json({ message: "Image deleted" });
  } catch (e: any) {
    if (e?.message === "MERCHANT_VENDOR_NOT_LINKED") {
      return res.status(400).json({
        message: "Vendor profile not linked to this merchant account."
      });
    }

    console.error("Image deletion failed", e?.message);
    return res.status(500).json({ message: "Failed to delete image" });
  }
});

// --- MERCHANT: UPDATE Product ---
router.put("/merchant/products/:id", requireAuth, requireMerchant, async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const merchantId = req.ctx?.userId!;
    const vendor = await resolveMerchantVendorOrThrow(merchantId, req.ctx?.districtId);
    const updates = req.body;

    const existing = await findMerchantProductById(productId, vendor.id);
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    const updated = await updateMerchantProduct(productId, vendor.id, updates);
    return res.json({ data: updated });
  } catch (e: any) {
    if (e?.message === "MERCHANT_VENDOR_NOT_LINKED") {
      return res.status(400).json({
        message: "Vendor profile not linked to this merchant account."
      });
    }

    console.error("Product update failed", e?.message);
    return res.status(500).json({ message: "Failed to update product" });
  }
});

// --- MERCHANT: DELETE Product ---
router.delete("/merchant/products/:id", requireAuth, requireMerchant, async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const merchantId = req.ctx?.userId!;
    const vendor = await resolveMerchantVendorOrThrow(merchantId, req.ctx?.districtId);

    const existing = await findMerchantProductById(productId, vendor.id);
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    await deleteMerchantProduct(productId, vendor.id);
    return res.json({ message: "Product deleted" });
  } catch (e: any) {
    if (e?.message === "MERCHANT_VENDOR_NOT_LINKED") {
      return res.status(400).json({
        message: "Vendor profile not linked to this merchant account."
      });
    }

    console.error("Product deletion failed", e?.message);
    return res.status(500).json({ message: "Failed to delete product" });
  }
});

// --- MERCHANT: GET All Product Images ---
router.get("/merchant/products/:id/images", requireAuth, requireMerchant, async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.id);
    const merchantId = req.ctx?.userId!;
    const vendor = await resolveMerchantVendorOrThrow(merchantId, req.ctx?.districtId);

    const existing = await findMerchantProductById(productId, vendor.id);
    if (!existing) {
      return res.status(404).json({ message: "Product not found" });
    }

    const images = await getMerchantProductImages(productId);
    return res.json({ data: images });
  } catch (e: any) {
    if (e?.message === "MERCHANT_VENDOR_NOT_LINKED") {
      return res.status(400).json({
        message: "Vendor profile not linked to this merchant account."
      });
    }

    console.error("Fetch images failed", e?.message);
    return res.status(500).json({ message: "Failed to fetch images" });
  }
});

export default router;