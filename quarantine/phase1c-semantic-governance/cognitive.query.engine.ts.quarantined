import { normalizeQueryLegacy } from "../lib/cognition/normalize";

export interface CognitiveParse {
  normalized: string;
  domain: string | null;
  entity: string | null;
  temporal: string | null;
  urgency: string | null;
  actionability: string | null;
  fulfillment: string | null;
  confidence: number;
  searchTerms: string[];
  responseMode: "DIRECT_MATCH" | "FOLLOWUP_REQUIRED" | "SUPPLY_GAP" | "DISCOVERY_ASSIST" | "EMERGENCY_ESCALATION";
}

export function cognitiveParseQuery(message: string): CognitiveParse {
  const raw = normalizeQueryLegacy(message);

  let domain: string | null = null;
  let entity: string | null = null;
  let temporal: string | null = null;
  let urgency: string | null = null;
  let actionability: string | null = null;
  let fulfillment: string | null = null;

  const terms = raw.split(/\s+/).filter(Boolean);
  const searchTerms = new Set<string>([raw, ...terms]);

  // DOMAIN + ENTITY
  if (/doctor|hospital|medical|clinic|blood|medicine/.test(raw)) {
    domain = "HEALTHCARE";
    entity = "MEDICAL_SERVICE";
    searchTerms.add("hospital");
    searchTerms.add("medical");
    searchTerms.add("clinic");
  } else if (/food|samosa|restaurant|hotel|snacks|meal/.test(raw)) {
    domain = "FOOD";
    entity = "FOOD_VENDOR";
    searchTerms.add("restaurant");
    searchTerms.add("snacks");
    searchTerms.add("hotel");
  } else if (/bus|travel|ticket|train|transport/.test(raw)) {
    domain = "TRANSPORT";
    entity = "TRAVEL_SERVICE";
    searchTerms.add("travel");
    searchTerms.add("transport");
    searchTerms.add("ticket");
  } else if (/mobile|repair|electronics|phone/.test(raw)) {
    domain = "ELECTRONICS";
    entity = "REPAIR_OR_DEVICE";
    searchTerms.add("repair");
    searchTerms.add("electronics");
    searchTerms.add("phone");
    // Deterministic electronics semantic augmentation (Phase 1C-A)
    // Add explicit taxonomy-backed semantic keys in searchTerms for downstream routing.
    const lower = raw.toLowerCase();
    const repairTokens = ['repair','fix','broken','service center','repair shop','screen','battery','replacement','not working'];
    const commerceTokens = ['buy','shop','showroom','store','price','sell','dealer','buying','purchase'];
    const hasRepair = repairTokens.some(t => lower.includes(t));
    const hasCommerce = commerceTokens.some(t => lower.includes(t));

    if (hasRepair && !hasCommerce) {
      // Strong repair signal
      searchTerms.add('electronics.repair');
    } else if (hasCommerce && !hasRepair) {
      // Strong commerce/store signal
      searchTerms.add('electronics.store');
    } else {
      // Ambiguous or generic 'electronics' — include both to aid migration but prefer store in ranking
      searchTerms.add('electronics.store');
      searchTerms.add('electronics.repair');
    }
  } else {
    domain = "GENERAL";
    entity = "DISCOVERY";
  }

  // TEMPORAL
  if (/raat|night|24|urgent|abhi/.test(raw)) {
    temporal = "IMMEDIATE";
    urgency = "HIGH";
  } else {
    temporal = "NORMAL";
    urgency = "MEDIUM";
  }

  // ACTIONABILITY
  if (/chahiye|bhejo|book|call|urgent|abhi/.test(raw)) {
    actionability = "TRANSACTION";
  } else {
    actionability = "DISCOVERY";
  }

  // FULFILLMENT
  if (domain === "HEALTHCARE") fulfillment = "SHOW_TRUSTED_HEALTH_OPTIONS";
  else if (domain === "FOOD") fulfillment = "SHOW_OPEN_FOOD_OPTIONS";
  else if (domain === "TRANSPORT") fulfillment = "SHOW_TRAVEL_OPTIONS";
  else if (domain === "ELECTRONICS") fulfillment = "SHOW_REPAIR_SHOPS";
  else fulfillment = "SHOW_DISCOVERY_RESULTS";

  let responseMode: CognitiveParse['responseMode'] = "DIRECT_MATCH";

  // Detect ambiguous queries
  if (raw === "mobile" || raw === "doctor" || raw === "bus" || raw === "food") {
    responseMode = "FOLLOWUP_REQUIRED";
  }

  // Emergency escalation
  if (urgency === "HIGH" && domain === "HEALTHCARE") {
    responseMode = "EMERGENCY_ESCALATION";
  }

  return {
    normalized: raw,
    domain,
    entity,
    temporal,
    urgency,
    actionability,
    fulfillment,
    confidence: 0.82,
    searchTerms: Array.from(searchTerms),
    responseMode
  };
}

export function buildFollowup(cognition: CognitiveParse): string {
  if (cognition.responseMode === "FOLLOWUP_REQUIRED") {
    if (cognition.domain === "ELECTRONICS") {
      return "Aap mobile repair, mobile shop, ya recharge service dhoond rahe hain?";
    }
    if (cognition.domain === "HEALTHCARE") {
      return "Aap doctor, hospital, ya medical store dhoond rahe hain?";
    }
    if (cognition.domain === "TRANSPORT") {
      return "Bus booking, taxi, ya travel agent chahiye?";
    }
    if (cognition.domain === "FOOD") {
      return "Snacks, restaurant, ya hotel dhoond rahe hain?";
    }
  }
  if (cognition.responseMode === "SUPPLY_GAP") {
    if (cognition.domain === "FOOD") {
      return "Verified food vendors abhi onboard nahi hain. Kya aap nearby snacks, restaurant, ya tea stalls explore karna chahenge?";
    }
    if (cognition.domain === "HEALTHCARE") {
      return "Verified medical services abhi available nahi hain. Emergency ke liye nearby hospital ya clinic check kar sakte hain.";
    }
    if (cognition.domain === "TRANSPORT") {
      return "Verified transport services abhi onboard nahi hain. Bus ya travel options ke liye nearby station check kar sakte hain.";
    }
    if (cognition.domain === "ELECTRONICS") {
      return "Verified repair shops abhi available nahi hain. Nearby electronics stores explore kar sakte hain.";
    }
  }
  if (cognition.responseMode === "EMERGENCY_ESCALATION") {
    return "Emergency detected. Nearest verified support aur hospitals dikha raha hoon.";
  }
  return "Kya aap similar services ya nearby categories explore karna chahenge?";
}