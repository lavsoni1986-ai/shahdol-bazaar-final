/**
 * DISTRICT MEMORY ADMIN ROUTES
 * Administrative endpoints for district memory management
 */

import express from "express";
import { requireAuth, requireSuperAdmin } from "../../auth/middleware";
import { success, error } from "../../utils/response";
import { districtMemory } from "../../services/district-memory.service";

const router = express.Router();

// Apply auth middleware
router.use(requireAuth);
router.use(requireSuperAdmin);

/**
 * GET /api/admin/district-memory/:districtId/intelligence
 * Get comprehensive district intelligence and memory
 */
router.get("/:districtId/intelligence", async (req, res) => {
  try {
    const districtId = parseInt(req.params.districtId);

    if (!districtId || isNaN(districtId)) {
      return res.status(400).json(error("Valid district ID required"));
    }

    const intelligence = await districtMemory.getDistrictIntelligence(districtId);

    return res.json(success({
      districtId,
      intelligence,
      analysis: {
        supplyGapCount: intelligence.supplyGaps.length,
        criticalServiceNeeds: intelligence.serviceNeeds.filter(n => n.demandLevel === 'critical').length,
        trendingQueries: intelligence.trendingQueries.length,
        activeSignals: intelligence.activeSignals.length,
        economicHealthScore: intelligence.economicHealth
      }
    }));
  } catch (err: any) {
    console.error("District intelligence error:", err.message);
    return res.status(500).json(error("Failed to fetch district intelligence"));
  }
});

/**
 * GET /api/admin/district-memory/:districtId/demand
 * Get district demand memory patterns
 */
router.get("/:districtId/demand", async (req, res) => {
  try {
    const districtId = parseInt(req.params.districtId);
    const { domain } = req.query;

    const demandMemory = await districtMemory.getDemandMemory(districtId, domain as string);

    return res.json(success({
      districtId,
      domain: domain || 'all',
      demandPatterns: demandMemory,
      summary: {
        totalPatterns: demandMemory.length,
        highDemand: demandMemory.filter(d => d.demandCount >= 10).length,
        recentActivity: demandMemory.filter(d =>
          Date.now() - d.lastQueried.getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
        ).length
      }
    }));
  } catch (err: any) {
    console.error("District demand memory error:", err.message);
    return res.status(500).json(error("Failed to fetch demand memory"));
  }
});

/**
 * GET /api/admin/district-memory/:districtId/supply-gaps
 * Get district supply gaps and unmet needs
 */
router.get("/:districtId/supply-gaps", async (req, res) => {
  try {
    const districtId = parseInt(req.params.districtId);
    const minUrgency = parseFloat(req.query.minUrgency as string) || 1.0;

    const supplyGaps = await districtMemory.getSupplyGaps(districtId, minUrgency);

    return res.json(success({
      districtId,
      supplyGaps,
      summary: {
        totalGaps: supplyGaps.length,
        criticalGaps: supplyGaps.filter(g => g.urgencyScore >= 7).length,
        onboardingReady: supplyGaps.filter(g => g.onboardingReady).length,
        averageUrgency: supplyGaps.length > 0 ?
          supplyGaps.reduce((sum, g) => sum + g.urgencyScore, 0) / supplyGaps.length : 0
      }
    }));
  } catch (err: any) {
    console.error("District supply gaps error:", err.message);
    return res.status(500).json(error("Failed to fetch supply gaps"));
  }
});

/**
 * GET /api/admin/district-memory/:districtId/trends
 * Get query trends and search evolution
 */
router.get("/:districtId/trends", async (req, res) => {
  try {
    const districtId = parseInt(req.params.districtId);
    const limit = parseInt(req.query.limit as string) || 20;

    const trends = await districtMemory.getQueryTrends(districtId, limit);

    return res.json(success({
      districtId,
      trends,
      summary: {
        totalTrends: trends.length,
        risingTrends: trends.filter(t => t.trend === 'rising').length,
        fallingTrends: trends.filter(t => t.trend === 'falling').length,
        stableTrends: trends.filter(t => t.trend === 'stable').length,
        highFrequency: trends.filter(t => t.frequency >= 10).length
      }
    }));
  } catch (err: any) {
    console.error("District trends error:", err.message);
    return res.status(500).json(error("Failed to fetch query trends"));
  }
});

/**
 * GET /api/admin/district-memory/:districtId/service-gaps
 * Get service gaps and unmet service demands
 */
router.get("/:districtId/service-gaps", async (req, res) => {
  try {
    const districtId = parseInt(req.params.districtId);

    const serviceGaps = await districtMemory.getServiceGaps(districtId);

    return res.json(success({
      districtId,
      serviceGaps,
      summary: {
        totalGaps: serviceGaps.length,
        criticalNeeds: serviceGaps.filter(g => g.demandLevel === 'critical').length,
        highNeeds: serviceGaps.filter(g => g.demandLevel === 'high').length,
        underSupplied: serviceGaps.filter(g => g.availableProviders === 0).length
      }
    }));
  } catch (err: any) {
    console.error("District service gaps error:", err.message);
    return res.status(500).json(error("Failed to fetch service gaps"));
  }
});

/**
 * GET /api/admin/district-memory/:districtId/signals
 * Get active district signals and intelligence
 */
router.get("/:districtId/signals", async (req, res) => {
  try {
    const districtId = parseInt(req.params.districtId);
    const { signalType } = req.query;

    const signals = await districtMemory.getDistrictSignals(districtId, signalType as string);

    return res.json(success({
      districtId,
      signals,
      summary: {
        totalSignals: signals.length,
        byType: signals.reduce((acc, s) => {
          acc[s.signalType] = (acc[s.signalType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        highConfidence: signals.filter(s => s.confidence >= 0.8).length,
        highIntensity: signals.filter(s => s.intensity >= 0.7).length
      }
    }));
  } catch (err: any) {
    console.error("District signals error:", err.message);
    return res.status(500).json(error("Failed to fetch district signals"));
  }
});

/**
 * POST /api/admin/district-memory/cleanup
 * Cleanup expired memory and old records
 */
router.post("/cleanup", async (req, res) => {
  try {
    await districtMemory.cleanupExpiredMemory();

    return res.json(success({
      message: "District memory cleanup completed",
      timestamp: new Date().toISOString()
    }));
  } catch (err: any) {
    console.error("Memory cleanup error:", err.message);
    return res.status(500).json(error("Failed to cleanup memory"));
  }
});

export default router;