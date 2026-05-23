// 🏛️ BHARAT-OS: CANONICAL CTA RESOLVER — SOVEREIGN INTERACTION GOVERNANCE
// ================================================================
// SINGLE AUTHORITY for ALL CTA rendering, interaction semantics,
// action orchestration, and entity behavior.
//
// This is NOT just UI.
// This is the operational intent gateway for:
//   - AI orchestration
//   - workflow routing
//   - autonomous operations
//   - district cognition
//   - trust graph execution
//
// CRITICAL RULES:
// ❌ NO hardcoded CTA text in components
// ❌ NO category hacks (category === "medical")
// ❌ NO duplicated CTA logic across components
// ❌ NO Add To Cart on services/healthcare/professionals
// ❌ NO commerce assumptions for non-product entities
//
// Every UI component MUST consume resolveEntityCTAs().
// ================================================================

// ─── PHASE 1: CANONICAL ENTITY KINDS ──────────────────────────────

/**
 * Canonical entity kinds — every entity resolves to exactly one.
 * This is the SINGLE source of truth for entity identity.
 */
export type EntityKind =
    | "product"        // Physical goods: mobile, shirt, battery, groceries, kirana
    | "service"        // Bookable services: repair, plumber, electrician, cleaning
    | "professional"   // Consultation-based: doctor, lawyer, tutor, consultant, architect
    | "healthcare"     // Medical facilities: clinic, hospital, diagnostic centre, dental
    | "booking"        // Reservation-based: hotel, salon, spa, accommodation
    | "education"      // Schools, colleges, coaching centres, tuition
    | "restaurant"     // Food & dining: restaurant, cafe, dhaba, fast food, cloud kitchen
    | "marketplace"    // Default/generic: multi-entity stores, unclassified
    | "emergency";     // Urgent services: ambulance, fire, police, poison control

// ─── PHASE 2: CANONICAL CTA ACTIONS ──────────────────────────────

/**
 * Canonical CTA actions — every interaction resolves to exactly one.
 * NO component should reference these strings via hardcoded labels.
 * Use the metadata registry (CTA_METADATA) for display values.
 */
export type EntityCTA =
    | "add_to_cart"
    | "buy_now"
    | "book_service"
    | "book_appointment"
    | "consult_now"
    | "call_now"
    | "whatsapp"
    | "get_directions"
    | "enroll_now"
    | "order_food"
    | "request_callback";

// ─── PHASE 4: INTERACTION MODES ──────────────────────────────────

/**
 * Interaction modes define the OPERATIONAL SEMANTICS of an action.
 * This becomes the foundation for autonomous orchestration.
 *
 * - commerce:    Financial transaction (buy, add_to_cart)
 * - booking:     Time/resource reservation (book_service, book_appointment)
 * - consultation:Expert advice session (consult_now)
 * - emergency:   Urgent real-time response (call_now with urgency)
 * - inquiry:     Information request (request_callback, whatsapp)
 * - enrollment:  Registration/admission (enroll_now)
 */
export type InteractionMode =
    | "commerce"
    | "booking"
    | "consultation"
    | "emergency"
    | "inquiry"
    | "enrollment";

// ─── PHASE 5: CTA METADATA ───────────────────────────────────────

export interface CTAMetadata {
    /** Canonical action identifier */
    id: EntityCTA;
    /** Human-readable label (localizable) */
    label: string;
    /** Lucide icon name for UI rendering */
    icon: string;
    /** Operational semantics */
    interactionType: InteractionMode;
    /** Whether the user must be authenticated */
    requiresAuth: boolean;
    /** Whether a time-slot booking is required */
    requiresBooking: boolean;
    /** Analytics event name for tracking */
    analyticsEvent: string;
    /** Optional short description for tooltips/aria */
    description?: string;
}

/**
 * Canonical CTA metadata registry — SINGLE SOURCE OF TRUTH.
 * ALL CTA display values come from here. NO hardcoded labels.
 */
