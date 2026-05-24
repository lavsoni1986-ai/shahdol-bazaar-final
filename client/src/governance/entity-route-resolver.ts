// 🏛️ BHARAT-OS: ENTITY ROUTE RESOLVER — SINGLE AUTHORITY FOR ALL ENTITY NAVIGATION
// ================================================================
// No component may manually build entity routes.
// No hardcoded `/stores/${entity}` patterns allowed.
// Every entity navigation decision MUST pass through this resolver.
//
// CRITICAL RULES:
// ❌ NO /stores/${entity} hardcoded in components
// ❌ NO route string concatenation
// ❌ NO broken slug fallback to "entity" or Date.now()
// ❌ NO duplicate route building logic
//
// Every component imports resolveEntityRoute() — that's it.
// ================================================================

import { getCurrentDistrictSlug } from "@/shared/routing/sovereign-routes";

// ─── CANONICAL ENTITY KINDS ────────────────────────────────

export type ResolvableEntityKind =
    | "product"
    | "service"
    | "professional"
    | "healthcare"
    | "booking"
    | "education"
    | "restaurant"
    | "marketplace"
    | "emergency"
    | "partner"
    | "hospital"
    | "school";

// ─── INPUT TYPE ──────────────────────────────────────────

export interface EntityRouteInput {
    /** Canonical entity kind */
    entityKind: ResolvableEntityKind;
    /** URL-safe slug — must be non-empty, valid slug */
    slug?: string | null;
    /** Numeric ID (fallback if slug is missing) */
    id?: number | string | null;
    /** District slug for multi-tenant routing */
    districtSlug?: string;
}

// ─── OUTPUT TYPE ─────────────────────────────────────────

export interface EntityRouteResult {
    /** The resolved URL path */
    href: string;
    /** Whether the route is valid (has a usable identifier) */
    isValid: boolean;
    /** The identifier used (slug preferred, id fallback) */
    identifier: string;
    /** Human-readable validation message */
    validationMessage?: string;
}

// ─── SLUG VALIDATION ─────────────────────────────────────

/**
 * Validate that a slug is safe and meaningful for routing.
 * Rejects slugs that are generic fallbacks like "entity", timestamps,
 * or empty strings that would cause VENDOR_NOT_FOUND.
 */
function isValidSlug(slug: string): boolean {
    if (!slug || slug.length < 2) return false;
    // Reject generic fallback slugs from response-normalizers
    const genericPatterns = /^(entity|untitled|unknown|general|item|product|store|vendor|partner|service)$/i;
    if (genericPatterns.test(slug)) return false;
    // Reject pure-timestamp or pure-numeric slugs
    if (/^\d{10,}$/.test(slug)) return false;
    // Reject slugs that are just decimnal timestamps
    if (/^\d{13,}$/.test(slug)) return false;
    return true;
}

// ─── ROUTE BUILDER ───────────────────────────────────────

/**
 * Build a valid entity route from canonical inputs.
 *
 * Usage:
 *   const { href, isValid } = resolveEntityRoute({
 *     entityKind: "marketplace",
 *     slug: vendor.slug,
 *     id: vendor.id,
 *   });
 *
 *   if (isValid) navigate(href);
 *
 * @returns EntityRouteResult — always returns a string, caller checks isValid
 */
export function resolveEntityRoute(input: EntityRouteInput): EntityRouteResult {
    const { entityKind, slug, id, districtSlug } = input;
    const district = districtSlug || getCurrentDistrictSlug();

    // ── Try slug first (most semantic, SEO-friendly) ──
    if (slug && isValidSlug(slug)) {
        return buildRoute(entityKind, district, slug, slug);
    }

    // ── Fallback to numeric ID ──
    if (id != null) {
        const idStr = String(id);
        if (idStr.length > 0 && /^\d+$/.test(idStr)) {
            return buildRoute(entityKind, district, idStr, idStr);
        }
    }

    // ── No valid identifier — return safe fallback, mark invalid ──
    return {
        href: "/marketplace",
        isValid: false,
        identifier: "",
        validationMessage: `Entity route could not be resolved: kind=${entityKind}, slug=${slug}, id=${id}. Falling back to marketplace.`,
    };
}

// ─── INTERNAL ROUTE BUILDER ──────────────────────────────

/**
 * Internal: maps entity kind to canonical URL pattern.
 * This is the SINGLE place where route strings are constructed.
 */
function buildRoute(
    entityKind: ResolvableEntityKind,
    district: string,
    identifier: string,
    rawIdentifier: string,
): EntityRouteResult {
    let href: string;

    switch (entityKind) {
        case "product":
            href = `/marketplace/products/${identifier}`;
            break;
        case "service":
            href = `/services/${identifier}`;
            break;
        case "professional":
            href = `/professionals/${identifier}`;
            break;
        case "healthcare":
            href = `/healthcare/${identifier}`;
            break;
        case "hospital":
            href = `/hospitals/${identifier}`;
            break;
        case "booking":
            href = `/bookings/${identifier}`;
            break;
        case "education":
        case "school":
            href = `/schools/${identifier}`;
            break;
        case "restaurant":
            href = `/restaurants/${identifier}`;
            break;
        case "emergency":
            href = `/emergency/${identifier}`;
            break;
        case "marketplace":
        case "partner":
        default:
            // All partner/vendor/store routes go through /marketplace/stores/<slug>
            href = `/marketplace/stores/${identifier}`;
            break;
    }

    return {
        href,
        isValid: true,
        identifier: rawIdentifier,
    };
}

// ─── CONVENIENCE WRAPPERS ─────────────────────────────────

export function resolveMarketplaceRoute(slug: string, districtSlug?: string): EntityRouteResult {
    return resolveEntityRoute({ entityKind: "marketplace", slug, districtSlug });
}

export function resolveProductRoute(slug: string | number, districtSlug?: string): EntityRouteResult {
    return resolveEntityRoute({ entityKind: "product", slug: String(slug), id: slug, districtSlug });
}

export function resolveServiceRoute(slug: string, districtSlug?: string): EntityRouteResult {
    return resolveEntityRoute({ entityKind: "service", slug, districtSlug });
}
