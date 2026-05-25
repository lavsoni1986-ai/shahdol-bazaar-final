/**
 * DISTRICT INTELLIGENCE ROUTES - Admin Heatmap API
 *
 * Provides operational district memory insights for admin dashboard
 */

import express, { Request, Response } from "express";
import { requireAuth, requireSuperAdmin } from "../../auth/middleware";
import { districtMemory } from "../../services/district-memory.service";

const router = express.Router();

// GET /api/admin/district-intelligence
router.get("/", requireAuth, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const districtId = req.ctx?.districtId || 1; // Default to Shahdol

    // Get aggregated demand
    const demandData = await districtMemory.aggregateDistrictDemand(districtId);

    // Get supply gaps
    const supplyGaps = await districtMemory.calculateSupplyGaps(districtId);

    // Get top trending queries (recent high-demand searches)
    const trendingQueries = await districtMemory.getDemandQueryTrends(districtId, 24); // Last 24 hours

    // Get critical gaps (severity critical + high)
    const criticalGaps = supplyGaps.filter(gap => gap.severity === 'critical' || gap.severity === 'high');

    // Generate onboarding recommendations based on critical gaps
    const recommendedOnboarding = criticalGaps.slice(0, 5).map(gap => ({
      category: gap.intent,
      demand: gap.demand,
      supply: gap.supply,
      gapRatio: gap.gapRatio,
      priority: gap.severity,
      recommendedPartners: getRecommendedPartnerTypes(gap.intent)
    }));

    const response = {
      districtId,
      timestamp: new Date().toISOString(),
      topDemand: demandData.slice(0, 10),
      criticalGaps,
      trendingQueries: trendingQueries.slice(0, 10),
      recommendedOnboarding,
      summary: {
        totalDemandSignals: demandData.reduce((sum, d) => sum + d.totalSearches, 0),
        criticalGapCount: criticalGaps.length,
        avgConfidence: demandData.length > 0 ?
          demandData.reduce((sum, d) => sum + d.avgConfidence, 0) / demandData.length : 0
      }
    };

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error("District intelligence API error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch district intelligence"
    });
  }
});

// Helper function to recommend partner types based on intent
function getRecommendedPartnerTypes(intent: string): string[] {
  const recommendations: Record<string, string[]> = {
    'healthcare': ['clinics', 'pharmacies', 'diagnostic centers', 'hospitals'],
    'hospital': ['clinics', 'pharmacies', 'diagnostic centers'],
    'pharmacy': ['pharmacies', 'medical stores', 'healthcare providers'],
    'electrician': ['electrical contractors', 'electricians', 'repair services'],
    'electronics': ['electronics repair', 'mobile repair', 'computer services'],
    'carpenter': ['carpenters', 'woodwork specialists', 'furniture repair'],
    'mechanic': ['automobile repair', 'bike repair', 'mechanics'],
    'restaurant': ['restaurants', 'food delivery', 'cafes', 'food vendors'],
    'grocery': ['grocery stores', 'kirana shops', 'supermarkets'],
    'school': ['schools', 'coaching centers', 'educational institutes'],
    'taxi': ['taxi services', 'auto rickshaws', 'transport providers']
  };

  return recommendations[intent.toLowerCase()] || ['general service providers'];
}

export default router;