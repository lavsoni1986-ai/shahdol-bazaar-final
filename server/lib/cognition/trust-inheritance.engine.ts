/**
 * 🛡️ Sovereign Trust Formula:
 * Trust_Child = (Trust_Base * 0.6) + (Trust_Parent * 0.4)
 */
export const calculateInheritedTrust = (
  childBaseScore: number,
  parentTrustScore: number | null | undefined
): number => {
  if (!parentTrustScore && parentTrustScore !== 0) return childBaseScore;

  const inheritedScore = (childBaseScore * 0.6) + (parentTrustScore * 0.4);
  return Number.parseFloat(inheritedScore.toFixed(4));
};

