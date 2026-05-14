// 🔥 SELF-LEARNING AI: Auto Weight Tuning
// Analyzes performance and adjusts DSSL weights automatically

interface WeightConfig {
  dssl: number;
  ml: number;
  behavior: number;
  context: number;
}

interface PerformanceMetrics {
  conversionRate: number;
  avgDssl: number;
  userSatisfaction: number;
  avgSessionTime: number;
}

export class AutoWeightTuner {
  private readonly TUNING_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days
  private readonly PERFORMANCE_WINDOW = 30 * 24 * 60 * 60 * 1000; // 30 days
  private readonly MIN_IMPROVEMENT = 0.02; // 2% minimum improvement

  async analyzePerformance(districtId: number): Promise<PerformanceMetrics> {
    const thirtyDaysAgo = new Date(Date.now() - this.PERFORMANCE_WINDOW);

    // Conversion rate from orders
    const orders = await prisma.order.count({
      where: {
        vendor: { districtId },
        createdAt: { gte: thirtyDaysAgo }
      }
    });

    const totalSessions = await prisma.userEvent.count({
      where: {
        vendor: { districtId },
        action: 'VIEW',
        createdAt: { gte: thirtyDaysAgo }
      }
    });

    const conversionRate = totalSessions > 0 ? orders / totalSessions : 0;

    // Average DSSL score
    const dsslStats = await prisma.vendor.aggregate({
      where: { districtId },
      _avg: { dsslScore: true }
    });

    const avgDssl = dsslStats._avg.dsslScore || 0;

    // User satisfaction (from ratings)
    const ratings = await prisma.review.aggregate({
      where: {
        vendor: { districtId },
        createdAt: { gte: thirtyDaysAgo }
      },
      _avg: { rating: true }
    });

    const userSatisfaction = (ratings._avg.rating || 0) / 5; // Normalize to 0-1

    // Average session time (simplified)
    const avgSessionTime = 180; // Placeholder - would need session tracking

    return {
      conversionRate,
      avgDssl,
      userSatisfaction,
      avgSessionTime
    };
  }

  async tuneWeights(districtId: number): Promise<WeightConfig | null> {
    // Get current weights
    const currentConfig = await prisma.dsslConfig.findUnique({
      where: { districtId }
    });

    if (!currentConfig) return null;

    const currentWeights: WeightConfig = currentConfig.weights as WeightConfig;

    // Analyze current performance
    const currentPerformance = await this.analyzePerformance(districtId);

    // Test small variations in weights
    const variations = [
      { ...currentWeights, behavior: Math.min(1, currentWeights.behavior + 0.05) }, // Increase behavior
      { ...currentWeights, dssl: Math.min(1, currentWeights.dssl + 0.05) }, // Increase DSSL
      { ...currentWeights, ml: Math.min(1, currentWeights.ml + 0.05) } // Increase ML
    ];

    // Normalize variations
    variations.forEach(v => this.normalizeWeights(v));

    let bestVariation = currentWeights;
    let bestScore = this.calculatePerformanceScore(currentPerformance);

    for (const variation of variations) {
      // Create test config (would run A/B test in production)
      const testScore = await this.simulatePerformance(districtId, variation);
      if (testScore > bestScore + this.MIN_IMPROVEMENT) {
        bestVariation = variation;
        bestScore = testScore;
      }
    }

    // If we found improvement, apply it
    if (bestVariation !== currentWeights) {
      await prisma.dsslConfig.update({
        where: { districtId },
        data: {
          weights: bestVariation,
          updatedAt: new Date()
        }
      });

      // Log the tuning
      await prisma.adminLog.create({
        data: {
          adminId: 1, // System user
          action: "AUTO_WEIGHT_TUNING",
          details: `Weights auto-tuned: ${JSON.stringify(currentWeights)} → ${JSON.stringify(bestVariation)}`
        }
      });

      console.log(`🎯 Auto-tuned weights for district ${districtId}:`, bestVariation);
      return bestVariation;
    }

    return null; // No improvement found
  }

  private normalizeWeights(weights: WeightConfig): void {
    const total = weights.dssl + weights.ml + weights.behavior + weights.context;
    if (total !== 1) {
      weights.dssl /= total;
      weights.ml /= total;
      weights.behavior /= total;
      weights.context /= total;
    }
  }

  private calculatePerformanceScore(metrics: PerformanceMetrics): number {
    // Weighted performance score
    return (
      metrics.conversionRate * 0.4 +
      (metrics.avgDssl / 100) * 0.3 +
      metrics.userSatisfaction * 0.2 +
      (metrics.avgSessionTime / 600) * 0.1 // Normalize session time
    );
  }

  private async simulatePerformance(districtId: number, weights: WeightConfig): Promise<number> {
    // Simplified simulation - in production would run actual A/B test
    const baseMetrics = await this.analyzePerformance(districtId);

    // Estimate performance impact of weight changes
    const behaviorImpact = (weights.behavior - 0.25) * 0.1; // Behavior weight increase helps conversion
    const dsslImpact = (weights.dssl - 0.4) * 0.05; // DSSL weight increase helps satisfaction

    const simulatedMetrics = {
      ...baseMetrics,
      conversionRate: baseMetrics.conversionRate * (1 + behaviorImpact),
      userSatisfaction: baseMetrics.userSatisfaction * (1 + dsslImpact)
    };

    return this.calculatePerformanceScore(simulatedMetrics);
  }

  async runAutoTuning(): Promise<void> {
    console.log('🎯 Running auto weight tuning...');

    const districts = await prisma.district.findMany({ select: { id: true } });
    let tuned = 0;

    for (const district of districts) {
      try {
        const newWeights = await this.tuneWeights(district.id);
        if (newWeights) tuned++;
      } catch (error) {
        console.error(`Failed to tune weights for district ${district.id}:`, error);
      }
    }

    console.log(`✅ Auto-tuning complete: ${tuned}/${districts.length} districts optimized`);
  }
}

// Global tuner instance
export const weightTuner = new AutoWeightTuner();