export const CTA_METADATA: Record<EntityCTA, CTAMetadata> = {
    add_to_cart: {
        id: "add_to_cart",
        label: "Add to Cart",
        icon: "ShoppingCart",
        interactionType: "commerce",
        requiresAuth: false,
        requiresBooking: false,
        analyticsEvent: "add_to_cart",
        description: "Add this product to your shopping cart",
    },
    buy_now: {
        id: "buy_now",
        label: "Buy Now",
        icon: "Zap",
        interactionType: "commerce",
        requiresAuth: false,
        requiresBooking: false,
        analyticsEvent: "buy_now",
        description: "Purchase this item immediately",
    },
    book_service: {
        id: "book_service",
        label: "Book Service",
        icon: "CalendarCheck",
        interactionType: "booking",
        requiresAuth: true,
        requiresBooking: true,
        analyticsEvent: "book_service",
        description: "Schedule this service at your preferred time",
    },
    book_appointment: {
        id: "book_appointment",
        label: "Book Appointment",
        icon: "Calendar",
        interactionType: "booking",
        requiresAuth: true,
        requiresBooking: true,
        analyticsEvent: "book_appointment",
        description: "Schedule an appointment with this professional",
    },
    consult_now: {
        id: "consult_now",
        label: "Consult Now",
        icon: "MessageSquare",
        interactionType: "consultation",
        requiresAuth: false,
        requiresBooking: false,
        analyticsEvent: "consult_now",
        description: "Start a consultation immediately",
    },
    call_now: {
        id: "call_now",
        label: "Call",
        icon: "Phone",
        interactionType: "inquiry",
        requiresAuth: false,
        requiresBooking: false,
        analyticsEvent: "call_now",
        description: "Call this entity directly",
    },
    whatsapp: {
        id: "whatsapp",
        label: "WhatsApp",
        icon: "MessageCircle",
        interactionType: "inquiry",
        requiresAuth: false,
        requiresBooking: false,
        analyticsEvent: "whatsapp_click",
        description: "Send a WhatsApp message",
    },
    get_directions: {
        id: "get_directions",
        label: "Get Directions",
        icon: "MapPin",
        interactionType: "inquiry",
        requiresAuth: false,
        requiresBooking: false,
        analyticsEvent: "get_directions",
        description: "Navigate to this location",
    },
    enroll_now: {
        id: "enroll_now",
        label: "Enroll Now",
        icon: "GraduationCap",
        interactionType: "enrollment",
        requiresAuth: true,
        requiresBooking: true,
        analyticsEvent: "enroll_now",
        description: "Enroll in this course or program",
    },
    order_food: {
        id: "order_food",
        label: "Order Food",
        icon: "UtensilsCrossed",
        interactionType: "commerce",
        requiresAuth: false,
        requiresBooking: false,
        analyticsEvent: "order_food",
        description: "Order food from this restaurant",
    },
    request_callback: {
        id: "request_callback",
        label: "Request Callback",
        icon: "PhoneCall",
        interactionType: "inquiry",
        requiresAuth: true,
        requiresBooking: false,
        analyticsEvent: "request_callback",
        description: "Request a callback from this institution",
    },
};

// ─── PHASE 3: GOVERNANCE POLICIES — DETERMINISTIC MAPPING ────────

/**
 * EntityCTAPolicy defines what actions are available for an entity kind.
 * This is the DETERMINISTIC mapping — NO string parsing, NO conditional logic.
 */
export interface EntityCTAPolicy {
    kind: EntityKind;
    /** Primary CTA — the most important action */
    primaryCTA: EntityCTA;
    /** Secondary CTA — complementary action */
    secondaryCTA: EntityCTA;
    /** All allowed CTA actions in priority order */
    allowedActions: EntityCTA[];
    /** Dominant interaction mode for this entity kind */
    interactionMode: InteractionMode;
    /** Whether commerce-related display is applicable (price, discount, COD, return) */
    hasCommerceDisplay: boolean;
    /** Whether booking/appointment scheduling is applicable */
    hasBookingFlow: boolean;
    /** Whether emergency contact/trigger is applicable */
    hasEmergencyContact: boolean;
    /** Whether quantity selectors are applicable */
    hasQuantitySelector: boolean;
    /** Whether delivery/pickup options are applicable */
    hasDeliveryOptions: boolean;
}

/**
 * Canonical CTA policies — deterministic mapping from EntityKind to CTAs.
 *
 * ARCHITECTURAL CONSTRAINT:
 * These policies are absolute. NO component should override or bypass them.
 * If a policy needs changing, change it HERE — not in a component.
 */
