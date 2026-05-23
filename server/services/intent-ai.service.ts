/**
 * INTENT AI SERVICE - Groq-powered intent parsing
 * Enhances rule-based parsing with AI understanding
 */

import { getGroq } from "../middleware/groq";
import { DistrictManager } from "./district.manager";
import { parseNaturalLanguage, IntentQuery } from "./intent.service";

export async function parseIntentAI(query: string, districtId?: number): Promise<IntentQuery | null> {
  try {
    const groq = getGroq();
    if (!groq) {
      console.warn("Groq not available, falling back to rule-based parsing");
      return null;
    }

    let districtContext = "";
    if (districtId) {
      try {
        const districtConfig = await DistrictManager.getDistrictConfig(districtId);
        districtContext = `
        Local context for ${districtConfig.name}:
        - Cuisine: ${districtConfig.localCuisine.join(', ')}
        - Festivals: ${districtConfig.festivals.map(f => f.name).join(', ')}
        - Dialect: ${districtConfig.dialects.join(', ')}
        `;
      } catch (error) {
        console.warn("Could not load district context:", error);
      }
    }

    const prompt = `You are BharatAI, a marketplace assistant for Indian districts.

${districtContext}

Analyze this user query for local marketplace search. Extract intent in JSON:

Query: "${query}"

Return ONLY JSON:
{
  "intent": "food|grocery|service|product|general",
  "keywords": ["search", "terms"],
  "urgency": "low|medium|high",
  "timeContext": "morning|afternoon|evening|night|festival"
}`;

     const response = await groq.chat.completions.create({
       messages: [{ role: "user", content: prompt }],
       model: "llama-3.3-70b-versatile",
       temperature: 0.2,
       max_tokens: 200
     });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      intent: parsed.intent || 'general',
      keywords: parsed.keywords || [],
      urgency: parsed.urgency || 'medium',
      preferences: parsed.preferences || [],
      timeContext: parsed.timeContext || 'general'
    };

  } catch (error) {
    console.error("AI intent parsing failed:", error);
    return null;
  }
}

export async function enhanceIntentWithAI(baseIntent: IntentQuery, query: string, districtId?: number): Promise<IntentQuery> {
  // Try AI enhancement
  const aiIntent = await parseIntentAI(query, districtId);

  if (!aiIntent) {
    return baseIntent; // Fallback to rule-based
  }

  // Merge AI results with rule-based (AI takes precedence for complex queries)
  return {
    ...baseIntent,
    intent: aiIntent.intent !== 'general' ? aiIntent.intent : baseIntent.intent,
    urgency: aiIntent.urgency !== 'medium' ? aiIntent.urgency : baseIntent.urgency,
    timeContext: aiIntent.timeContext !== 'general' ? aiIntent.timeContext : baseIntent.timeContext,
    keywords: [...new Set([...baseIntent.keywords, ...aiIntent.keywords])], // Merge unique
    preferences: [...new Set([...baseIntent.preferences, ...aiIntent.preferences])]
  };
}