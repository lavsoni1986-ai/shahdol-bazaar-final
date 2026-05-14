/**
 * Category Mapper
 * Maps user query keywords to vendor category ENUM values
 */

export const CATEGORY_MAP: Record<string, string> = {
  // Food → GROCERY vendors sell food
  biryani: "GROCERY",
  food: "GROCERY",
  restaurant: "GROCERY",
  pizza: "GROCERY",
  burger: "GROCERY",
  meal: "GROCERY",
  khana: "GROCERY",
  eat: "GROCERY",

  // Grocery
  kirana: "GROCERY",
  grocery: "GROCERY",
  supermarket: "GROCERY",
  store: "GROCERY",
  shop: "GROCERY",
  market: "GROCERY",
  fresh: "GROCERY",
  vegetables: "GROCERY",

  // Hospital/Health
  doctor: "HOSPITAL",
  hospital: "HOSPITAL",
  clinic: "HOSPITAL",
  health: "HOSPITAL",
  medical: "HOSPITAL",
  medicine: "HOSPITAL",
  dentist: "HOSPITAL",
  emergency: "HOSPITAL",

  // Pharmacy
  pharmacy: "PHARMACY",
  chemist: "PHARMACY",
  drugs: "PHARMACY",

  // Services
  service: "SERVICE",
  plumber: "SERVICE",
  electrician: "SERVICE",
  carpenter: "SERVICE",
  repair: "SERVICE",
  maintenance: "SERVICE",
  cleaning: "SERVICE",
  mobile: "SERVICE",
  ac: "SERVICE",
  fridge: "SERVICE",

  // Education
  school: "EDUCATION",
  education: "EDUCATION",
  coaching: "EDUCATION",
  college: "EDUCATION",
  learning: "EDUCATION",

  // Transport
  bus: "TRANSPORT",
  transport: "TRANSPORT",
  taxi: "TRANSPORT",
  auto: "TRANSPORT",
  travel: "TRANSPORT",
  rewa: "TRANSPORT",
  jabalpur: "TRANSPORT",

  // Retail / General
  // Fix corruption: jewellers and electronics should not map to GROCERY by default.
  // jewellers will map to RETAIL (preserves intent) and electronics is left intentionally unmapped
  // to let resolver pipeline decide between electronics.store and electronics.repair.
  jewellers: "RETAIL",
  // electronics intentionally omitted from default map to avoid corruption
  // electronics: "GROCERY" // fallback (REMOVED)
};

export function mapCategory(input: string): string | null {
  if (!input) return null;
  const normalized = input.toLowerCase().trim();
  return CATEGORY_MAP[normalized] || null;
}

export function extractIntentKeywords(query: string): string[] {
  const stopWords = ['ka', 'ki', 'ke', 'ko', 'se', 'me', 'ne', 'hai', 'the', 'a', 'an', 'is', 'are', 'and', 'or', 'but', 'in', 'to', 'for', 'of', 'with'];
  return query.toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
    .slice(0, 5);
}
