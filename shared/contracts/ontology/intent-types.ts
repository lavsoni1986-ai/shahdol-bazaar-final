// shared/contracts/ontology/intent-types.ts
// Canonical Intent Types - Single Source of Semantic Truth

export enum CanonicalIntentType {
  SEARCH = "SEARCH",
  DISCOVERY = "DISCOVERY",
  EMERGENCY = "EMERGENCY",
  NAVIGATION = "NAVIGATION",
  CONTACT = "CONTACT",
  BOOKING = "BOOKING"
}

export const CANONICAL_INTENT_TYPES = Object.values(CanonicalIntentType);