export const ENTITY_CTA_POLICIES: Record<EntityKind, EntityCTAPolicy> = {
    // ═════════════════════════════════════════════════════════════════
    // PRODUCT — Physical goods for purchase
    // CTA: add_to_cart, buy_now
    // Commerce display: PRICE, DISCOUNT, COD, RETURN, QUANTITY
    // ═════════════════════════════════════════════════════════════════
    product: {
        kind: "product",
        primaryCTA: "add_to_cart",
        secondaryCTA: "buy_now",
        allowedActions: ["add_to_cart", "buy_now", "whatsapp", "call_now"],
        interactionMode: "commerce",
        hasCommerceDisplay: true,
        hasBookingFlow: false,
        hasEmergencyContact: false,
        hasQuantitySelector: true,
        hasDeliveryOptions: true,
    },

    // ═════════════════════════════════════════════════════════════════
    // SERVICE — Bookable services (repair, plumber, electrician, cleaning)
    // CTA: book_service, whatsapp, call_now
    // NO: add_to_cart, buy_now, quantity, COD, return policy
    // ═════════════════════════════════════════════════════════════════
    service: {
        kind: "service",
        primaryCTA: "book_service",
        secondaryCTA: "call_now",
        allowedActions: ["book_service", "whatsapp", "call_now", "get_directions"],
        interactionMode: "booking",
        hasCommerceDisplay: false,
        hasBookingFlow: true,
        hasEmergencyContact: false,
        hasQuantitySelector: false,
        hasDeliveryOptions: false,
    },

    // ═════════════════════════════════════════════════════════════════
    // PROFESSIONAL — Consultation-based (doctor, lawyer, tutor, consultant)
    // CTA: book_appointment, consult_now, whatsapp
    // NO: add_to_cart, buy_now, quantity, COD, return policy
    // ═════════════════════════════════════════════════════════════════
    professional: {
        kind: "professional",
        primaryCTA: "book_appointment",
        secondaryCTA: "consult_now",
        allowedActions: ["book_appointment", "consult_now", "whatsapp", "call_now", "get_directions"],
        interactionMode: "consultation",
        hasCommerceDisplay: false,
        hasBookingFlow: true,
        hasEmergencyContact: false,
        hasQuantitySelector: false,
        hasDeliveryOptions: false,
    },

    // ═════════════════════════════════════════════════════════════════
    // HEALTHCARE — Medical facilities (clinic, hospital, diagnostic)
    // CTA: book_appointment, call_now, get_directions
    // NO: add_to_cart, buy_now, quantity, COD, return policy
    // NOTE: Emergency contact surfaces separately, not as primary CTA
    // ═════════════════════════════════════════════════════════════════
    healthcare: {
        kind: "healthcare",
        primaryCTA: "book_appointment",
        secondaryCTA: "call_now",
        allowedActions: ["book_appointment", "call_now", "get_directions", "whatsapp"],
        interactionMode: "consultation",
        hasCommerceDisplay: false,
        hasBookingFlow: true,
        hasEmergencyContact: true,
        hasQuantitySelector: false,
        hasDeliveryOptions: false,
    },

    // ═════════════════════════════════════════════════════════════════
    // EDUCATION — Schools, colleges, coaching centres
    // CTA: enroll_now, request_callback
    // NO: add_to_cart, buy_now, COD, return policy
    // ═════════════════════════════════════════════════════════════════
    education: {
        kind: "education",
        primaryCTA: "enroll_now",
        secondaryCTA: "request_callback",
        allowedActions: ["enroll_now", "request_callback", "call_now", "get_directions", "whatsapp"],
        interactionMode: "enrollment",
        hasCommerceDisplay: false,
        hasBookingFlow: true,
        hasEmergencyContact: false,
        hasQuantitySelector: false,
        hasDeliveryOptions: false,
    },

    // ═════════════════════════════════════════════════════════════════
    // RESTAURANT — Food & dining (restaurant, cafe, dhaba, fast food)
    // CTA: order_food, call_now
    // NO: add_to_cart (use order_food instead), buy_now, booking
    // ═════════════════════════════════════════════════════════════════
    restaurant: {
        kind: "restaurant",
        primaryCTA: "order_food",
        secondaryCTA: "call_now",
        allowedActions: ["order_food", "call_now", "whatsapp", "get_directions"],
        interactionMode: "commerce",
        hasCommerceDisplay: true,
        hasBookingFlow: false,
        hasEmergencyContact: false,
        hasQuantitySelector: true,
        hasDeliveryOptions: true,
    },

    // ═════════════════════════════════════════════════════════════════
    // BOOKING — Reservation-based (hotel, salon, spa)
    // CTA: book_service, call_now
    // ═════════════════════════════════════════════════════════════════
    booking: {
        kind: "booking",
        primaryCTA: "book_service",
        secondaryCTA: "call_now",
        allowedActions: ["book_service", "call_now", "whatsapp", "get_directions"],
        interactionMode: "booking",
        hasCommerceDisplay: true,
        hasBookingFlow: true,
        hasEmergencyContact: false,
        hasQuantitySelector: false,
        hasDeliveryOptions: false,
    },

    // ═════════════════════════════════════════════════════════════════
    // MARKETPLACE — Generic/fallback (mixed entity stores, unclassified)
    // CTA: whatsapp, call_now
    // Minimal commerce display — no pricing assumptions
    // ═════════════════════════════════════════════════════════════════
    marketplace: {
        kind: "marketplace",
        primaryCTA: "call_now",
        secondaryCTA: "whatsapp",
        allowedActions: ["call_now", "whatsapp", "get_directions"],
        interactionMode: "inquiry",
        hasCommerceDisplay: false,
        hasBookingFlow: false,
        hasEmergencyContact: false,
        hasQuantitySelector: false,
        hasDeliveryOptions: false,
    },

    // ═════════════════════════════════════════════════════════════════
    // EMERGENCY — Urgent response services
    // CTA: call_now (emergency), get_directions
    // NO: commerce, booking, quantity
    // ═════════════════════════════════════════════════════════════════
    emergency: {
        kind: "emergency",
        primaryCTA: "call_now",
        secondaryCTA: "get_directions",
        allowedActions: ["call_now", "get_directions"],
        interactionMode: "emergency",
        hasCommerceDisplay: false,
        hasBookingFlow: false,
        hasEmergencyContact: true,
        hasQuantitySelector: false,
        hasDeliveryOptions: false,
    },
};

