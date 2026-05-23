import { prisma } from "../storage";
import { mapVendorByType } from "../dto/entity.dto";

const getDSSLScore = async (vendorId: number) => {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  return (vendor?.dsslScore || 0) / 100; // Normalize to 0-1
};

const getContextualPulse = async (districtId: number) => {
  // Placeholder: calculate based on recent activity, time of day, etc.
  // For now, return a random score between 0.5-1.0
  return Math.random() * 0.5 + 0.5;
};

export const calculateSovereignScore = async (vendorId: number, districtId: number) => {
  // 1. DSSL (Rules) - 50%
  const dssl = await getDSSLScore(vendorId);

  // 2. ML Prediction (Historical) - 30%
  const mlProfile = await prisma.vendorMLProfile.findUnique({ where: { vendorId } });
  const mlScore = mlProfile?.reliabilityScore || 0.5;

  // 3. Context (Dynamic) - 20%
  const contextScore = await getContextualPulse(districtId);

  // 🔥 THE SUPER AI FORMULA
  const finalScore = (0.5 * dssl) + (0.3 * mlScore) + (0.2 * contextScore);

  return {
    total: parseFloat(finalScore.toFixed(4)),
    breakdown: { dssl, mlScore, contextScore }
  };
};
