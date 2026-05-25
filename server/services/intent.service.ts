import { getGroq } from "../middleware/groq";
import { DistrictManager } from "./district.manager";

export interface IntentQuery {
  intent: string; // 'food', 'grocery', 'service', 'product'
  keywords: string[];
  urgency: 'low' | 'medium' | 'high'; // based on time constraints
  budget?: number;
  location?: string;
  preferences: string[]; // dietary, quality, etc.
  timeContext: string; // 'morning', 'evening', 'festival', etc.
  confidence?: number;
  entities?: any;
}

export interface IntentMatch {
  id?: number;
  name?: string;
  type?: string;
  category?: string;
  score?: number;
  vendorId: number;
  relevanceScore: number;
  matchReasons: string[];
  distance?: number;
  estimatedTime?: number; // in minutes
}

export const parseNaturalLanguage = async (text: string, voiceTranscript?: string, districtId?: number): Promise<IntentQuery> => {
  // Rule-based intent parsing (AI will be added later)
  const intent: IntentQuery = {
    intent: 'general',
    keywords: [],
    urgency: 'medium',
    preferences: [],
    timeContext: 'general'
  };

  const lowerQuery = text.toLowerCase().trim();

  // Category detection
  const categoryRules = [
    { keywords: ["food", "biryani", "pizza", "burger", "restaurant", "khana", "eat", "meal"], intent: "food" },
    { keywords: ["doctor", "hospital", "clinic", "medical", "health", "medicine"], intent: "health" },
    { keywords: ["shop", "store", "market", "shopping", "buy", "retail"], intent: "retail" },
    { keywords: ["service", "repair", "maintenance", "cleaning"], intent: "service" },
    { keywords: ["education", "school", "college", "learning"], intent: "education" },
    { keywords: ["transport", "bus", "train", "travel"], intent: "transport" },
    { keywords: ["grocery", "kirana", "supermarket"], intent: "grocery" }
  ];

  for (const rule of categoryRules) {
    if (rule.keywords.some(kw => lowerQuery.includes(kw))) {
      intent.intent = rule.intent;
      break;
    }
  }

  // Time context
  if (lowerQuery.includes("raat") || lowerQuery.includes("night") || lowerQuery.includes("late")) {
    intent.timeContext = 'night';
    intent.urgency = 'high';
  } else if (lowerQuery.includes("subah") || lowerQuery.includes("morning")) {
    intent.timeContext = 'morning';
  } else if (lowerQuery.includes("evening") || lowerQuery.includes("shaam")) {
    intent.timeContext = 'evening';
  }

  // Urgency
  if (lowerQuery.includes("urgent") || lowerQuery.includes("emergency") || lowerQuery.includes("fast")) {
    intent.urgency = 'high';
  }

  // Budget
  if (lowerQuery.includes("cheap") || lowerQuery.includes("budget")) {
    intent.budget = 500;
  } else if (lowerQuery.includes("expensive") || lowerQuery.includes("premium")) {
    intent.budget = 2000;
  }

  // Preferences
  if (lowerQuery.includes("organic") || lowerQuery.includes("healthy")) {
    intent.preferences.push("organic");
  }
  if (lowerQuery.includes("local") || lowerQuery.includes("desi")) {
    intent.preferences.push("local");
  }

  // Keywords extraction
  const stopWords = ["ka", "ki", "ke", "ko", "se", "me", "ne", "hai", "the", "a", "an", "is", "are", "and", "or", "but"];
  intent.keywords = lowerQuery
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
    .slice(0, 5);

  return intent;
};

export function parseIntent(query: string) {
  const q = query.toLowerCase();

  return {
    keywords: q.split(" ").filter((w) => w.length > 2),
    category: q.includes("biryani") || q.includes("food")
      ? "food"
      : q.includes("doctor")
      ? "health"
      : undefined,
    openNow: q.includes("raat") || q.includes("night")
  };
}

export const matchIntentToVendors = async (intentQuery: IntentQuery, districtId: number): Promise<IntentMatch[]> => {
  // This would integrate with the existing vendor search logic
  // For now, return mock matches - in production, use vector similarity or ML models

  const matches: IntentMatch[] = [];

  // Mock implementation - replace with actual vendor matching logic
  // Based on keywords, intent, and vendor specialties

  return matches.slice(0, 10); // Top 10 matches
};

export const calculateIntentRelevance = (intentQuery: IntentQuery, vendorData: any): number => {
  // Implement the R = f(Intent_match, S_rank, Distance_real-time) formula

  let intentMatch = 0;

  // Check intent alignment
  if (intentQuery.intent === 'food' && vendorData.businessType === 'PRODUCT') {
    intentMatch += 0.3;
  }
  if (intentQuery.intent === 'service' && vendorData.businessType === 'SERVICE') {
    intentMatch += 0.3;
  }

  // Keyword matching in vendor description/specialties
  const vendorText = `${vendorData.name} ${vendorData.description} ${vendorData.specialties?.join(' ')}`.toLowerCase();
  const keywordMatches = intentQuery.keywords.filter(k =>
    vendorText.includes(k.toLowerCase())
  ).length;
  intentMatch += Math.min(keywordMatches * 0.1, 0.4);

  // Preference matching
  const preferenceMatches = intentQuery.preferences.filter(p =>
    vendorText.includes(p.toLowerCase())
  ).length;
  intentMatch += preferenceMatches * 0.1;

  // Sovereign rank (from brain service)
  const sovereignRank = vendorData.sovereignScore || 0.5;

  // Distance factor (mock - in reality use GPS)
  const distance = vendorData.distance || 5; // km
  const distanceFactor = Math.max(0, 1 - distance / 10); // Closer is better

  // Calculate final relevance
  const relevance = (0.4 * intentMatch) + (0.4 * sovereignRank) + (0.2 * distanceFactor);

  return Math.min(1, Math.max(0, relevance));
};
