// DEPRECATED AUTHORITY - DO NOT USE FOR NEW LOGIC
// Sovereign Entity Normalization Layer
// Ensures semantic consistency across all cognition and UI
// This file is frozen. New semantic logic must use shared/contracts/ontology

// Canonical Business Type Taxonomy
// This is the SINGLE SOURCE OF TRUTH for business categorization
export enum CanonicalBusinessType {
  HEALTHCARE = "HEALTHCARE",
  EDUCATION = "EDUCATION",
  FOOD = "FOOD",
  TRANSPORT = "TRANSPORT",
  RETAIL = "RETAIL",
  HOSPITALITY = "HOSPITALITY",
  FINANCIAL = "FINANCIAL",
  PROFESSIONAL = "PROFESSIONAL",
  ENTERTAINMENT = "ENTERTAINMENT",
  OTHER = "OTHER"
}

// Legacy Business Type Mapping
// Maps all DB values to canonical taxonomy
export const BUSINESS_TYPE_MAPPING: Record<string, CanonicalBusinessType> = {
  // Healthcare variants
  "HOSPITAL": CanonicalBusinessType.HEALTHCARE,
  "CLINIC": CanonicalBusinessType.HEALTHCARE,
  "DOCTOR": CanonicalBusinessType.HEALTHCARE,
  "DENTAL": CanonicalBusinessType.HEALTHCARE,
  "PHARMACY": CanonicalBusinessType.HEALTHCARE,
  "DIAGNOSTIC": CanonicalBusinessType.HEALTHCARE,
  "HEALTHCARE": CanonicalBusinessType.HEALTHCARE,

  // Education variants
  "SCHOOL": CanonicalBusinessType.EDUCATION,
  "COLLEGE": CanonicalBusinessType.EDUCATION,
  "COACHING": CanonicalBusinessType.EDUCATION,
  "EDUCATION": CanonicalBusinessType.EDUCATION,
  "TRAINING": CanonicalBusinessType.EDUCATION,

  // Food variants
  "RESTAURANT": CanonicalBusinessType.FOOD,
  "HOTEL": CanonicalBusinessType.FOOD,
  "CAFE": CanonicalBusinessType.FOOD,
  "FOOD": CanonicalBusinessType.FOOD,

  // Transport variants
  "TRANSPORT": CanonicalBusinessType.TRANSPORT,
  "BUS": CanonicalBusinessType.TRANSPORT,
  "TAXI": CanonicalBusinessType.TRANSPORT,
  "AUTO": CanonicalBusinessType.TRANSPORT,

  // Retail variants
  "SHOP": CanonicalBusinessType.RETAIL,
  "STORE": CanonicalBusinessType.RETAIL,
  "MART": CanonicalBusinessType.RETAIL,
  "RETAIL": CanonicalBusinessType.RETAIL,
  "GROCERY": CanonicalBusinessType.RETAIL,

  // Hospitality variants
  "HOTEL": CanonicalBusinessType.HOSPITALITY,
  "LODGE": CanonicalBusinessType.HOSPITALITY,
  "RESORT": CanonicalBusinessType.HOSPITALITY,

  // Default fallback
  "OTHER": CanonicalBusinessType.OTHER
};

// Canonical normalization function
export function normalizeBusinessType(rawBusinessType?: string | null): CanonicalBusinessType {
  if (!rawBusinessType) return CanonicalBusinessType.OTHER;

  const normalized = rawBusinessType.toUpperCase().trim();
  return BUSINESS_TYPE_MAPPING[normalized] || CanonicalBusinessType.OTHER;
}

// Canonical Entity Interface
export interface CanonicalEntity {
  id: number | string;
  name: string;
  businessType: CanonicalBusinessType; // NEVER use raw DB value
  category?: string;
  description?: string;
  districtId: number;
  // Add other canonical fields as needed
}

// Entity normalization function
export function normalizeEntity(rawEntity: any): CanonicalEntity {
  return {
    id: rawEntity.id,
    name: rawEntity.name,
    businessType: normalizeBusinessType(rawEntity.businessType),
    category: rawEntity.category,
    description: rawEntity.description,
    districtId: rawEntity.districtId
  };
}