// ─── PHASE 3b: CATEGORY-TO-KIND OVERRIDE MAP ────────────────────
// This provides category-level overrides for entities that may not
// have an explicit kind. It complements (does not replace) the classifier.

export interface CategoryCTAMapping {
    /** Regex patterns to match against category string */
    patterns: RegExp[];
    /** Target entity kind */
    kind: EntityKind;
    /** Priority (higher = more specific match) */
    priority: number;
}

export const CATEGORY_CTA_MAPPINGS: CategoryCTAMapping[] = [
    // Restaurant / Food
    { patterns: [/^restaurant/i, /^cafe/i, /^dhaba/i, /^fast.?food/i, /^food.?court/i, /^cloud.?kitchen/i, /^bakery/i, /^sweet.?shop/i, /^pizza/i, /^burger/i], kind: "restaurant", priority: 25 },
    // Products
    { patterns: [/^electronics/i, /^mobiles?$/i, /^clothing/i, /^grocery/i, /^kirana/i, /^fashion/i, /^accessories/i, /^food$/i, /^beverages$/i, /^household/i, /^furniture/i, /^hardware/i, /^stationery/i, /^toys/i], kind: "product", priority: 10 },
    // Services
    { patterns: [/^repair/i, /^plumb(er|ing)$/i, /^electric(al|ian)$/i, /^cleaning$/i, /^maintenance$/i, /^carpenter$/i, /^mechanic$/i, /^beaut(y|ician)/i, /^tailor$/i, /^pest.?control/i, /^laundry/i, /^salon$/i], kind: "service", priority: 20 },
    // Professionals
    { patterns: [/^doctor/i, /^physician/i, /^specialist/i, /^consultant/i, /^legal$/i, /^lawyer$/i, /^advocate$/i, /^tutor$/i, /^coach(ing)?$/i, /^counsell(or|ing)$/i, /^dietitian$/i, /^nutritionist$/i, /^therapist$/i, /^chartered.?accountant/i, /^architect/i], kind: "professional", priority: 20 },
    // Healthcare
    { patterns: [/^hospital/i, /^clinic/i, /^diagnostic/i, /^pathology/i, /^medical$/i, /^pharmacy/i, /^dental/i, /^eye$/i, /^optical/i, /^physiotherapy/i], kind: "healthcare", priority: 20 },
    // Education
    { patterns: [/^school/i, /^college/i, /^university/i, /^academy/i, /^institute/i, /^coaching$/i, /^tuition/i, /^education$/i, /^montessori/i, /^play.?school/i], kind: "education", priority: 20 },
    // Emergency
    { patterns: [/^ambulance/i, /^emergency/i, /^fire.?brigade/i, /^police$/i, /^disaster/i, /^rescue/i, /^poison/i, /^first.?aid/i], kind: "emergency", priority: 30 },
    // Booking
    { patterns: [/^hotel/i, /^resort/i, /^lodge$/i, /^guest.?house/i, /^spa$/i, /^homestay/i], kind: "booking", priority: 15 },
];

