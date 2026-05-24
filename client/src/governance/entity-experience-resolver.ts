// 🏛️ BHARAT-OS: ENTITY EXPERIENCE RESOLVER
// ================================================================
// Central intelligence layer that binds CTA mode + route mode + media mode
// + layout mode + commerce mode into a single resolved experience output.
//
// Every detail page, every entity card, every surface renders through
// this resolver. NO scattered if/else chains for layout decisions.
// ================================================================

import { resolveEntityRoute, type ResolvableEntityKind } from "./entity-route-resolver";
import { resolveEntityCTAs, hasCommerceDisplay, hasBookingFlow, getInteractionMode } from "./entity-cta-resolver";
import type { InteractionMode } from "./entity-cta-resolver";
import type { MediaType } from "@/design/media-governance";

// ─── INPUT ──────────────────────────────────────────────

export interface ExperienceInput {
    /** Canonical entity kind */
    entityKind: string;
    /** Entity category (e.g., "grocery", "electronics", "doctor") */
    category?: string | null;
    /** Entity tags for fine-grained resolution */
    tags?: string[];
    /** Sub-type (e.g., "hospital", "clinic", "restaurant") */
    vendorType?: string | null;
}

// ─── OUTPUT ─────────────────────────────────────────────

export interface ResolvedExperience {
    /** Interaction mode for CTAs */
    interactionMode: InteractionMode;
    /** Whether commerce features are available */
    isCommerce: boolean;
    /** Whether booking flow is available */
    hasBooking: boolean;
    /** Suggested media type for this entity kind */
    mediaType: MediaType;
    /** Suggested route entity kind for navigation */
    routeKind: ResolvableEntityKind;
    /** Layout presentation mode */
    layout: "commerce" | "service" | "info";
    /** Theme accent for this entity type */
    accent: "orange" | "emerald" | "blue" | "purple" | "rose" | "amber";
}

// ─── MEDIA TYPE MAP ─────────────────────────────────────

const ENTITY_MEDIA_MAP: Record<string, MediaType> = {
    doctor: "doctor_banner",
    hospital: "hospital_banner",
    clinic: "doctor_banner",
    restaurant: "restaurant_cover",
    cafe: "restaurant_cover",
    food: "restaurant_cover",
    service: "service_poster",
    school: "education_banner",
    college: "education_banner",
    education: "education_banner",
    product: "product",
    marketplace: "marketplace_card",
    store: "marketplace_card",
    vendor: "marketplace_card",
};

// ─── ACCENT MAP ─────────────────────────────────────────

const ENTITY_ACCENT_MAP: Record<string, ResolvedExperience["accent"]> = {
    doctor: "emerald",
    hospital: "blue",
    clinic: "emerald",
    restaurant: "orange",
    cafe: "orange",
    food: "orange",
    service: "purple",
    school: "blue",
    college: "blue",
    education: "blue",
    product: "orange",
    marketplace: "orange",
    store: "orange",
    vendor: "orange",
    emergency: "rose",
    hospital_emergency: "rose",
    transport: "amber",
    bus: "amber",
};

// ─── LAYOUT MAP ─────────────────────────────────────────

const ENTITY_LAYOUT_MAP: Record<string, ResolvedExperience["layout"]> = {
    doctor: "service",
    hospital: "service",
    clinic: "service",
    restaurant: "commerce",
    food: "commerce",
    service: "service",
    school: "info",
    education: "info",
    product: "commerce",
    marketplace: "commerce",
    store: "commerce",
    vendor: "commerce",
};

// ─── RESOLVER ──────────────────────────────────────────

/**
 * Resolve the full experience configuration for any entity.
 *
 * Usage:
 *   const experience = resolveEntityExperience({
 *     entityKind: "partner",
 *     category: "grocery",
 *     tags: ["store"],
 *   });
 *
 * @returns ResolvedExperience — complete interaction, media, layout, and accent config
 */
