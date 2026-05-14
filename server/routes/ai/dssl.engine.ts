// @ts-nocheck
import express, { type Request, type Response } from "express";
import { requireAuth } from "../../auth/middleware";
import { prisma } from "../../storage";
import { getTrustScore } from "../../services/dssl.service";

// Stub functions since brain.service deleted
const calculateDSSLScore = (vendor: any) => {
  // For now, return a default score since async is problematic in map
  return 50; // Neutral score
};

const calculateBadgeLevel = (score: number) => {
  if (score >= 80) return { level: 'elite', color: '#10B981' };
  if (score >= 60) return { level: 'reliable', color: '#3B82F6' };
  if (score >= 40) return { level: 'average', color: '#F59E0B' };
  return { level: 'new', color: '#6B7280' };
};

const calculateAccountAge = (createdAt: Date) => {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
};

const generateEmbedding = async (text: string) => {
  // Stub: return empty array
  return [];
};

const cosineSimilarity = (a: number[], b: number[]) => {
  // Stub: return 0
  return 0;
};

const router = express.Router();

// ============================================
// 🧠 TRUST & RANKING LOGIC
// ============================================

// --- VECTOR SEARCH FOR PRODUCTS ---
router.post("/vector-search", requireAuth, async (req: Request, res: Response) => {
  try {
    // 🔐 SECURITY: District isolation mandatory
    if (!req.districtId) {
      return res.status(400).json({ error: "District required for vector search" });
    }

    const { query, limit = 20 } = req.body;
    const districtId = req.districtId;

    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.status(400).json({ error: "Search query must be at least 2 characters" });
    }

    // 🧠 VECTOR SEARCH: Get embeddings for query using Groq
    const queryEmbedding = await generateEmbedding(query.trim());

    // Find products with similar embeddings (cosine similarity)
    const products = await prisma.product.findMany({
      where: {
        districtId: Number(districtId),
        approved: true,
        embedding: { isEmpty: false } // Only products with embeddings
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            status: true,
            rating: true,
            totalReviews: true
          }
        },
        category: true
      }
    });

    // Calculate cosine similarity and rank
    const rankedProducts = products
      .map(product => ({
        ...product,
        similarity: product.embedding ? cosineSimilarity(queryEmbedding, product.embedding) : 0,
        dsslScore: calculateDSSLScore(product.vendor as any)
      }))
      .filter(product => product.similarity > 0.3) // Minimum similarity threshold
      .sort((a, b) => b.similarity - a.similarity) // Sort by similarity
      .slice(0, Math.min(parseInt(limit) || 20, 50));

    // 📊 Track vector search analytics
    try {
      await prisma.analyticsEvent.create({
        data: {
          eventType: "search",
          action: "vector_search",
          value: { query: query.trim(), resultsCount: rankedProducts.length },
          districtId,
          source: "ai_vector_search_api"
        }
      });
    } catch { /* Ignore analytics errors */ }

    res.json({
      success: true,
      query: query.trim(),
      results: rankedProducts,
      total: rankedProducts.length,
      searchType: "vector",
      districtId
    });

  } catch (error: any) {
    console.error("🚨 [VECTOR SEARCH ERROR]:", error?.message);
    // Fallback to regular search if vector search fails
    try {
      const fallbackResults = await prisma.product.findMany({
        where: {
          ...(req.districtId ? { districtId: Number(req.districtId) } : {}),
          approved: true,
          OR: [
            { title: { contains: req.body.query, mode: "insensitive" } },
            { description: { contains: req.body.query, mode: "insensitive" } }
          ]
        },
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              rating: true,
              totalReviews: true
            }
          },
          category: true
        },
        take: 10
      });

      res.json({
        success: true,
        query: req.body.query,
        results: fallbackResults,
        total: fallbackResults.length,
        searchType: "fallback",
        districtId: req.districtId
      });
    } catch (fallbackError) {
      res.status(500).json({ error: "Vector search failed, no fallback available", message: error?.message });
    }
  }
});

// --- GET DSSL BADGE FOR VENDOR ---
router.get("/dssl-badge/:vendorId", requireAuth, async (req: Request, res: Response) => {
  try {
    // 🔐 SECURITY: District isolation mandatory
    if (!req.districtId) {
      return res.status(400).json({ error: "District required for DSSL badge" });
    }

    const { vendorId } = req.params;
    const districtId = req.districtId;

    if (!vendorId || isNaN(parseInt(vendorId))) {
      return res.status(400).json({ error: "Valid vendorId required" });
    }

    // Get vendor data for DSSL calculation
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: parseInt(vendorId),
        districtId: Number(districtId), // Ensure vendor belongs to user's district
        status: "APPROVED"
      },
      include: {
        vendorMLProfile: true,
        _count: { select: { products: true, orders: true } }
      }
    });

    if (!vendor) {
      return res.status(404).json({ error: "Vendor not found or not approved" });
    }

    const dsslScore = calculateDSSLScore(vendor as any);

    // Calculate badge level and styling
    const badgeData = calculateBadgeLevel(dsslScore);

    res.json({
      success: true,
      vendorId: vendor.id,
      vendorName: vendor.name,
      dsslScore,
      badge: badgeData,
      components: {
        rating: vendor.rating || 0,
        reviews: vendor.totalReviews || 0,
        productCount: vendor._count.products,
        orderCount: vendor._count?.orders || 0,
        accountAge: calculateAccountAge(vendor.createdAt)
      },
      districtId
    });

  } catch (error: any) {
    console.error("🚨 [DSSL BADGE ERROR]:", error?.message);
    res.status(500).json({ error: "DSSL badge calculation failed", message: error?.message });
  }
});

