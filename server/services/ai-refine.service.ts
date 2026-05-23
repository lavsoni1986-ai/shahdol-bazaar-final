/**
 * AI REFINE SERVICE - Generate human-readable explanations
 * Uses Groq to create contextual reasons for search results
 */

import { getGroq } from "../middleware/groq";
import { CanonicalEntity } from "../dto/entity.dto";

type ReasonTarget = Pick<CanonicalEntity, 'name' | 'rating' | 'category' | 'entityType' | 'dsslScore'> & {
  trustScore?: number;
};

export async function generateReason(query: string, vendor: ReasonTarget): Promise<string> {
  try {
    // Generate contextual reason based on trust and rating
    const reasons = [];
    const trustScore = vendor.trustScore ?? vendor.dsslScore;

    if (trustScore && trustScore >= 80) {
      reasons.push("exceptional community trust");
    } else if (trustScore && trustScore >= 60) {
      reasons.push("strong community trust");
    }

    if (vendor.rating && vendor.rating >= 4) {
      reasons.push(`highly rated (${vendor.rating}⭐)`);
    }

    if (query.toLowerCase().includes('hospital') && vendor.name.toLowerCase().includes('hospital')) {
      reasons.push("verified healthcare provider");
    }

    if (query.toLowerCase().includes('doctor') && vendor.name.toLowerCase().includes('clinic')) {
      reasons.push("medical professional");
    }

    if (vendor.category && query.toLowerCase().includes(vendor.category.toLowerCase())) {
      reasons.push(`aligned with ${vendor.category.toLowerCase()} demand`);
    }

    if (reasons.length > 0) {
      return `Top result because: ${reasons.join(' • ')}`;
    }

    // Fallback to AI if no contextual reasons
    const groq = getGroq();
    if (!groq) return "Top match";

    const res = await groq.chat.completions.create({
      model: "llama-3.3-70b",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: "Explain match in 1 short sentence"
        },
        {
          role: "user",
          content: `Query: ${query}, Entity: ${vendor.name}, Category: ${vendor.category || 'unknown'}, Trust: ${trustScore || 'unknown'}, Rating: ${vendor.rating || 'unknown'}`
        }
      ]
    });

    return res?.choices?.[0]?.message?.content || "Top match";
  } catch {
    return "Top match";
  }
}

export async function batchGenerateReasons(query: string, vendors: ReasonTarget[]): Promise<ReasonTarget[]> {
  // Process in batches to avoid rate limits
  const batchSize = 5;
  const results = [];

  for (let i = 0; i < vendors.length; i += batchSize) {
    const batch = vendors.slice(i, i + batchSize);

    const batchPromises = batch.map(async (vendor) => ({
      ...vendor,
      reason: await generateReason(query, vendor)
    }));

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Small delay between batches
    if (i + batchSize < vendors.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}