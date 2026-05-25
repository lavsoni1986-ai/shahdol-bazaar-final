// Cognition Response Synthesis Engine
// BharatOS Phase 4 - AI-Powered Response Generation

export const ENGINE_VERSION = "1.0.0";

import { getGroq } from '../../middleware/groq';

const SYNTHESIS_STRATEGIES: Record<string, { tone: string; constraints?: string; prefix: string; maxWords?: number }> = {
  EMERGENCY: {
    tone: "Urgent, Direct, Minimal",
    constraints: "No greetings, priority on contact and location.",
    prefix: "EMERGENCY SUPPORT:",
    maxWords: 30,
  },
  HEALTHCARE: {
    tone: "Reassuring, Professional, Actionable",
    constraints: "Mention verification status, suggest calling for availability.",
    prefix: "DOCTOR/HOSPITAL FOUND:",
    maxWords: 80,
  },
  COMMERCE: {
    tone: "Friendly, Suggestive, Decisive",
    prefix: "MARKETPLACE:",
    maxWords: 80,
  },
};

export interface ResponseSynthesisContext {
  query: string;
  districtName?: string;
  cognition: any;
  intent?: any;
  vendors?: any[];
  products?: any[];
  services?: any[];
  hospitals?: any[];
  doctors?: any[];
  transportResults?: any;
  districtIntelligence?: any;
  hasLiveAvailability?: boolean;
}

export interface SynthesisResult {
  answer: string;
  hasAIResponse: boolean;
}

