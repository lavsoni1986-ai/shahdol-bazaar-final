import { prisma } from '../storage';

function calculateSimilarity(a: any, b: any) {
  let score = 0;
  let total = 0;

  // Rating similarity
  if (a.avgRating !== undefined && b.avgRating !== undefined) {
    total++;
    if (Math.abs(a.avgRating - b.avgRating) < 0.2) score++;
  }

  // Conversion rate similarity
  if (a.conversionRate !== undefined && b.conversionRate !== undefined) {
    total++;
    if (Math.abs(a.conversionRate - b.conversionRate) < 0.05) score++;
  }

  // Repeat rate similarity
  if (a.repeatRate !== undefined && b.repeatRate !== undefined) {
    total++;
    if (Math.abs(a.repeatRate - b.repeatRate) < 0.05) score++;
  }

  // Rating velocity similarity
  if (a.ratingVelocity !== undefined && b.ratingVelocity !== undefined) {
    total++;
    if (Math.abs(a.ratingVelocity - b.ratingVelocity) < 5) score++;
  }

  return total > 0 ? score / total : 0;
}

export async function matchFraudPatterns(currentProfile: any, districtId?: number) {
  const patterns = await prisma.fraudPattern.findMany({
    where: {
      ...(districtId && { districtId }),
      confidence: { gt: 0.7 } // Only use high-confidence patterns
    },
    orderBy: { usageCount: 'desc' },
    take: 20 // Limit to top patterns for performance
  });

  let scoreBoost = 0;
  const matched: number[] = [];

  for (const p of patterns) {
    const similarity = calculateSimilarity(currentProfile, p.pattern);

    if (similarity > 0.85) { // Increased threshold to prevent overfitting
      scoreBoost += p.severity * p.confidence * 20;
      matched.push(p.id);

      // Update pattern quality
      await prisma.fraudPattern.update({
        where: { id: p.id },
        data: {
          confidence: Math.min(1, p.confidence + 0.1),
          usageCount: p.usageCount + 1
        }
      });
    }
  }

  return { scoreBoost, matched };
}

export async function saveFraudPattern(profile: any, fraudScore: number, districtId?: number, repeatRate?: number) {
  // Stricter conditions to prevent poisoning
  if (fraudScore > 85 && repeatRate !== undefined && repeatRate < 0.1) {
    await prisma.fraudPattern.create({
      data: {
        pattern: profile,
        severity: fraudScore / 100,
        districtId: districtId || 0,
        confirmed: false // Require admin confirmation
      }
    });
  }
}