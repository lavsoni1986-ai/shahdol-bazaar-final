export interface BaseMetadata {
  phone?: string | null;
  locality?: string | null;
  isVerified: boolean;
  metadataCompletenessScore: number;
  // Completeness rationale (internal observability only)
  completenessRationale: {
    missingPhone: boolean;
    missingHours: boolean;
    missingSpecialization: boolean;
    missingLocality: boolean;
    missingVerification: boolean;
  };
}

export type AvailabilityStatus = "AVAILABLE_NOW" | "BY_APPOINTMENT" | "OFFLINE";

/**
 * SOVEREIGN TRUTH PRINCIPLE
 * 
 * Fields use null to represent "unknown/unverified" - NOT false or empty defaults.
 * 
 * GOOD: emergencySupport: null
 * BAD:  emergencySupport: false
 * 
 * This preserves data integrity and prevents hallucination.
 */

export interface DoctorMetadata extends BaseMetadata {
  specialization: string | null; // STATIC
  consultationMode: "VIRTUAL" | "IN_PERSON" | "HYBRID" | null; // STATIC
  availabilityWindow: string | null; // STATIC: declared availability
  hospitalAffiliation: string | null; // STATIC
  experienceYears: number | null; // STATIC
  languages: string[] | null; // STATIC
  // emergencySupport: LIVE SIGNAL - declared capability vs current availability
}

export interface HospitalMetadata extends BaseMetadata {
  emergency24x7: boolean | null; // STATIC: declares 24/7 emergency capability
  icuAvailable: boolean | null; // STATIC: facility has ICU
  bloodBank: boolean | null; // STATIC: service offered
  ambulance: boolean | null; // STATIC: service exists
  insuranceSupport: string[] | null; // STATIC: accepted insurances
  // NOTE: All above are STATIC capabilities, not current operational status
}

export interface PharmacyMetadata extends BaseMetadata {
  homeDelivery: boolean | null;
  is24x7: boolean | null;
}

export interface CommerceMetadata extends BaseMetadata {
  priceRange: "BUDGET" | "MID" | "PREMIUM" | null;
  deliverySupport: boolean | null; // STATIC: offers delivery service
  // openNow: LIVE SIGNAL - never store, always compute fresh from operational APIs
  // popularItems: LIVE SIGNAL - requires current sales data
}

// LIVE SIGNAL SEPARATION AUDIT - EXTREMELY IMPORTANT
//
// STATIC METADATA (persisted, never stale):
// - specialization (doctor)
// - hospitalAffiliation
// - emergency24x7 (declared capability, not current status)
// - icuAvailable (facility exists, not occupancy)
// - bloodBank (service offered, not current availability)
// - ambulance (service exists, not dispatch status)
// - deliverySupport (offers delivery, not current capacity)
// - businessHours (declared schedule)
//
// COMPUTED RUNTIME STATE (derived from static + context):
// - isVerified (from vendor.status)
// - metadataCompletenessScore (calculated from presence)
// - trustAssessment (computed from multiple signals)
// - actionability (canCall/canNavigate/etc from static data)
//
// LIVE OPERATIONAL SIGNALS (NEVER STORE - always fresh):
// - openNow (current operational status - require live API)
// - emergencyActive (current emergency response - require live feed)
// - queueEstimate (current wait time - require live data)
// - occupancyRate (current capacity - require live sensors)
// - whatsappOnline (current agent status - require live check)
//
// 🚨 ARCHITECTURAL WARNING: Never persist live signals as static truth
// Stale live state = trust violation

export type SovereignMetadata =
  | DoctorMetadata
  | HospitalMetadata
  | PharmacyMetadata
  | CommerceMetadata
  | BaseMetadata;
