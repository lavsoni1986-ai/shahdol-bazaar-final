/**
 * DYNAMIC RANKING ADMIN ROUTES
 * Administrative endpoints for dynamic discovery ranking system
 */

import express from "express";
import { requireAuth, requireSuperAdmin } from "../../auth/middleware";
import { success, error } from "../../utils/response";
import { dynamicDiscoveryRanking } from "../../services/dynamic-discovery-ranking.service";

const router = express.Router();

// Apply auth middleware
router.use(requireAuth);
router.use(requireSuperAdmin);

/**
 * GET /api/admin/dynamic-ranking/status
 * Get current ranking system status and weights
 */
router.get("/status", async (req, res) => {
  try {
    const weights = dynamicDiscoveryRanking.getCurrentWeights();

    return res.json(success({
      system: "Dynamic Discovery Ranking Engine",
      status: "active",
      weights,
      description: "Multi-dimensional ranking incorporating trust, demand, memory, engagement, locality, and freshness signals"
    }));
  } catch (err: any) {
    console.error("Ranking status error:", err.message);
    return res.status(500).json(error("Failed to fetch ranking status"));
  }
});

/**
 * GET /api/admin/dynamic-ranking/weights
 * Get current ranking weights
 */
router.get("/weights", async (req, res) => {
  try {
    const weights = dynamicDiscoveryRanking.getCurrentWeights();

    return res.json(success({
      weights,
      total: Object.values(weights).reduce((sum, w) => sum + w, 0),
      components: {
        trust: "Vendor reliability, ratings, verification",
        demand: "District demand patterns, supply gaps",
        memory: "Historical performance, trending",
        engagement: "User interactions, conversions",
        locality: "Location relevance, distance",
        freshness: "Recency of updates, activity"
      }
    }));
  } catch (err: any) {
    console.error("Ranking weights error:", err.message);
    return res.status(500).json(error("Failed to fetch ranking weights"));
  }
});

/**
 * PUT /api/admin/dynamic-ranking/weights
 * Update ranking weights (admin only, with validation)
 */
router.put("/weights", async (req, res) => {
  try {
    const { weights } = req.body;

    if (!weights || typeof weights !== 'object') {
      return res.status(400).json(error("Weights object required"));
    }

    // Validate weights
    const requiredComponents = ['trust', 'demand', 'memory', 'engagement', 'locality', 'freshness'];
    for (const component of requiredComponents) {
      if (!(component in weights)) {
        return res.status(400).json(error(`Missing weight for ${component}`));
      }
      if (typeof weights[component] !== 'number' || weights[component] < 0 || weights[component] > 1) {
        return res.status(400).json(error(`Invalid weight for ${component}: must be 0-1`));
      }
    }

    // Check sum
    const total = Object.values(weights).reduce((sum: number, w: number) => sum + w, 0);
    if (Math.abs(total - 1.0) > 0.01) {
      return res.status(400).json(error(`Weights must sum to 1.0, got ${total}`));
    }

    await dynamicDiscoveryRanking.updateWeights(weights);

    return res.json(success({
      message: "Ranking weights updated successfully",
      newWeights: weights,
      timestamp: new Date().toISOString()
    }));
  } catch (err: any) {
    console.error("Ranking weights update error:", err.message);
    return res.status(500).json(error("Failed to update ranking weights"));
  }
});

/**
 * POST /api/admin/dynamic-ranking/optimize
 * Trigger ranking optimization for a district
 */
router.post("/optimize", async (req, res) => {
  try {
    const { districtId } = req.body;

    if (!districtId || isNaN(parseInt(districtId))) {
      return res.status(400).json(error("Valid district ID required"));
    }

    await dynamicDiscoveryRanking.optimizeWeights(parseInt(districtId));

    return res.json(success({
      message: `Ranking optimization completed for district ${districtId}`,
      timestamp: new Date().toISOString()
    }));
  } catch (err: any) {
    console.error("Ranking optimization error:", err.message);
    return res.status(500).json(error("Failed to optimize ranking"));
  }
});

/**
 * GET /api/admin/dynamic-ranking/test
 * Test ranking calculation with sample data
 */
router.get("/test", async (req, res) => {
  try {
    // Sample vendor data for testing
    const sampleVendors = [
      {
        id: 1,
        name: "Test Pharmacy",
        category: "PHARMACY",
        districtId: 1,
        avgRating: 4.5,
        isVerified: true,
        dsslScore: 85
      },
      {
        id: 2,
        name: "Test Grocery",
        category: "GROCERY",
        districtId: 1,
        avgRating: 4.0,
        isVerified: false,
        dsslScore: 70
      }
    ];

    const rankingContext = {
      query: "pharmacy near me",
      districtId: 1,
      entityType: 'vendor' as const,
      category: 'pharmacy'
    };

    const rankings = await dynamicDiscoveryRanking.rankEntities(sampleVendors, rankingContext);

    return res.json(success({
      testResults: rankings,
      explanation: "Sample ranking test with mock data to verify system functionality"
    }));
  } catch (err: any) {
    console.error("Ranking test error:", err.message);
    return res.status(500).json(error("Failed to run ranking test"));
  }
});

export default router;