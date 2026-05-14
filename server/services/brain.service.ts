import { prisma } from "../storage";

const getDSSLScore = async (vendorId: number) => {
  const vendor = await prisma.vendor.findUnique({
    where: {
      id: vendorId, // ✅ Fixed: Use 'id' as primary key
    }
  });
  return (vendor?.dsslScore || 0) / 100; // Normalize to 0-1
};

const getContextualPulse = async (districtId: number) => {
  // Placeholder: calculate based on recent activity, time of day, etc.
  // For now, return a random score between 0.5-1.0
  return Math.random() * 0.5 + 0.5;
};

export const calculateSovereignScore = async (vendorId: number, districtId: number) => {
  // 1. DSSL (Rules) - 40%
  const dssl = await getDSSLScore(vendorId);

  // 2. ML Prediction (Historical) - 25%
  const mlProfile = await prisma.vendorMLProfile.findUnique({ where: { vendorId } });
  const mlScore = mlProfile?.reliabilityScore || 0.5;

  // 3. User Behavior (Real-time ML) - 25%
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { conversionRate: true }
  });
  const behaviorScore = vendor?.conversionRate || 0;

  // 4. Context (Dynamic) - 10%
  const contextScore = await getContextualPulse(districtId);

  // 🔥 THE SUPER AI FORMULA (Hybrid Scoring)
  const finalScore = (0.4 * dssl) + (0.25 * mlScore) + (0.25 * behaviorScore) + (0.1 * contextScore);

  return {
    total: parseFloat(finalScore.toFixed(4)),
    breakdown: { dssl, mlScore, behaviorScore, contextScore }
  };
};

// Sovereign Ranking Logic: Ranking_Position = f(FinalScore, Distance, Availability)
export const calculateRankingPosition = async (vendorId: number, districtId: number, userLocation?: { lat: number, lng: number }) => {
  const score = await calculateSovereignScore(vendorId, districtId);

  // Placeholder for Distance (km)
  const distance = userLocation ? Math.random() * 10 : 0; // Mock distance

  // Placeholder for Availability (0-1)
  const availability = Math.random(); // Mock availability

  // Weighted formula
  const rankingScore = (0.6 * score.total) - (0.2 * distance) + (0.2 * availability);

  return {
    position: rankingScore,
    components: { finalScore: score.total, distance, availability }
  };
};

// 🧠 DSSL Scoring Algorithm (Secret Weapon)
export function calculateDSSLScore(vendor: any): number {
  try {
    const rating = vendor?.rating || 0;
    const reviews = vendor?.totalReviews || 0;
    const productCount = vendor?._count?.products || 0;
    const orderCount = vendor?._count?.orders || 0;
    const accountAge = vendor?.createdAt ? calculateAccountAge(vendor.createdAt) : 0;

    // DSSL Formula: Weighted scoring system
    const score =
      (rating * 0.3) +           // Customer satisfaction (30%)
      (Math.min(reviews / 10, 5) * 0.2) +  // Review volume (20%)
      (Math.min(productCount / 5, 5) * 0.15) + // Product diversity (15%)
      (Math.min(orderCount / 20, 5) * 0.2) +  // Sales performance (20%)
      (Math.min(accountAge / 30, 5) * 0.15);  // Account maturity (15%)

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.warn("⚠️ [DSSL] Error calculating score:", error);
    return 0;
  }
}

// 📅 Account Age Calculator (in days)
export function calculateAccountAge(createdAt: Date): number {
  try {
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch (error) {
    console.warn("⚠️ [ACCOUNT AGE] Error calculating age:", error);
    return 0;
  }
}

// 🧠 Generate embeddings using Groq API
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const { getGroq } = await import("../middleware/groq");
    const groq = getGroq();
    if (!groq) {
      throw new Error("Groq client not available");
    }

    // Use a simple text-to-vector approach
    // In production, you'd use proper embedding models like text-embedding-ada-002
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Convert this text to a semantic vector representation. Return only a JSON array of 384 numbers representing the embedding."
        },
        {
          role: "user",
          content: text
        }
      ],
      model: "mixtral-8x7b-32768",
      temperature: 0.1,
      max_tokens: 1000
    });

    const embeddingText = response.choices[0]?.message?.content || "[]";
    const embedding = JSON.parse(embeddingText);

    if (!Array.isArray(embedding) || embedding.length !== 384) {
      // Fallback: generate a simple hash-based vector
      return generateFallbackEmbedding(text);
    }

    return embedding;
  } catch (error) {
    console.warn("⚠️ [EMBEDDINGS] Error generating embedding, using fallback:", error);
    return generateFallbackEmbedding(text);
  }
}

// 🔄 Fallback embedding generation (simple hash-based)
function generateFallbackEmbedding(text: string): number[] {
  const vector = new Array(384).fill(0);
  const hash = simpleHash(text);

  // Distribute hash across vector dimensions
  for (let i = 0; i < 384; i++) {
    vector[i] = (Math.sin(hash + i) + 1) / 2; // Normalize to 0-1
  }

  return vector;
}

// 🔢 Simple hash function
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// 📐 Cosine similarity calculation
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  try {
    if (vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  } catch (error) {
    console.warn("⚠️ [COSINE SIMILARITY] Error calculating similarity:", error);
    return 0;
  }
}

// 🏆 DSSL Badge Level Calculation
export function calculateBadgeLevel(dsslScore: number) {
  const score = Math.round(dsslScore * 100) / 100;

  if (score >= 8.5) {
    return {
      level: "PLATINUM",
      label: "Sovereign Elite",
      color: "#E5E4E2", // Platinum
      bgColor: "bg-gradient-to-r from-gray-300 to-gray-400",
      textColor: "text-gray-800",
      icon: "👑",
      description: "Top 1% in district - Sovereign Elite Status"
    };
  } else if (score >= 7.0) {
    return {
      level: "GOLD",
      label: "Trusted Partner",
      color: "#FFD700", // Gold
      bgColor: "bg-gradient-to-r from-yellow-400 to-yellow-500",
      textColor: "text-yellow-900",
      icon: "🏆",
      description: "Highly trusted - Gold Standard"
    };
  } else if (score >= 5.5) {
    return {
      level: "SILVER",
      label: "Quality Vendor",
      color: "#C0C0C0", // Silver
      bgColor: "bg-gradient-to-r from-gray-400 to-gray-500",
      textColor: "text-gray-100",
      icon: "⭐",
      description: "Established quality - Silver Badge"
    };
  } else if (score >= 4.0) {
    return {
      level: "BRONZE",
      label: "Rising Star",
      color: "#CD7F32", // Bronze
      bgColor: "bg-gradient-to-r from-orange-600 to-orange-700",
      textColor: "text-orange-100",
      icon: "🌟",
      description: "Promising vendor - Bronze Achievement"
    };
  } else {
    return {
      level: "EMERALD",
      label: "New Vendor",
      color: "#50C878", // Emerald
      bgColor: "bg-gradient-to-r from-green-500 to-green-600",
      textColor: "text-green-100",
      icon: "🌱",
      description: "New to platform - Building trust"
    };
  }
}