export async function synthesizeResponse(context: ResponseSynthesisContext): Promise<SynthesisResult> {
  const {
    query,
    districtName,
    cognition,
    intent,
    vendors = [],
    products = [],
    services = [],
    hospitals = [],
    doctors = [],
    transportResults,
    districtIntelligence,
    hasLiveAvailability = false
  } = context;

  // Default fallback answer
  let answer = `Here are a few trusted options in ${districtName || "your district"} for "${query}".`;

  const groq = getGroq();

  if (groq) {
    try {
      const getTrustLabel = (score: number) => {
        const normalized = score <= 1 ? score * 100 : score;
        if (normalized >= 90) return "Highly Trusted";
        if (normalized >= 75) return "Verified";
        return "Local Listing";
      };

      const structuredDomain = (intent?.domain || intent?.structuredIntent?.domain || cognition?.domain || "COMMERCE")
        .toString()
        .toUpperCase();

      const strategy =
        SYNTHESIS_STRATEGIES[structuredDomain] ||
        (structuredDomain === "EMERGENCY"
          ? SYNTHESIS_STRATEGIES.EMERGENCY
          : structuredDomain === "HEALTHCARE"
            ? SYNTHESIS_STRATEGIES.HEALTHCARE
            : SYNTHESIS_STRATEGIES.COMMERCE);

      const entitiesForEvidence = [
        ...doctors.map(d => ({
          title: d?.title || d?.name || "Doctor",
          trustLabel: getTrustLabel(Number(d?.dsslScore || 0)),
          phone: d?.phone || null,
          address: d?.address || null,
        })),
        ...hospitals.map(h => ({
          title: h?.title || h?.name || "Hospital",
          trustLabel: getTrustLabel(Number(h?.dsslScore || 0)),
          phone: h?.phone || null,
          address: h?.address || null,
        })),
        ...vendors.map(v => ({
          title: v?.title || v?.name || "Partner",
          trustLabel: getTrustLabel(Number(v?.dsslScore || 0)),
          phone: v?.phone || null,
          address: v?.address || null,
        })),
      ];

      const availabilityClause =
        hasLiveAvailability
          ? "Available hai. Booking active hai."
          : entitiesForEvidence.some(e => e.trustLabel === "Highly Trusted")
            ? "Availability confirm karne ke liye abhi call karein."
            : entitiesForEvidence.some(e => e.trustLabel === "Verified")
              ? "Verified listing hai. Availability ke liye sampark karein."
              : "Local listing mili hai. Truth verify karke hi aage badhein.";

      // Build context strings
      const vendorContext = vendors
        .map(v => `${v.title} (${getTrustLabel(Number(v.dsslScore || 0))})`)
        .join("\n");

      const productContext = products
        .map(p => `${p.title} ₹${p.meta?.price || 0} at ${p.subtitle || "Vendor"}`)
        .join("\n");

      const serviceContext = services
        .map(s => `${s.name} (${s.serviceType}) - ${s.phone || "Contact available"}`)
        .join("\n") || "None";

      const hospitalContext = hospitals
        .map(h => `${h.title} (${getTrustLabel(Number(h.dsslScore || 0))})`)
        .join("\n") || "None";

      const doctorContext = doctors
        .map(d => `${d.title} (${d.subtitle || "Doctor"}) - ${d.phone || "Contact available"}`)
        .join("\n") || "None";

      const transportContext = transportResults?.results?.map((t: any) =>
        `${t.fromCity} → ${t.toCity} at ${t.time}, ₹${t.price} (${t.type})`
      ).join("\n") || "None";

      // Build district memory context
      let memoryContext = "";
      if (districtIntelligence) {
        const relevantSupplyGaps = districtIntelligence.supplyGaps
          .filter((g: any) => g.domain === cognition.domain)
          .slice(0, 2);

        const relevantTrends = districtIntelligence.trendingQueries
          .filter((t: any) => t.category === cognition.domain)
          .slice(0, 2);

        if (relevantSupplyGaps.length > 0) {
          memoryContext += `\nNote: Some services are limited in this district.`;
        }

        if (relevantTrends.length > 0) {
          memoryContext += `\nCommon searches here include: ${relevantTrends.map(t => `"${t.query}"`).join(', ')}.`;
        }

        if (districtIntelligence.economicHealth < 70) {
          memoryContext += `\nNote: Some listings may be limited.`;
        }
      }

      const productContextSanitized = products
        .map(p => `${p.title} at ${p.subtitle || "Vendor"}`)
        .join("\n");

      const transportContextSanitized = transportResults?.results?.map((t: any) =>
        `${t.fromCity} -> ${t.toCity} (${t.type})`
      ).join("\n") || "None";

      const prompt = `
Role: BharatOS District Intelligence (${districtName || "this district"}).
Tone: ${strategy.tone}
Instructions: ${strategy.constraints || "Be concise and actionable."}
${strategy.prefix}

Goal: DECISION ASSISTANCE (Not narration).
Query: ${query}

Data Source (Verified Facts Only):
${entitiesForEvidence.length ? entitiesForEvidence.map(e => `- ${e.title} (${e.trustLabel}) - Contact: ${e.phone || "N/A"}`).join("\n") : "None"}

Partners:
${vendorContext || "None"}

Products:
${productContextSanitized || "None"}

Services:
${serviceContext}

Hospitals:
${hospitalContext}

Doctors:
${doctorContext}

Transport:
${transportContextSanitized}

District Note:
${memoryContext || "None"}

Rules:
1) Situational compression: max action, min words.
2) Decisive language: "Call karein", "Navigate karein".
3) Evidence discipline: if no live availability data, use: "${availabilityClause}".
4) No numbers: never mention scores (e.g., 0.9) or ranks.
5) Max ${strategy.maxWords || 80} words.
`;

      const groqCall = groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 120
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('AI response timeout')), 5000);
      });

      const response = await Promise.race([groqCall, timeoutPromise]);

      const aiAnswer = response.choices[0]?.message?.content;
      if (aiAnswer) {
        // Enforce word limit for deterministic responses
        const MAX_WORDS = strategy.maxWords || 40;
        const trimmed = aiAnswer
          .split(/\s+/)
          .slice(0, MAX_WORDS)
          .join(" ");
        answer = trimmed;
      }
    } catch (error) {
      console.error('[COGNITION] AI response generation failed, using fallback:', error);
      // answer remains the default fallback
    }
  }

  const hasAIResponse = !!answer && answer !== `Here are a few trusted options in ${districtName || "your district"} for "${query}".`;

  return {
    answer,
    hasAIResponse
  };
}
