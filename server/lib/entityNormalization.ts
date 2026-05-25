// DEPRECATED AUTHORITY - DO NOT USE FOR NEW LOGIC
// Sovereign Entity Normalization Layer
// Ensures semantic consistency across all cognition and UI
// This file is frozen. New semantic logic must use shared/contracts/ontology

// Canonical Business Type Taxonomy
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

// Legacy Business Type Mapping - single source mapping, NO duplicate keys
export const BUSINESS_TYPE_MAPPING: Record<string, CanonicalBusinessType> = {
  "HOSPITAL": CanonicalBusinessType.HEALTHCARE,
  "CLINIC": CanonicalBusinessType.HEALTHCARE,
  "DOCTOR": CanonicalBusinessType.HEALTHCARE,
  "DENTAL": CanonicalBusinessType.HEALTHCARE,
  "PHARMACY": CanonicalBusinessType.HEALTHCARE,
  "DIAGNOSTIC": CanonicalBusinessType.HEALTHCARE,
  "HEALTHCARE": CanonicalBusinessType.HEALTHCARE,
  "SCHOOL": CanonicalBusinessType.EDUCATION,
  "COLLEGE": CanonicalBusinessType.EDUCATION,
  "COACHING": CanonicalBusinessType.EDUCATION,
  "EDUCATION": CanonicalBusinessType.EDUCATION,
  "TRAINING": CanonicalBusinessType.EDUCATION,
  "RESTAURANT": CanonicalBusinessType.FOOD,
  "HOTEL": CanonicalBusinessType.FOOD,
  "CAFE": CanonicalBusinessType.FOOD,
  "FOOD": CanonicalBusinessType.FOOD,
  "TRANSPORT": CanonicalBusinessType.TRANSPORT,
  "BUS": CanonicalBusinessType.TRANSPORT,
  "TAXI": CanonicalBusinessType.TRANSPORT,
  "AUTO": CanonicalBusinessType.TRANSPORT,
  "SHOP": CanonicalBusinessType.RETAIL,
  "STORE": CanonicalBusinessType.RETAIL,
  "MART": CanonicalBusinessType.RETAIL,
  "RETAIL": CanonicalBusinessType.RETAIL,
  "GROCERY": CanonicalBusinessType.RETAIL,
  "LODGE": CanonicalBusinessType.HOSPITALITY,
  "RESORT": CanonicalBusinessType.HOSPITALITY,
  "INN": CanonicalBusinessType.HOSPITALITY,
  "GUESTHOUSE": CanonicalBusinessType.HOSPITALITY,
  "OTHER": CanonicalBusinessType.OTHER
};

export function normalizeBusinessType(rawBusinessType?: string | null): CanonicalBusinessType {
  if (!rawBusinessType) return CanonicalBusinessType.OTHER;
  const normalized = rawBusinessType.toUpperCase().trim();
  return BUSINESS_TYPE_MAPPING[normalized] || CanonicalBusinessType.OTHER;
}

export interface CanonicalEntity {
  id: number | string;
  name: string;
  businessType: CanonicalBusinessType;
  category?: string;
  description?: string;
  districtId: number;
}

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
