// 🏛️ BHARAT-OS: ENTITY POLICY ENGINE
// ================================================================
// Defines operational behavior for each EntityKind.
//
// NO UI component should hardcode:
//   if (category === 'medical') then...
//   if (vendor.isHospital) then...
//
// Everything MUST go through this policy engine.
// ================================================================

import type { EntityKind } from "./entity-intelligence";

// ─── OPERATIONAL CAPABILITIES ────────────────────────────────────

export interface EntityPolicy {
    kind: EntityKind;

    // ── Commerce capabilities ──
    /** Can be purchased (Add to Cart / Buy Now) */
    purchasable: boolean;
    /** Can be booked (Book Service / Reserve Slot) */
    bookable: boolean;
    /** Supports consultation (Consult Now / Book Appointment) */
    consultation: boolean;
    /** Is returnable after purchase */
    returnable: boolean;

    // ── CTAs (Call to Action) ──
    /** Primary CTA label */
    primaryCTALabel: string;
    /** Secondary CTA label */
    secondaryCTALabel: string;
    /** Whether WhatsApp action is relevant */
    whatsappEnabled: boolean;
    /** Whether phone call action is relevant */
    callEnabled: boolean;
    /** Whether directions/maps action is relevant */
    directionsEnabled: boolean;
    /** Whether share action is relevant */
    shareEnabled: boolean;

    // ── Booking/Appointment ──
    /** Requires appointment scheduling */
    appointmentRequired: boolean;
    /** Supports time-slot booking */
    timeSlotsEnabled: boolean;
    /** Supports online booking */
    onlineBookingEnabled: boolean;

    // ── Emergency ──
    /** Has emergency contact/trigger */
    emergencyEnabled: boolean;
    /** Emergency CTA label */
    emergencyCTALabel?: string;

    // ── Display ──
    /** Show price on card */
    showPrice: boolean;
    /** Show rating on card */
    showRating: boolean;
    /** Show trust badge on card */
    showTrustBadge: boolean;
    /** Show stock/availability indicator */
    showAvailability: boolean;
    /** Show discount badge */
    showDiscountBadge: boolean;

    // ── Delivery/Fulfillment ──
    /** Supports delivery */
    deliveryEnabled: boolean;
    /** Supports pickup */
    pickupEnabled: boolean;
    /** Supports same-day delivery */
    sameDayDelivery: boolean;
}

// ─── POLICY DEFINITIONS ──────────────────────────────────────────
// Single source of truth — NO scattered conditionals.

