// ========================================
// TRUTH ENGINE - BharatOS Constitution
// ========================================
// This file defines immutable truth invariants.
// NEVER INFER LIVE STATE from static data.
// Unknown must remain null, never false.
// ========================================

import { getStorage } from './storage-port';
import type { CommerceMetadata, DoctorMetadata, HospitalMetadata } from "../server/dto/metadata.contract";

import { calculateTrustLabel, type TrustAssessment } from "../server/lib/cognition/trust-label.engine";
type CompletenessInput = {
  phone?: string | null;
  locality?: string | null;
  businessHours?: unknown;
  specialization?: unknown;
  verification?: boolean | null;
};

function computeMetadataCompleteness(input: CompletenessInput) {
  const completenessWeights = {
    phone: 3,
    locality: 2,
    hours: 2,
    specialization: 3,
    verification: 3,
  };

  const hasPhone = input.phone != null;
  const hasLocality = input.locality != null;
  const hasHours = input.businessHours != null;
  const hasSpecialization = input.specialization != null;
  const hasVerification = input.verification === true;

  let score = 0;
  if (hasPhone) score += completenessWeights.phone;
  if (hasLocality) score += completenessWeights.locality;
  if (hasHours) score += completenessWeights.hours;
  if (hasSpecialization) score += completenessWeights.specialization;
  if (hasVerification) score += completenessWeights.verification;

  const totalWeight = Object.values(completenessWeights).reduce((a, b) => a + b, 0);
  const metadataCompletenessScore = totalWeight > 0 ? score / totalWeight : 0;

  return {
    metadataCompletenessScore,
    completenessRationale: {
      missingPhone: !hasPhone,
      missingLocality: !hasLocality,
      missingHours: !hasHours,
      missingSpecialization: !hasSpecialization,
      missingVerification: !hasVerification,
    }
  };
}

/**
 * ENTITY_DATA_THIN governance: Log when entity lacks essential truth signals
 * Never blocks - just marks thinness for observability and future governance
 */
// Thin entity classification: THIN (<0.3), PARTIAL (0.3-0.7), RICH (>0.7)
export type ThinEntityClass = "THIN" | "PARTIAL" | "RICH";

export async function auditThinEntity(entityType: string, entityId: number, districtId: number | null, thinReasons: string[], completenessScore: number, details?: any): Promise<void> {
  const classification: ThinEntityClass = completenessScore < 0.3 ? "THIN" : completenessScore < 0.7 ? "PARTIAL" : "RICH";
  try {
    await getStorage().prisma.auditLog.create({
      data: {
        action: "ENTITY_DATA_THIN",
        districtId,
        entityType,
        entityId,
        details: {
          thinReasons,
          completenessScore,
          classification,
          ...details
        },
      },
    });
  } catch {
    // Never block discovery on audit logging
  }
}

export async function auditMissingVendorName(vendor: any): Promise<void> {
  const name = typeof vendor?.name === "string" ? vendor.name.trim() : "";
  if (name) return;

  const districtId = typeof vendor?.districtId === "number" ? vendor.districtId : null;
  const vendorId = typeof vendor?.id === "number" ? vendor.id : null;
  if (!vendorId) return;

  try {
    await getStorage().prisma.auditLog.create({
      data: {
        action: "ENTITY_NAME_MISSING",
        districtId,
        entityType: "VENDOR",
        entityId: vendorId,
        details: {
          vendorId,
          districtId,
          slug: vendor?.slug ?? null,
          category: vendor?.category ?? null,
          businessType: vendor?.businessType ?? null,
        },
      },
    });
  } catch {
    // Never block discovery on audit logging
  }
}

export function getHumanTitleForVendor(vendor: any): string {
  const name = typeof vendor?.name === "string" ? vendor.name.trim() : "";
  if (name) return name;

  const title = typeof vendor?.title === "string" ? vendor.title.trim() : "";
  if (title) {
  // Audit hydration failures
  if (title === "Untitled") {
    const vid = typeof vendor?.id === 'number' ? vendor.id : null;
    if (vid) {
      void getStorage().prisma.auditLog.create({
        data: {
          action: "ENTITY_HYDRATION_FAILURE",
          entityType: "VENDOR",
          entityId: vid,
          details: {
            vendorId: vid,
            query: "unknown",
            title: title
          }
        }
      }).catch(err => {
        console.warn('HYDRATION_AUDIT_FAILURE', err instanceof Error ? err.message : String(err));
      });
    }
  }
    return title;
  }

  const businessName = typeof vendor?.businessName === "string" ? vendor.businessName.trim() : "";
  if (businessName) return businessName;

  return "Local Partner";
}



