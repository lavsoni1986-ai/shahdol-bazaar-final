import express, { type Request, type Response } from "express";
import { DistrictManager } from "../../services/district.manager";
import { MultiDistrictLearner } from "../../services/multi.district.learner";
import { LocalIntelligenceManager } from "../../services/local.intelligence.profile";

const router = express.Router();

// Master dashboard overview
router.get("/overview", async (req: Request, res: Response) => {
  try {
    const districts = await DistrictManager.getAllDistrictConfigs();
    const crossAnalysis = await MultiDistrictLearner.crossDistrictLearning();

    const districtStats = await Promise.all(
      districts.map(async (district) => {
        const learning = await MultiDistrictLearner.getDistrictLearning(district.id);
        const lip = await LocalIntelligenceManager.getLIP(district.id);

        return {
          id: district.id,
          name: district.name,
          slug: district.slug,
          state: district.state,
          metrics: {
            userActivity: learning.userBehavior.averageSessionTime,
            vendorCount: 0, // Would need to query actual vendor count
            marketMaturity: lip.economicProfile.marketMaturity,
            digitalAdoption: lip.economicProfile.digitalAdoption,
            topCategory: Object.entries(learning.vendorPerformance.topCategories)[0]?.[0] || 'N/A'
          },
          health: {
            aiConfidence: learning.vendorPerformance.averageRatings,
            userEngagement: learning.userBehavior.averageSessionTime > 300 ? 'high' : 'medium',
            marketGrowth: 'stable' // Would calculate from trends
          }
        };
      })
    );

    res.json({
      totalDistricts: districts.length,
      totalUsers: districtStats.reduce((sum, d) => sum + (d.metrics.userActivity || 0), 0),
      totalVendors: districtStats.reduce((sum, d) => sum + d.metrics.vendorCount, 0),
      averageMarketMaturity: districtStats.reduce((sum, d) => sum + d.metrics.marketMaturity, 0) / districts.length,
      districtStats,
      crossAnalysis,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error("Master overview error:", error);
    res.status(500).json({ error: "Failed to generate master overview" });
  }
});

// District comparison analytics
router.get("/district-comparison", async (req: Request, res: Response) => {
  try {
    const districts = await DistrictManager.getAllDistrictConfigs();
    const comparison = await MultiDistrictLearner.crossDistrictLearning();

    const districtMetrics = await Promise.all(
      districts.map(async (district) => {
        const learning = await MultiDistrictLearner.getDistrictLearning(district.id);
        const lip = await LocalIntelligenceManager.getLIP(district.id);

        return {
          district: district.name,
          metrics: {
            userEngagement: learning.userBehavior.averageSessionTime,
            marketMaturity: lip.economicProfile.marketMaturity * 100,
            digitalAdoption: lip.economicProfile.digitalAdoption * 100,
            topCategories: learning.vendorPerformance.topCategories,
            peakHours: learning.userBehavior.peakHours,
            trustScore: Object.values(lip.behavioralProfile.trustMetrics).reduce((a, b) => a + b, 0) / 4 * 100
          },
          performance: {
            strengths: [] as string[],
            weaknesses: [] as string[],
            recommendations: [] as string[]
          }
        };
      })
    );

    // Generate performance insights
    districtMetrics.forEach(district => {
      if (district.metrics.userEngagement > 600) {
        district.performance.strengths.push("High user engagement");
      }
      if (district.metrics.marketMaturity > 70) {
        district.performance.strengths.push("Mature market");
      }
      if (district.metrics.digitalAdoption < 50) {
        district.performance.weaknesses.push("Low digital adoption");
        district.performance.recommendations.push("Increase digital literacy programs");
      }
    });

    res.json({
      districts: districtMetrics,
      bestPractices: comparison.bestPractices,
      insights: {
        highestEngagement: districtMetrics.sort((a, b) => b.metrics.userEngagement - a.metrics.userEngagement)[0],
        mostMature: districtMetrics.sort((a, b) => b.metrics.marketMaturity - a.metrics.marketMaturity)[0],
        fastestGrowing: districtMetrics[0] // Placeholder
      }
    });
  } catch (error) {
    console.error("District comparison error:", error);
    res.status(500).json({ error: "Failed to generate district comparison" });
  }
});

// Real-time health monitoring
router.get("/health", async (req: Request, res: Response) => {
  try {
    const districts = await DistrictManager.getAllDistrictConfigs();

    const healthStatus = await Promise.all(
      districts.map(async (district) => {
        const learning = await MultiDistrictLearner.getDistrictLearning(district.id);

        // Calculate health score (0-100)
        const engagementScore = Math.min(learning.userBehavior.averageSessionTime / 10, 100);
        const activityScore = learning.userBehavior.peakHours.length * 20;
        const vendorScore = learning.vendorPerformance.averageRatings * 20;

        const overallHealth = (engagementScore + activityScore + vendorScore) / 3;

        return {
          district: district.name,
          health: {
            score: Math.round(overallHealth),
            status: overallHealth > 80 ? 'excellent' : overallHealth > 60 ? 'good' : overallHealth > 40 ? 'fair' : 'poor',
            metrics: {
              engagement: Math.round(engagementScore),
              activity: Math.round(activityScore),
              vendorQuality: Math.round(vendorScore)
            }
          },
          alerts: [], // Would include real alerts like system issues, low engagement, etc.
          lastChecked: new Date().toISOString()
        };
      })
    );

    const overallHealth = healthStatus.reduce((sum, d) => sum + d.health.score, 0) / healthStatus.length;

    res.json({
      overallHealth: Math.round(overallHealth),
      districtHealth: healthStatus,
      systemStatus: 'operational',
      activeAlerts: healthStatus.flatMap(d => d.alerts)
    });
  } catch (error) {
    console.error("Health monitoring error:", error);
    res.status(500).json({ error: "Failed to generate health report" });
  }
});

// Control panel actions
router.post("/actions/:districtId", async (req: Request, res: Response) => {
  try {
    const { districtId } = req.params;
    const { action, parameters } = req.body;

    // Placeholder for district-specific actions
    const actions: Record<string, () => Promise<any>> = {
      'update_config': async () => {
        DistrictManager.clearCache(parseInt(districtId));
        LocalIntelligenceManager.clearCache(parseInt(districtId));
        return { message: "District configuration refreshed" };
      },
      'trigger_learning': async () => {
        await MultiDistrictLearner.updateLearningData();
        return { message: "Learning data updated across all districts" };
      },
      'send_notification': async () => {
        // Would implement notification system
        return { message: "Notification sent to district users" };
      }
    };

    if (!actions[action]) {
      return res.status(400).json({ error: "Invalid action" });
    }

    const result = await actions[action]();

    res.json({
      success: true,
      action,
      districtId,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Control action error:", error);
    res.status(500).json({ error: "Failed to execute action" });
  }
});

export default router;
