export function detectAnomalies(profile: any) {
  let score = 0;
  const flags: string[] = [];

  // 🚨 Rating Spike
  if (profile.ratingVelocity > 20) {
    score += 25;
    flags.push("Rating spike detected");
  }

  // 🚨 Fake High Rating
  if (profile.avgRating > 4.8 && profile.conversionRate < 0.1) {
    score += 20;
    flags.push("High rating but low conversion");
  }

  // 🚨 Low Repeat = Low Trust
  if (profile.repeatRate < 0.1) {
    score += 15;
    flags.push("Low repeat customers");
  }

  // 🚨 High Complaints
  if (profile.complaintRate > 0.3) {
    score += 25;
    flags.push("High complaint ratio");
  }

  // 🚨 Bot Activity
  if (profile.maxSameIPClicks > 20) {
    score += 30;
    flags.push("Bot activity suspected");
  }

  return { score, flags };
}