// ========================================
// STATIC TRUTH - Persisted Only
// NEVER INFER LIVE STATE from static data
// ========================================
export function hydrateDoctorMetadata(input: {
  doctor: any;
  vendor?: any;
}): DoctorMetadata & { metadataCompletenessScore: number } {
  const { doctor, vendor } = input;
  const isVerified = vendor?.status === "APPROVED" || vendor?.isVerified === true;

  const specialization = String(doctor?.specialization || "").trim() || null;
  const availabilityWindow = String(doctor?.timing || "").trim() || null;
  const hospitalAffiliation = String(vendor?.name || vendor?.slug || "").trim() || null;

  // Calculate completeness score for observability FIRST
  const completeness = computeMetadataCompleteness({
    phone: vendor?.phone || vendor?.mobile,
    locality: vendor?.locality,
    businessHours: availabilityWindow,
    specialization,
    verification: isVerified
  });

  const metadataCompletenessScore = completeness.metadataCompletenessScore;
  const completenessRationale = completeness.completenessRationale;

  // Thin entity detection: lacks title, contact, locality, metadata richness
  const thinReasons: string[] = [];
  if (!vendor?.name && !vendor?.title) thinReasons.push("no_title");
  if (!vendor?.phone && !vendor?.mobile) thinReasons.push("no_contact");
  if (!vendor?.locality) thinReasons.push("no_locality");
  if (!specialization) thinReasons.push("no_specialization");

  // Audit AFTER completeness calculation
  const vendorId = typeof vendor?.id === "number" ? vendor.id : null;
  const districtId = typeof vendor?.districtId === "number" ? vendor.districtId : null;
  if (vendorId && thinReasons.length > 0) {
    void auditThinEntity("DOCTOR", vendorId, districtId, thinReasons, metadataCompletenessScore, { doctorId: doctor?.id ?? null, vendorId }).catch(err => {
      console.warn('THIN_ENTITY_AUDIT_FAILURE', err instanceof Error ? err.message : String(err));
    });
  }

  return {
    doctorId: doctor?.id ?? null,
    vendorId,
    specialization,
    availabilityWindow,
    hospitalAffiliation,
    isVerified,
    metadataCompletenessScore,
    completenessRationale
  };
}

export async function hydrateHospitalMetadata(vendor: any): Promise<HospitalMetadata> {
  const isVerified = vendor?.status === "APPROVED" || vendor?.isVerified === true;
  const hospitalData = vendor?.hospitalData || {};

  const missingFields: string[] = [];

  // Only extract data that ACTUALLY EXISTS
  const emergency24x7 = typeof hospitalData?.is24x7 === "boolean" ? hospitalData.is24x7 : null;
  const icuAvailable = typeof hospitalData?.icuAvailable === "boolean" ? hospitalData.icuAvailable : null;
  const bloodBank = typeof hospitalData?.bloodBank === "boolean" ? hospitalData.bloodBank : null;
  const ambulance = (typeof hospitalData?.ambulanceService === "boolean" ? hospitalData.ambulanceService :
    typeof hospitalData?.hasAmbulance === "boolean" ? hospitalData.hasAmbulance : null);

  const insuranceSupport = Array.isArray(hospitalData?.insuranceSupport) && hospitalData.insuranceSupport.length > 0
    ? hospitalData.insuranceSupport
    : null;

  if (emergency24x7 === null) missingFields.push("emergency24x7");
  if (insuranceSupport === null) missingFields.push("insuranceSupport");

  const vendorId = typeof vendor?.id === "number" ? vendor.id : null;
  const districtId = typeof vendor?.districtId === "number" ? vendor.districtId : null;
  if (vendorId && missingFields.length > 0) {
    const completeness = computeMetadataCompleteness({
      phone: vendor?.phone || vendor?.mobile,
      locality: vendor?.locality,
      businessHours: null, // hospitals may not have standard hours
      specialization: null, // use existing metadata
      verification: vendor?.status === "APPROVED" || vendor?.isVerified === true
    });

    await auditThinEntity(
      "HOSPITAL",
      vendorId,
      districtId,
      missingFields,
      completeness.metadataCompletenessScore,
      { vendorId, slug: vendor?.slug ?? null }
    );
  }

  const completeness = computeMetadataCompleteness({
    phone: vendor?.phone || vendor?.mobile,
    locality: vendor?.locality,
    businessHours: null, // hospitals may not have standard hours
    specialization: null, // use existing metadata
    verification: vendor?.status === "APPROVED" || vendor?.isVerified === true
  });

  return {
    isVerified,
    phone: vendor?.phone || vendor?.mobile || null,
    locality: vendor?.locality || null,
    emergency24x7,
    icuAvailable,
    bloodBank,
    ambulance,
    insuranceSupport,
    metadataCompletenessScore: completeness.metadataCompletenessScore,
    completenessRationale: completeness.completenessRationale
  };
}