// ─── PHASE 4: CTA RESOLUTION ENGINE ──────────────────────────────

export interface EntityCTAInput {
    /** Explicit entity kind (if already classified) */
    kind?: EntityKind;
    /** Category string for fallback classification */
    category?: string;
    /** Tags for additional context */
    tags?: string[];
    /** Arbitrary metadata for contextual overrides */
    metadata?: Record<string, any>;
}

export interface ResolvedCTAs {
    /** Resolved entity kind */
    kind: EntityKind;
    /** Policy governing this entity */
    policy: EntityCTAPolicy;
    /** Primary CTA with full metadata */
    primaryCTA: CTAMetadata;
    /** Secondary CTA with full metadata */
    secondaryCTA: CTAMetadata;
    /** All allowed CTAs in priority order with full metadata */
    allCTAs: CTAMetadata[];
    /** Dominant interaction mode */
    interactionMode: InteractionMode;
}

// ─── CATEGORY-TO-KIND RESOLVER ─────────────────────────────────---

/**
 * Resolve entity kind from category string using regex matching.
 * Returns undefined if no match found.
 */
export function resolveKindFromCategory(category: string): EntityKind | undefined {
    if (!category) return undefined;

    // Sort by priority (highest first) so most specific matches win
    const sorted = [...CATEGORY_CTA_MAPPINGS].sort((a, b) => b.priority - a.priority);

    for (const mapping of sorted) {
        for (const pattern of mapping.patterns) {
            if (pattern.test(category)) {
                return mapping.kind;
            }
        }
    }

    return undefined;
}

/**
 * Resolve entity kind from tags array.
 * Scans tags for known entity type indicators.
 */
export function resolveKindFromTags(tags: string[]): EntityKind | undefined {
    if (!tags || tags.length === 0) return undefined;

    const tagKinds: Array<{ pattern: RegExp; kind: EntityKind }> = [
        { pattern: /^doctor/i, kind: "professional" },
        { pattern: /^hospital/i, kind: "healthcare" },
        { pattern: /^clinic/i, kind: "healthcare" },
        { pattern: /^school/i, kind: "education" },
        { pattern: /^restaurant/i, kind: "restaurant" },
        { pattern: /^service/i, kind: "service" },
        { pattern: /^booking/i, kind: "booking" },
        { pattern: /^emergency/i, kind: "emergency" },
        { pattern: /^hotel/i, kind: "booking" },
        { pattern: /^food/i, kind: "restaurant" },
    ];

    for (const tag of tags) {
        for (const mapping of tagKinds) {
            if (mapping.pattern.test(tag)) {
                return mapping.kind;
            }
        }
    }

    return undefined;
}

/**
 * Check whether an entity kind has commerce-related display.
 * Components use this to conditionally render price, discount, COD, return policy, quantity.
 */
export function hasCommerceDisplay(kind: EntityKind): boolean {
    return getEntityCTAPolicy(kind)?.hasCommerceDisplay ?? false;
}

/**
 * Check whether an entity kind requires booking flow.
 */
export function hasBookingFlow(kind: EntityKind): boolean {
    return getEntityCTAPolicy(kind)?.hasBookingFlow ?? false;
}

// ─── MAIN RESOLVER ────────────────────────────────────────────────

/**
 * Resolve canonical CTAs for any entity.
 *
 * This is the SINGLE entry point for ALL CTA decisions.
 *
 * Input:
 *   - entity (with kind, category, tags, metadata)
 *
 * Returns:
 *   - ResolvedCTAs with policy, primaryCTA, secondaryCTA, allCTAs, interactionMode
 *
 * Usage:
 *   const ctas = resolveEntityCTAs({ kind: "professional", category: "Doctor" });
 *   // ctas.primaryCTA.label === "Book Appointment"
 *   // ctas.allCTAs.map(c => c.label) === ["Book Appointment", "Consult Now", "WhatsApp", "Call", "Get Directions"]
 */
