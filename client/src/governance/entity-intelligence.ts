// 🏛️ BHARAT-OS: ENTITY INTELLIGENCE GOVERNANCE
// ================================================================
// Canonical entity kind classification — SINGLE SOURCE OF TRUTH.
//
// This file defines WHAT an entity IS.
// NOT what the UI should DO with it (see entity-policies.ts).
//
// Every entity in the system must resolve to ONE EntityKind.
// NO entity falls through to "unknown" — use "marketplace" as default.
// ================================================================

/** Canonical entity kinds — every entity resolves to exactly one */
export type EntityKind =
    | "product"       // Physical goods: mobile, shirt, battery, groceries
    | "service"       // Bookable services: repair, plumber, electrician, cleaning
    | "professional"  // Consultation-based: doctor, lawyer, tutor, consultant
    | "healthcare"    // Medical facilities: clinic, hospital, diagnostic centre
    | "booking"       // Reservation-based: hotel, salon, appointment slots
    | "marketplace"   // Default/generic: multi-entity stores, unclassified
    | "education"     // Schools, colleges, coaching centres
    | "emergency";    // Urgent services: ambulance, fire, police, poison control

/** Detection signal weights used by the classifier */
export interface EntityDetectionSignals {
    /** Category/profession match (highest weight) */
    category: string[];
    /** Vendor business type override */
    vendorBusinessType?: string;
    /** Tags from metadata (shared/vendor-specific) */
    tags: string[];
    /** Keywords from title/description */
    keywords: string[];
    /** DSSL intelligence hints */
    dsslHints?: string[];
    /** Whether this entity has time-slot booking */
    hasBookingSlots?: boolean;
    /** Whether consultation mode is set */
    consultationMode?: string;
    /** Whether emergency contact exists */
    hasEmergencyContact?: boolean;
    /** Price field present (product indicator) */
    hasPrice?: boolean;
}

/** Result of entity classification */
export interface EntityClassificationResult {
    kind: EntityKind;
    confidence: number; // 0-1
    signals: string[]; // What triggered this classification
    alternatives: Array<{ kind: EntityKind; confidence: number }>;
}

// ─── ENTITY KIND METADATA ────────────────────────────────────────

export interface EntityKindMetadata {
    kind: EntityKind;
    label: string;
    labelHindi: string;
    plural: string;
    icon: string; // lucide icon name
    description: string;
    /** Default detection weight */
    baseWeight: number;
}

export const ENTITY_KIND_METADATA: Record<EntityKind, EntityKindMetadata> = {
    product: {
        kind: "product",
        label: "Product",
        labelHindi: "उत्पाद",
        plural: "Products",
        icon: "ShoppingBag",
        description: "Physical goods available for purchase",
        baseWeight: 0.9,
    },
    service: {
        kind: "service",
        label: "Service",
        labelHindi: "सेवा",
        plural: "Services",
        icon: "Wrench",
        description: "Bookable services including repairs and maintenance",
        baseWeight: 0.85,
    },
    professional: {
        kind: "professional",
        label: "Professional",
        labelHindi: "पेशेवर",
        plural: "Professionals",
        icon: "Stethoscope",
        description: "Consultation-based professionals (doctor, lawyer, tutor)",
        baseWeight: 0.85,
    },
    healthcare: {
        kind: "healthcare",
        label: "Healthcare",
        labelHindi: "स्वास्थ्य",
        plural: "Healthcare",
        icon: "Heart",
        description: "Medical facilities and healthcare providers",
        baseWeight: 0.9,
    },
    booking: {
        kind: "booking",
        label: "Booking",
        labelHindi: "बुकिंग",
        plural: "Bookings",
        icon: "Calendar",
        description: "Reservation-based services (salon, hotel, appointments)",
        baseWeight: 0.8,
    },
    marketplace: {
        kind: "marketplace",
        label: "Marketplace",
        labelHindi: "बाज़ार",
        plural: "Marketplace",
        icon: "Store",
        description: "Generic storefront with mixed entity types",
        baseWeight: 0.6,
    },
    education: {
        kind: "education",
        label: "Education",
        labelHindi: "शिक्षा",
        plural: "Education",
        icon: "GraduationCap",
        description: "Educational institutions and coaching centres",
        baseWeight: 0.85,
    },
    emergency: {
        kind: "emergency",
        label: "Emergency",
        labelHindi: "आपातकालीन",
        plural: "Emergency Services",
        icon: "Ambulance",
        description: "Urgent response services (ambulance, fire, police)",
        baseWeight: 0.95,
    },
};

// ─── CATEGORY-TO-KIND MAPPING ────────────────────────────────────
// Single registry — NO scattered if/else in components.

export interface CategoryMapping {
    patterns: RegExp[];
    kind: EntityKind;
    priority: number; // Higher = more specific match
}