export const ENTITY_POLICIES: Record<EntityKind, EntityPolicy> = {
    // ═══════════════════════════════════════════════════════════
    // PRODUCT — Physical goods for purchase
    // ═══════════════════════════════════════════════════════════
    product: {
        kind: "product",
        purchasable: true,
        bookable: false,
        consultation: false,
        returnable: true,
        primaryCTALabel: "Add to Cart",
        secondaryCTALabel: "Buy Now",
        whatsappEnabled: true,
        callEnabled: true,
        directionsEnabled: false,
        shareEnabled: true,
        appointmentRequired: false,
        timeSlotsEnabled: false,
        onlineBookingEnabled: false,
        emergencyEnabled: false,
        showPrice: true,
        showRating: true,
        showTrustBadge: true,
        showAvailability: true,
        showDiscountBadge: true,
        deliveryEnabled: true,
        pickupEnabled: true,
        sameDayDelivery: true,
    },

    // ═══════════════════════════════════════════════════════════
    // SERVICE — Bookable services (repair, plumber, cleaning)
    // ═══════════════════════════════════════════════════════════
    service: {
        kind: "service",
        purchasable: false,
        bookable: true,
        consultation: false,
        returnable: false,
        primaryCTALabel: "Book Service",
        secondaryCTALabel: "Call Provider",
        whatsappEnabled: true,
        callEnabled: true,
        directionsEnabled: true,
        shareEnabled: true,
        appointmentRequired: true,
        timeSlotsEnabled: true,
        onlineBookingEnabled: true,
        emergencyEnabled: false,
        showPrice: true,
        showRating: true,
        showTrustBadge: true,
        showAvailability: true,
        showDiscountBadge: false,
        deliveryEnabled: false,
        pickupEnabled: true,
        sameDayDelivery: false,
    },

    // ═══════════════════════════════════════════════════════════
    // PROFESSIONAL — Consultation-based (doctor, lawyer, tutor)
    // ═══════════════════════════════════════════════════════════
    professional: {
        kind: "professional",
        purchasable: false,
        bookable: false,
        consultation: true,
        returnable: false,
        primaryCTALabel: "Book Appointment",
        secondaryCTALabel: "Consult Now",
        whatsappEnabled: true,
        callEnabled: true,
        directionsEnabled: true,
        shareEnabled: true,
        appointmentRequired: true,
        timeSlotsEnabled: true,
        onlineBookingEnabled: true,
        emergencyEnabled: false,
        showPrice: true,
        showRating: true,
        showTrustBadge: true,
        showAvailability: true,
        showDiscountBadge: false,
        deliveryEnabled: false,
        pickupEnabled: false,
        sameDayDelivery: false,
    },

    // ═══════════════════════════════════════════════════════════
    // HEALTHCARE — Medical facilities (clinic, hospital, diagnostic)
    // ═══════════════════════════════════════════════════════════
    healthcare: {
        kind: "healthcare",
        purchasable: false,
        bookable: false,
        consultation: true,
        returnable: false,
        primaryCTALabel: "Book Consultation",
        secondaryCTALabel: "Emergency Call",
        whatsappEnabled: true,
        callEnabled: true,
        directionsEnabled: true,
        shareEnabled: true,
        appointmentRequired: true,
        timeSlotsEnabled: true,
        onlineBookingEnabled: true,
        emergencyEnabled: true,
        emergencyCTALabel: "🚨 Emergency",
        showPrice: false,
        showRating: true,
        showTrustBadge: true,
        showAvailability: true,
        showDiscountBadge: false,
        deliveryEnabled: false,
        pickupEnabled: false,
        sameDayDelivery: false,
    },

    // ═══════════════════════════════════════════════════════════
    // BOOKING — Reservation-based (hotel, salon, restaurant)
    // ═══════════════════════════════════════════════════════════
    booking: {
        kind: "booking",
        purchasable: false,
        bookable: true,
        consultation: false,
        returnable: false,
        primaryCTALabel: "Reserve Now",
        secondaryCTALabel: "Check Availability",
        whatsappEnabled: true,
        callEnabled: true,
        directionsEnabled: true,
        shareEnabled: true,
        appointmentRequired: false,
        timeSlotsEnabled: true,
        onlineBookingEnabled: true,
        emergencyEnabled: false,
        showPrice: true,
        showRating: true,
        showTrustBadge: true,
        showAvailability: true,
        showDiscountBadge: false,
        deliveryEnabled: false,
        pickupEnabled: false,
        sameDayDelivery: false,
    },

    // ═══════════════════════════════════════════════════════════
    // MARKETPLACE — Generic/fallback (mixed entity stores)
    // ═══════════════════════════════════════════════════════════
    marketplace: {
        kind: "marketplace",
        purchasable: false,
        bookable: false,
        consultation: false,
        returnable: false,
        primaryCTALabel: "Visit Store",
        secondaryCTALabel: "Contact",
        whatsappEnabled: true,
        callEnabled: true,
        directionsEnabled: true,
        shareEnabled: true,
        appointmentRequired: false,
        timeSlotsEnabled: false,
        onlineBookingEnabled: false,
        emergencyEnabled: false,
        showPrice: false,
        showRating: true,
        showTrustBadge: true,
        showAvailability: false,
        showDiscountBadge: false,
        deliveryEnabled: false,
        pickupEnabled: false,
        sameDayDelivery: false,
    },

    // ═══════════════════════════════════════════════════════════
    // EDUCATION — Schools, colleges, coaching centres
    // ═══════════════════════════════════════════════════════════
    education: {
        kind: "education",
        purchasable: false,
        bookable: true,
        consultation: false,
        returnable: false,
        primaryCTALabel: "Enquire Now",
        secondaryCTALabel: "Visit Campus",
        whatsappEnabled: true,
        callEnabled: true,
        directionsEnabled: true,
        shareEnabled: true,
        appointmentRequired: true,
        timeSlotsEnabled: false,
        onlineBookingEnabled: true,
        emergencyEnabled: false,
        showPrice: true,
        showRating: true,
        showTrustBadge: true,
        showAvailability: true,
        showDiscountBadge: false,
        deliveryEnabled: false,
        pickupEnabled: false,
        sameDayDelivery: false,
    },

    // ═══════════════════════════════════════════════════════════
    // EMERGENCY — Urgent response services
    // ═══════════════════════════════════════════════════════════
    emergency: {
        kind: "emergency",
        purchasable: false,
        bookable: false,
        consultation: false,
        returnable: false,
        primaryCTALabel: "🚨 Call Now",
        secondaryCTALabel: "Get Directions",
        whatsappEnabled: false,
        callEnabled: true,
        directionsEnabled: true,
        shareEnabled: false,
        appointmentRequired: false,
        timeSlotsEnabled: false,
        onlineBookingEnabled: false,
        emergencyEnabled: true,
        emergencyCTALabel: "🚨 EMERGENCY",
        showPrice: false,
        showRating: true,
        showTrustBadge: true,
        showAvailability: true,
        showDiscountBadge: false,
        deliveryEnabled: false,
        pickupEnabled: false,
        sameDayDelivery: false,
    },
};

// ─── POLICY ACCESSOR ─────────────────────────────────────────────

/**
 * Get operational policy for an entity kind.
 * Guaranteed to always return a policy (falls back to marketplace).
 */
export function getEntityPolicy(kind: EntityKind): EntityPolicy {
    return ENTITY_POLICIES[kind] ?? ENTITY_POLICIES.marketplace;
}

/**
 * Get primary CTA label for an entity kind.
 */
export function getPrimaryCTALabel(kind: EntityKind): string {
    return getEntityPolicy(kind).primaryCTALabel;
}

/**
 * Get secondary CTA label for an entity kind.
 */
export function getSecondaryCTALabel(kind: EntityKind): string {
    return getEntityPolicy(kind).secondaryCTALabel;
}

/**
 * Check if an entity kind supports a capability.
 */
export function hasCapability(
    kind: EntityKind,
    capability: keyof EntityPolicy,
): boolean {
    const policy = getEntityPolicy(kind);
    const value = policy[capability];
    return typeof value === "boolean" ? value : false;
}

// ─── POLICY VERSION ──────────────────────────────────────────────

export const ENTITY_POLICY_VERSION = "1.0.0";
export const ENTITY_POLICY_CREATED = "2026-05-22";

export const ENTITY_POLICY_GOVERNANCE = {
    /** Strict mode: every entity MUST have a policy */
    STRICT_MODE: true,
    /** Fallback policy if kind is unrecognized */
    FALLBACK_POLICY: "marketplace" as EntityKind,
    /** No policy overrides allowed in component code */
    COMPONENT_OVERRIDES_FORBIDDEN: true,
} as const;
