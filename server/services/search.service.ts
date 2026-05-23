// @ts-nocheck
// server/services/search.service.ts
// @deprecated - replaced by searchUnified.service.ts

import { findVendorsByDistrict } from "../repositories/vendor.repo";
import { getBatchTrustScores } from "./dssl.service";

// Intent category → VendorCategory enum mapper
const CATEGORY_MAP: Record<string, string> = {
  food: "GROCERY",
  grocery: "GROCERY",
  kirana: "GROCERY",
  supermarket: "GROCERY",
  doctor: "HOSPITAL",
  hospital: "HOSPITAL",
  clinic: "HOSPITAL",
  health: "HOSPITAL",
  pharmacy: "PHARMACY",
  medicine: "PHARMACY",
  service: "SERVICE",
  plumber: "SERVICE",
  electrician: "SERVICE",
  carpenter: "SERVICE",
  repair: "SERVICE",
  education: "EDUCATION",
  school: "EDUCATION",
  coaching: "EDUCATION",
  transport: "TRANSPORT",
  bus: "TRANSPORT",
  taxi: "TRANSPORT",
  travel: "TRANSPORT"
};

interface Intent {
  keywords?: string[];
  category?: string;
}

export async function searchVendors(intent: Intent, districtId: number, query?: string) {
  // 🔹 MAP category intent → VendorCategory enum
  let mappedCategory: string | undefined;
  if (intent.category) {
    const normalized = intent.category.toLowerCase();
    mappedCategory = CATEGORY_MAP[normalized] || normalized.toUpperCase();
  }

  // Build category filter from intent
  let categoryFilter = {}
  if (mappedCategory) {
    categoryFilter = { category: mappedCategory }
  }

  // 🔹 STEP 1: DB FILTER (optimized) - use only canonical fields
  // NOTE: 'isSponsored', 'boostWeight', 'boostExpiry' are NOT in Prisma schema
  // 'boostedUntil' IS the canonical field. Derive 'isSponsored' at runtime.
  const vendors = await findVendorsByDistrict(districtId, {
    select: {
      id: true,
      name: true,
      rating: true,
      boostedUntil: true,
      category: true,
      dsslScore: true,
    },
    take: 30,
    where: {
      ...categoryFilter,
      ...(intent.keywords?.length && {
        name: { contains: intent.keywords[0], mode: "insensitive" as const }
      })
    }
  });

  if (!vendors.length) return []

  // 🔹 STEP 2: BATCH TRUST (NO N+1)
  const ids = vendors.map((v) => v.id)
  const trustMap = await getBatchTrustScores(ids, districtId)

  // 🔹 STEP 3: RELEVANCE SCORE
  const scored = vendors.map((v) => {
    let relevance = 0

    // exact name match (highest priority)
    for (const k of intent.keywords || []) {
      if (v.name.toLowerCase().includes(k.toLowerCase())) relevance += 20
    }

    // category boost (already filtered by category above but extra boost)
    if (intent.category && v.category === intent.category) {
      relevance += 50  // High boost for matching category
    }

    // query substring match
    if (query && v.name.toLowerCase().includes(query.toLowerCase())) {
      relevance += 15
    }

    // rating boost (0-5 scale)
    relevance += Math.min((v.rating ?? 0) * 2, 10)

    const trustScore = trustMap[v.id]?.score ?? 0

    // 🔥 BOOST SCORING (Sponsored boost with safety caps)
    let boostScore = 0
    const isSponsored = !!(v.boostedUntil && new Date(v.boostedUntil) > new Date());
    if (isSponsored) {
      // Use default weight 20 since boostWeight is not in schema
      const boostWeight = 20;
      boostScore = Math.min(boostWeight, 30)
      boostScore = Math.min(boostScore, trustScore) // Safety: boost ≤ trust
    }

    // 🔥 FINAL SCORE (TRUST DOMINATES + BOOST ENHANCES)
    const finalScore = trustScore * 0.7 + relevance * 0.2 + boostScore * 0.1

    return {
      ...v,
      trustScore,
      relevanceScore: relevance,
      isSponsored,
      finalScore
    }
  })

  // 🔹 STEP 4: SORT WITH SPONSORED POSITION CONTROL
  const sorted = scored.sort((a, b) => {
    const aSponsored = a.isSponsored;
    const bSponsored = b.isSponsored;

    if (aSponsored && !bSponsored) return -1;
    if (!aSponsored && bSponsored) return 1;

    // Within sponsored or non-sponsored, sort by final score
    return b.finalScore - a.finalScore;
  });

  // Limit sponsored results to top 2 positions maximum
  const result = [];
  let sponsoredCount = 0;

  for (const vendor of sorted) {
    const isSponsored = vendor.isSponsored;

    if (isSponsored && sponsoredCount >= 2) {
      continue; // Skip additional sponsored beyond top 2
    }

    if (isSponsored) sponsoredCount++;

    result.push(vendor);

    // Return top 10 results
    if (result.length >= 10) break;
  }

  return result;
}