export const CATEGORY_KIND_MAPPINGS: CategoryMapping[] = [
    // ── Products ──
    { patterns: [/^electronics$/i, /^mobiles?$/i, /^clothing$/i, /^grocery$/i, /^kirana$/i, /^fashion$/i, /^accessories$/i, /^food$/i, /^beverages$/i, /^household$/i], kind: "product", priority: 10 },
    // ── Services ──
    { patterns: [/^repair$/i, /^plumb(er|ing)$/i, /^electric(al|ian)$/i, /^cleaning$/i, /^maintenance$/i, /^carpenter$/i, /^mechanic$/i, /^salon$/i, /^beaut(y|ician)/i, /^tailor$/i], kind: "service", priority: 20 },
    // ── Professionals ──
    { patterns: [/^doctor/i, /^physician/i, /^specialist/i, /^consultant/i, /^legal$/i, /^lawyer$/i, /^advocate$/i, /^tutor$/i, /^coach(ing)?$/i, /^counsell(or|ing)$/i, /^dietitian$/i, /^nutritionist$/i, /^therapist$/i], kind: "professional", priority: 20 },
    // ── Healthcare ──
    { patterns: [/^hospital/i, /^clinic/i, /^diagnostic/i, /^pathology/i, /^medical$/i, /^pharmacy/i, /^dental/i, /^eye$/i, /^optical$/i], kind: "healthcare", priority: 20 },
    // ── Booking ──
    { patterns: [/^hotel/i, /^resort/i, /^lodge$/i, /^guest.?house/i, /^salon$/i, /^spa$/i, /^restaurant/i, /^dining$/i], kind: "booking", priority: 15 },
    // ── Education ──
    { patterns: [/^school/i, /^college/i, /^university/i, /^academy/i, /^institute/i, /^coaching$/i, /^tuition/i, /^education$/i], kind: "education", priority: 20 },
    // ── Emergency ──
    { patterns: [/^ambulance/i, /^emergency/i, /^fire.?brigade/i, /^police$/i, /^disaster/i, /^rescue/i, /^poison/i, /^first.?aid/i], kind: "emergency", priority: 30 },
];

// ─── VENDOR BUSINESS TYPE MAPPINGS ───────────────────────────────

export const BUSINESS_TYPE_KIND_MAP: Record<string, EntityKind> = {
    PRODUCT: "product",
    SERVICE: "service",
    PROFESSIONAL: "professional",
    HEALTHCARE: "healthcare",
    BOOKING: "booking",
    EDUCATION: "education",
    EMERGENCY: "emergency",
    HOSPITAL: "healthcare",
    CLINIC: "healthcare",
    DOCTOR: "professional",
    SCHOOL: "education",
    RETAIL: "product",
    WHOLESALE: "product",
    MANUFACTURING: "product",
};

// ─── KEYWORD DETECTION PATTERNS ──────────────────────────────────

export const KEYWORD_KIND_PATTERNS: Array<{ patterns: RegExp[]; kind: EntityKind; priority: number }> = [
    // Product indicators
    { patterns: [/price/i, /\b₹\d/i, /rs\.?\s*\d/i, /buy/i, /purchase/i, /mrp/i, /\best\-?\s*\d/i, /emi/i, /stock/i, /shipping/i, /delivery/i, /\bsize\b/i, /\bcolor\b/i], kind: "product", priority: 10 },
    // Service indicators
    { patterns: [/repair/i, /fix/i, /service.?charge/i, /booking.*fee/i, /visit.*charge/i, /call.?out/i, /inspection/i], kind: "service", priority: 15 },
    // Professional indicators
    { patterns: [/consultation/i, /appointment/i, /fees?/i, /qualification/i, /experience/i, /specialization/i, /opd/i, /clinic.*timing/i], kind: "professional", priority: 15 },
    // Healthcare indicators
    { patterns: [/opd/i, /bed/i, /emergency/i, /ambulance/i, /24.?7/i, /icu/i, /ward/i, /diagnostic/i, /lab.?test/i], kind: "healthcare", priority: 15 },
    // Booking indicators
    { patterns: [/check.?in/i, /check.?out/i, /room/i, /table/i, /slot/i, /reservation/i, /availability/i, /capacity/i], kind: "booking", priority: 12 },
    // Emergency indicators
    { patterns: [/emergency.*contact/i, /helpline/i, /toll.?free/i, /24.?7.?emergency/i, /ambulance.*number/i, /emergency.?response/i], kind: "emergency", priority: 25 },
    // Education indicators
    { patterns: [/admission/i, /course/i, /batch/i, /curriculum/i, /board/i, /affiliated/i, /faculty/i, /class.?room/i], kind: "education", priority: 15 },
];

// ─── CONSTANTS ───────────────────────────────────────────────────

export const ENTITY_INTELLIGENCE_VERSION = "1.0.0";
export const ENTITY_INTELLIGENCE_CREATED = "2026-05-22";
export const ENTITY_INTELLIGENCE_GOVERNANCE = {
    STRICT_MODE: true, // Every entity MUST resolve to a kind
    FALLBACK_KIND: "marketplace" as EntityKind,
    MIN_CONFIDENCE_THRESHOLD: 0.3,
};