export function resolveEntityExperience(input: ExperienceInput): ResolvedExperience {
    const { entityKind, category, tags, vendorType } = input;

    // ── Determine the effective kind for mapping ──
    const effectiveKind = vendorType || category || entityKind;
    const kindLower = effectiveKind.toLowerCase();

    // ── Interaction mode via existing CTA governance ──
    const ctas = resolveEntityCTAs({ kind: entityKind as any });
    const interactionMode = getInteractionMode(entityKind as any) || ctas.policy.interactionMode;

    // ── Commerce / booking flags ──
    const isCommerce = hasCommerceDisplay(entityKind as any) || entityKind === "product" || entityKind === "marketplace" || entityKind === "store" || entityKind === "vendor";
    const hasBooking = hasBookingFlow(entityKind as any);

    // ── Media type resolution ──
    // Check tags first for more specific matches, then category/kind
    let mediaType: MediaType = "marketplace_card";

    if (tags) {
        for (const tag of tags) {
            if (ENTITY_MEDIA_MAP[tag.toLowerCase()]) {
                mediaType = ENTITY_MEDIA_MAP[tag.toLowerCase()];
                break;
            }
        }
    }

    if (!mediaType || mediaType === "marketplace_card") {
        mediaType = ENTITY_MEDIA_MAP[kindLower] || ENTITY_MEDIA_MAP[entityKind.toLowerCase()] || "marketplace_card";
    }

    // ── Accent resolution ──
    const accent: ResolvedExperience["accent"] = ENTITY_ACCENT_MAP[kindLower] || ENTITY_ACCENT_MAP[entityKind.toLowerCase()] || "orange";

    // ── Layout resolution ──
    const layout: ResolvedExperience["layout"] = ENTITY_LAYOUT_MAP[kindLower] || ENTITY_LAYOUT_MAP[entityKind.toLowerCase()] || "commerce";

    // ── Route kind resolution ──
    const routeKind: ResolvableEntityKind = determineRouteKind(entityKind, category, tags);

    return {
        interactionMode,
        isCommerce,
        hasBooking,
        mediaType,
        routeKind,
        layout,
        accent,
    };
}

// ─── ROUTE KIND RESOLUTION ─────────────────────────────

function determineRouteKind(entityKind: string, category?: string | null, tags?: string[]): ResolvableEntityKind {
    // Explicit entity kind mapping
    if (entityKind === "product") return "product";
    if (entityKind === "service") return "service";
    if (entityKind === "hospital") return "healthcare";
    if (entityKind === "school") return "education";

    // Category-based resolution
    if (category) {
        const cat = category.toLowerCase();
        if (cat.includes("restaurant") || cat.includes("cafe") || cat.includes("food")) return "restaurant";
        if (cat.includes("doctor") || cat.includes("clinic") || cat.includes("hospital")) return "healthcare";
        if (cat.includes("school") || cat.includes("college") || cat.includes("education")) return "education";
        if (cat.includes("emergency")) return "emergency";
        if (cat.includes("bus") || cat.includes("transport")) return "emergency";
    }

    // Tag-based resolution
    if (tags) {
        for (const tag of tags) {
            const t = tag.toLowerCase();
            if (t === "restaurant" || t === "cafe" || t === "food") return "restaurant";
            if (t === "doctor" || t === "clinic" || t === "hospital") return "healthcare";
            if (t === "school" || t === "college" || t === "education") return "education";
            if (t === "emergency") return "emergency";
        }
    }

    return "marketplace";
}

// ─── CONVENIENCE ───────────────────────────────────────

/**
 * Quick commerce check for entity kind.
 */
export function isEntityCommerce(entityKind: string, category?: string | null): boolean {
    return resolveEntityExperience({ entityKind, category }).isCommerce;
}

// ─── METADATA ──────────────────────────────────────────

export const EXPERIENCE_RESOLVER_GOVERNANCE = {
    VERSION: "1.0.0",
    CREATED: "2026-05-24",
    STRATEGY: "Centralized experience intelligence binding CTA, route, media, layout, and accent",
    SAFETY_LEVEL: "HIGH - No backend changes required, pure frontend governance",
} as const;