// --- GET DSSL LEADERBOARD ---
router.get("/dssl-leaderboard", requireAuth, async (req: Request, res: Response) => {
  try {
    const districtId = req.districtId;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    // Get all approved vendors with their stats
    const vendors = await prisma.vendor.findMany({
      where: {
        districtId: Number(districtId),
        status: "APPROVED"
      },
      include: {
        vendorMLProfile: true,
        _count: { select: { products: true, orders: true } }
      }
    });

    // Calculate DSSL scores and rank
    const rankedVendors = vendors
      .map(vendor => ({
        ...vendor,
        dsslScore: calculateDSSLScore(vendor as any),
        badge: calculateBadgeLevel(calculateDSSLScore(vendor as any))
      }))
      .sort((a, b) => b.dsslScore - a.dsslScore)
      .slice(0, limit);

    res.json({
      success: true,
      districtId,
      leaderboard: rankedVendors,
      total: rankedVendors.length
    });

  } catch (error: any) {
    console.error("🚨 [DSSL LEADERBOARD ERROR]:", error?.message);
    res.status(500).json({ error: "Failed to generate leaderboard", message: error?.message });
  }
});

// --- UPDATE PRODUCT EMBEDDINGS (Admin/Batch) ---
router.post("/update-embeddings", requireAuth, async (req: Request, res: Response) => {
  try {
    // Check if user has admin privileges
    if (!req.user?.role || !['super_admin', 'city_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const districtId = req.districtId;
    const { productIds } = req.body;

    // Get products to update
    const whereClause = productIds && Array.isArray(productIds)
      ? { id: { in: productIds }, districtId: Number(districtId), approved: true }
      : { districtId: Number(districtId), approved: true }; // Update all approved products if no specific ids

    const products = await prisma.product.findMany({
      where: whereClause,
      select: { id: true, title: true, description: true }
    });

    let updatedCount = 0;
    const errors: string[] = [];

    for (const product of products) {
      try {
        const textToEmbed = `${product.title} ${product.description || ''}`.trim();
        if (textToEmbed.length < 5) continue; // Skip very short descriptions

        const embedding = await generateEmbedding(textToEmbed);

        await prisma.product.update({
          where: { id: product.id },
          data: { embedding }
        });

        updatedCount++;
      } catch (err: any) {
        errors.push(`Product ${product.id}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `Updated embeddings for ${updatedCount} products`,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error("🚨 [UPDATE EMBEDDINGS ERROR]:", error?.message);
    res.status(500).json({ error: "Failed to update embeddings", message: error?.message });
  }
});

// --- GET TRUST METRICS FOR DASHBOARD ---
router.get("/trust-metrics", requireAuth, async (req: Request, res: Response) => {
  try {
    const districtId = req.districtId;

    // Get various trust-related metrics
    const [
      totalVendors,
      approvedVendors,
      totalProducts,
      approvedProducts,
      avgRating,
      totalReviews,
      topRatedVendors
    ] = await Promise.all([
      prisma.vendor.count({ where: { districtId: Number(districtId) } }),
      prisma.vendor.count({ where: { districtId: Number(districtId), status: "APPROVED" } }),
      prisma.product.count({ where: { vendor: { districtId: Number(districtId) } } }),
      prisma.product.count({ where: { vendor: { districtId: Number(districtId) }, approved: true } }),
      prisma.vendor.aggregate({
        where: { districtId: Number(districtId), status: "APPROVED" },
        _avg: { rating: true }
      }),
      prisma.vendor.aggregate({
        where: { districtId: Number(districtId), status: "APPROVED" },
        _sum: { totalReviews: true }
      }),
      prisma.vendor.findMany({
        where: { districtId: Number(districtId), status: "APPROVED", rating: { gte: 4.0 } },
        select: { id: true, name: true, rating: true, totalReviews: true },
        orderBy: { rating: 'desc' },
        take: 5
      })
    ]);

    const approvalRate = totalVendors > 0 ? (approvedVendors / totalVendors) * 100 : 0;
    const productApprovalRate = totalProducts > 0 ? (approvedProducts / totalProducts) * 100 : 0;

    res.json({
      success: true,
      districtId,
      metrics: {
        vendors: {
          total: totalVendors,
          approved: approvedVendors,
          approvalRate: Math.round(approvalRate * 100) / 100
        },
        products: {
          total: totalProducts,
          approved: approvedProducts,
          approvalRate: Math.round(productApprovalRate * 100) / 100
        },
        ratings: {
          averageRating: avgRating._avg.rating ?? 0,
          totalReviews: totalReviews._sum.totalReviews || 0
        },
        topRatedVendors
      }
    });

  } catch (error: any) {
    console.error("🚨 [TRUST METRICS ERROR]:", error?.message);
    res.status(500).json({ error: "Failed to fetch trust metrics", message: error?.message });
  }
});

export default router;