export function resolveEntityCTAs(entity: EntityCTAInput): ResolvedCTAs {
    const { kind, category, tags, metadata } = entity;

    // 1. Determine entity kind using priority chain:
    //    Explicit kind > Category match > Tags match > Fallback
    let resolvedKind: EntityKind;

    if (kind && isEntityKind(kind)) {
        resolvedKind = kind;
    } else if (category) {
        const fromCategory = resolveKindFromCategory(category);
        resolvedKind = fromCategory ?? ENTITY_CTA_FALLBACK_KIND;
    } else if (tags && tags.length > 0) {
        const fromTags = resolveKindFromTags(tags);
        resolvedKind = fromTags ?? ENTITY_CTA_FALLBACK_KIND;
    } else {
        resolvedKind = ENTITY_CTA_FALLBACK_KIND;
    }

    // 2. Get policy
    const policy = getEntityCTAPolicy(resolvedKind);

    // 3. Resolve CTAs with full metadata
    const allCTAs = policy.allowedActions
        .map((actionId) => CTA_METADATA[actionId])
        .filter(Boolean);

    const primaryCTA = CTA_METADATA[policy.primaryCTA];
    const secondaryCTA = CTA_METADATA[policy.secondaryCTA];

    return {
        kind: resolvedKind,
        policy,
        primaryCTA,
        secondaryCTA,
        allCTAs,
        interactionMode: policy.interactionMode,
    };
}

// ─── POLICY ACCESSORS ────────────────────────────────────────────

/**
 * Get the CTA policy for a given entity kind.
 * Guaranteed to always return a policy (falls back to marketplace).
 */
export function getEntityCTAPolicy(kind: EntityKind): EntityCTAPolicy {
    return ENTITY_CTA_POLICIES[kind] ?? ENTITY_CTA_POLICIES.marketplace;
}

/**
 * Get CTA metadata for a single action.
 * Returns undefined if action doesn't exist.
 */
export function getCTAMetadata(action: EntityCTA): CTAMetadata | undefined {
    return CTA_METADATA[action];
}

/**
 * Validate that a string is a recognized EntityKind.
 */
export function isEntityKind(value: string): value is EntityKind {
    return Object.keys(ENTITY_CTA_POLICIES).includes(value);
}

/**
 * Validate that a string is a recognized EntityCTA.
 */
export function isEntityCTA(value: string): value is EntityCTA {
    return Object.keys(CTA_METADATA).includes(value);
}

// ─── INTERACTION MODE HELPERS ────────────────────────────────────

/**
 * Get the interaction mode for an entity kind.
 */
export function getInteractionMode(kind: EntityKind): InteractionMode {
    return getEntityCTAPolicy(kind).interactionMode;
}

/**
 * Get canonical label for an entity kind.
 */
export function getEntityKindLabel(kind: EntityKind): string {
    const labels: Partial<Record<EntityKind, string>> = {
        product: "Product",
        service: "Service",
        professional: "Professional",
        healthcare: "Healthcare",
        booking: "Booking",
        education: "Education",
        restaurant: "Restaurant",
        marketplace: "Marketplace",
        emergency: "Emergency",
    };
    return labels[kind] ?? "Entity";
}

// ─── CONSTANTS ───────────────────────────────────────────────────

export const ENTITY_CTA_FALLBACK_KIND: EntityKind = "marketplace";
export const ENTITY_CTA_RESOLVER_VERSION = "1.0.0";
export const ENTITY_CTA_RESOLVER_CREATED = "2026-05-23";

export const ENTITY_CTA_GOVERNANCE = {
    /** No hardcoded CTA components allowed */
    COMPONENT_CTA_FORBIDDEN: true,
    /** CTA labels come from registry, not component text */
    LABELS_ARE_REGISTRY_DRIVEN: true,
    /** Entity kinds must resolve through canonical types */
    CANONICAL_KINDS_ENFORCED: true,
    /** Commerce display forbidden for non-product entities */
    COMMERCE_DISPLAY_RESTRICTED: true,
    /** Emergency actions always highest visibility */
    EMERGENCY_ALWAYS_ON_TOP: true,
} as const;