// ========================================
// COMPUTED TRUTH - Derived Truth
// ========================================
/**
 * HYDRATE VENDOR METADATA - P1 Metadata Density
 * Never hallucinate - return null for unknown data
 *
 * TRUTH INVARIANT: Never infer live state from static data
 * TRUTH INVARIANT: Unknown remains null, never false
 */
export function hydrateVendorMetadata(vendor: any, metadata: any): {
  specializations?: string[];
  businessHours?: any;
  consultationMode?: string;
  emergencyAvailable?: boolean;
  deliveryActive?: boolean;
  tags?: string[];
  trustAssessment: TrustAssessment;
  actionability: {
    canCall: boolean | null;
    canWhatsApp: boolean | null;
    canNavigate: boolean | null;
    canBook: boolean | null;
    canOrder: boolean | null;
  };
  openNow?: boolean | null;
  waitTime?: string | null;
  metadataCompletenessScore: number;
  completenessRationale: {
    missingPhone: boolean;
    missingHours: boolean;
    missingSpecialization: boolean;
    missingLocality: boolean;
    missingVerification: boolean;
  };
} {
  const vendorId = vendor?.id;
  if (!vendorId) {
    return {
      trustAssessment: {
        label: "COMMUNITY_LISTING",
        score: 0,
        factors: {
          dsslScore: 0,
          isVerified: false,
          metadataCompleteness: 0,
          dataFreshness: 0,
          activityRecency: 0,
          actionabilityScore: 0
        },
        confidence: 0,
        lastAssessed: new Date()
      },
      actionability: {
        canCall: null,
        canWhatsApp: null,
        canNavigate: null,
        canBook: null,
        canOrder: null,
      },
      metadataCompletenessScore: 0,
      completenessRationale: {
        missingPhone: true,
        missingHours: true,
        missingSpecialization: true,
        missingLocality: true,
        missingVerification: true
      }
    };
  }

  // Thin entity detection: lacks title, contact, locality, metadata richness
  const thinReasons: string[] = [];
  if (!vendor?.name && !vendor?.title) thinReasons.push("no_title");
  if (!vendor?.phone && !vendor?.mobile) thinReasons.push("no_contact");
  if (!vendor?.locality) thinReasons.push("no_locality");
  if (!metadata?.specializations?.length && !metadata?.businessHours && !metadata?.tags?.length) thinReasons.push("low_metadata_richness");

  // Calculate completeness score for observability FIRST
  const completeness = computeMetadataCompleteness({
    phone: vendor?.phone || vendor?.mobile,
    locality: vendor?.locality,
    businessHours: metadata?.businessHours,
    specialization: metadata?.specializations?.length > 0 ? metadata.specializations : vendor?.category,
    verification: vendor?.status === "APPROVED" || vendor?.isVerified === true
  });

  const metadataCompletenessScore = completeness.metadataCompletenessScore;
  const completenessRationale = completeness.completenessRationale;

  // Define has variables for actionability
  const hasPhone = vendor?.phone != null || vendor?.mobile != null;
  const hasLocality = vendor?.locality != null;
  const hasHours = metadata?.businessHours != null;
  const hasSpecialization = metadata?.specializations?.length > 0 || vendor?.category != null;
  const hasVerification = vendor?.status === "APPROVED" || vendor?.isVerified === true;

  // Audit AFTER completeness calculation
  const districtId = typeof vendor?.districtId === "number" ? vendor.districtId : null;
  if (thinReasons.length > 0) {
    void auditThinEntity("VENDOR", vendorId, districtId, thinReasons, metadataCompletenessScore, { vendorId }).catch(err => {
      console.warn('THIN_ENTITY_AUDIT_FAILURE', err instanceof Error ? err.message : String(err));
    });
  }

  // Calculate comprehensive trust assessment
  const trustAssessment = calculateTrustLabel(vendor, metadata);

  // Compute actionability (epistemically safe)
  const businessType = vendor?.businessType;
  const actionability = {
    canCall: hasPhone ? true : null, // true if contact exists, null if unknown
    canWhatsApp: (metadata?.whatsappNumber != null || (vendor?.whatsappNotifications && hasPhone)) ? true : null, // true if whatsapp possible, null if unknown
    canNavigate: vendor?.address != null ? true : null, // true if address exists, null if unknown
    canBook: businessType === "SERVICE" || businessType === "HEALTHCARE" ? true : businessType == null ? null : false, // verified positive, null if unknown, false if verified negative
    canOrder: businessType === "PRODUCT" || metadata?.deliveryActive === true ? true : businessType == null ? null : false, // verified positive, null if unknown, false if verified negative
  };
  // Return hydrated metadata (never fabricate unknown data)
  return {
    specializations: Array.isArray(metadata?.specializations) && metadata.specializations.length > 0 ? metadata.specializations : undefined,
    businessHours: metadata?.businessHours || undefined,
    consultationMode: metadata?.consultationMode || undefined,
    emergencyAvailable: metadata?.emergencyAvailable || undefined,
    deliveryActive: metadata?.deliveryActive || undefined,
    tags: Array.isArray(metadata?.tags) && metadata.tags.length > 0 ? metadata.tags : undefined,
    trustAssessment: { ...trustAssessment, factors: { ...trustAssessment.factors, metadataCompleteness: metadataCompletenessScore } },
    actionability,

    // ========================================
    // LIVE SIGNALS - Never Persisted
    // Must NEVER persist. Always null until verified.
    // ========================================
    openNow: null, // TRUTH INVARIANT: Never infer from businessHours
    waitTime: null, // TRUTH INVARIANT: Requires live operational data
    metadataCompletenessScore,
    completenessRationale
  };

  // ========================================
  // RUNTIME ASSERTIONS - Constitution Enforcement
  // ========================================

  const result = {
    specializations: metadata?.specializations || undefined,
    businessHours: metadata?.businessHours || undefined,
    consultationMode: metadata?.consultationMode || undefined,
    emergencyAvailable: metadata?.emergencyAvailable || undefined,
    deliveryActive: metadata?.deliveryActive || undefined,
    tags: Array.isArray(metadata?.tags) && metadata.tags.length > 0 ? metadata.tags : undefined,
    trustAssessment,
    actionability,
    openNow: null, // TRUTH INVARIANT: Never infer from businessHours
    waitTime: null, // TRUTH INVARIANT: Requires live operational data
    metadataCompletenessScore,
    completenessRationale
  };

  /**
   * TRUTH INVARIANT: Never infer live state from static data
   */
  if (result.openNow === true && !result.businessHours) {
    throw new Error("LIVE_SIGNAL_INVARIANT_VIOLATION: openNow=true without businessHours verification");
  }

  /**
   * TRUTH INVARIANT: Unknown remains null
   */
  if (result.openNow === false) {
    throw new Error("LIVE_SIGNAL_INVARIANT_VIOLATION: openNow=false instead of null for unknown state");
  }

  return result;
}

// FETCH: Async database access
export async function fetchVendorMetadata(vendorId: number): Promise<any> {
  try {
    const prisma = getStorage().prisma;
    return await prisma.vendorMetadata.findUnique({
      where: { vendorId }
    });
  } catch {
    // Metadata table may not exist yet - graceful degradation
    return null;
  }
}

// Export contract surface for enterprise governance
export {
  hydrateVendorMetadata as hydrateCommerceMetadata,
  computeMetadataCompleteness
};
