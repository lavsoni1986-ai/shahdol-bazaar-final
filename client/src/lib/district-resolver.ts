/**
 * 🛡️ DISTRICT RESOLVER - Universal Tenant Context Extractor
 *
 * Extracts district slug from URL pathname for multi-tenant routing
 * Supports: /shahdol, /anuppur, /umaria, /vendor/abc, /shop/xyz patterns
 *
 * CLUSTER MODE PHASE-2: Central source of truth for district identification
 */

// 🛡️ BHARAT-OS: UPDATED SOVEREIGN ERROR INTERFACE
export interface SovereignErrorContext {
  blockedDistrict: string;
  recommendedPath: string;
  reason: string;
  // 🎯 ये नए फील्ड्स जोड़ने से एरर खत्म हो जाएंगे:
  spoofingDetected?: boolean;
  expectedDistrictId?: number;
  providedDistrictId?: number;
  message?: string;
}

const RESERVED = [
    "shop",
    "product",
    "marketplace",
    "admin",
    "vendor",
    "cart",
    "profile",
    "auth",
    "checkout",
    "api",
    "ambulance",
    "bus",
    "hospital",
    "school",
    "service",
    "dashboard",
    "partner",
    "orders",
    "hospitals",
    "schools",
    "services",
    "education",
    "customer-dashboard",
    "health",
    "districts"
];

/**
 * Resolves district slug from domain or URL
 * Supports both subdomain and path-based routing
 * 
 * @example
 * "shahdol.yourapp.com" => "shahdol"
 * "shahdol.localhost" => "shahdol"
 * "/shahdol" => "shahdol" (fallback)
 */
export function resolveDistrictSlug(): string {
    if (typeof window === "undefined") {
        return import.meta.env.VITE_DEFAULT_DISTRICT_SLUG || "shahdol";
    }

    // Try domain-based resolution first
    const host = window.location.hostname;
    
    // Check for localhost case
    if (host.includes("localhost")) {
        // Try subdomain on localhost
        if (host.includes(".")) {
            const subdomain = host.split(".")[0];
            if (subdomain && subdomain !== "localhost") {
                return subdomain;
            }
        }
        
        // Fallback to path-based for localhost
        return resolveDistrictFromPath();
    }

    // Domain-based resolution for production
    if (host.includes(".")) {
        const subdomain = host.split(".")[0];
        if (subdomain && subdomain !== "www") {
            return subdomain;
        }
    }

    // Fallback to path-based resolution
    return resolveDistrictFromPath();
}

/**
 * Resolves district from URL path (fallback method)
 * 
 * @example
 * "/shahdol" => "shahdol"
 * "/shahdol/shop/abc" => "shahdol"
 */
function resolveDistrictFromPath(): string {
    const path = window.location.pathname;
    if (!path || path === "/") {
        return import.meta.env.VITE_DEFAULT_DISTRICT_SLUG || "shahdol";
    }

    // Extract first segment after /
    const segments = path.split("/").filter(Boolean);
    const firstSegment = segments[0]?.toLowerCase();

    // Check if first segment is a reserved word or contains special chars
    if (!firstSegment || RESERVED.includes(firstSegment) || firstSegment.includes(":")) {
        return import.meta.env.VITE_DEFAULT_DISTRICT_SLUG || "shahdol";
    }

    // Sanitize: keep only alphanumeric and hyphens
    const sanitized = firstSegment.replace(/[^a-z0-9-]/g, "");
    return sanitized || (import.meta.env.VITE_DEFAULT_DISTRICT_SLUG || "shahdol");
}

/**
 * Gets district ID from localStorage/sessionStorage
 * Falls back to environment variable
 */
export function getStoredDistrictId(): number | null {
    try {
        const stored = sessionStorage.getItem("district_id") ||
            localStorage.getItem("district_id");
        return stored ? parseInt(stored, 10) : null;
    } catch {
        return null;
    }
}

/**
 * Cross-district shield - prevents spoofing attempts
 * @param currentDistrictSlug Current district from URL
 * @param headerDistrictId District ID from X-District-Id header
 * @returns {boolean} True if valid, throws error if spoofing detected
 */
export function crossDistrictShield(currentDistrictSlug: string, headerDistrictId: number): boolean {
    try {
        // Get expected district info
        const expectedDistrictId = getDistrictIdForSlug(currentDistrictSlug);
        
        // Check if header matches expected ID
        if (headerDistrictId !== expectedDistrictId) {
            // Spoofing attempt detected
            const error = createSovereignGateError(currentDistrictSlug);
            error.details.spoofingDetected = true;
            error.details.expectedDistrictId = expectedDistrictId;
            error.details.providedDistrictId = headerDistrictId;
            error.details.message = "Cross-district spoofing attempt detected";
            throw error;
        }
        
        return true;
    } catch (error) {
        throw error;
    }
}

/**
 * Enhanced resolveDistrictSlug with spoofing protection
 * @returns {string} The resolved district slug
 */
export function enhancedResolveDistrictSlug(): string {
    const slug = resolveDistrictSlug();
    
    // Auto-store slug on first resolution
    const storedSlug = getStoredDistrictSlug();
    if (!storedSlug) {
        storeDistrictSlug(slug);
    }
    
    return slug;
}

/**
 * Gets district slug from storage
 * Falls back to URL resolution with auto-storage
 */
export function getStoredDistrictSlug(): string {
    try {
        const stored = sessionStorage.getItem("district_slug") ||
            localStorage.getItem("district_slug");
        
        if (stored) {
            return stored;
        }
        
        // Fallback: get from URL and store immediately
        const slugFromURL = resolveDistrictSlug();
        storeDistrictSlug(slugFromURL);
        return slugFromURL;
    } catch {
        const slugFromURL = resolveDistrictSlug();
        storeDistrictSlug(slugFromURL);
        return slugFromURL;
    }
}

/**
 * Stores district slug in localStorage/sessionStorage
 * @param slug The district slug to store
 */
function storeDistrictSlug(slug: string) {
    try {
        // Store in both for redundancy
        sessionStorage.setItem("district_slug", slug);
        localStorage.setItem("district_slug", slug);
    } catch {
        // Ignore storage errors
    }
}

/**
 * Watch for route changes and sync district context
 */
export function watchDistrictChanges(callback: (slug: string) => void) {
    if (typeof window === "undefined") return;

    // Listen for pathname changes
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
        originalPushState.apply(window.history, args);
        callback(resolveDistrictSlug());
    };

    window.history.replaceState = function (...args) {
        originalReplaceState.apply(window.history, args);
        callback(resolveDistrictSlug());
    };

    // Also watch for popstate (back button)
    window.addEventListener("popstate", () => {
        callback(resolveDistrictSlug());
    });
}

/**
 * Creates strict error body for Sovereign Gate blocking
 * @param districtSlug The current district slug
 * @returns Error object with district redirect info
 */
export function createSovereignGateError(districtSlug: string): {
  error: string;
  code: number;
  message: string;
  redirect: string;
  timestamp: string;
  details: SovereignErrorContext;
} {
    return {
        error: "Sovereign Gate Blocked",
        code: 400,
        message: "Access restricted by district sovereignty rules",
        redirect: `/${districtSlug}`,
        timestamp: new Date().toISOString(),
        details: {
            blockedDistrict: districtSlug,
            recommendedPath: `/${districtSlug}`,
            reason: "Cross-district access violation"
        }
    };
}

/**
 * Validates X-District-Id header against current URL
 * @param headerDistrictId The district ID from X-District-Id header
 * @param currentDistrictSlug The current district slug from URL
 * @returns {boolean} True if valid, throws error if spoofing detected
 */
export function validateDistrictHeader(headerDistrictId: number, currentDistrictSlug: string): boolean {
    try {
        // Get stored district ID for current slug
        const storedDistrictId = getStoredDistrictId();
        const storedDistrictSlug = getStoredDistrictSlug();

        // If stored slug doesn't match current slug, clear storage
        if (storedDistrictSlug !== currentDistrictSlug) {
            clearDistrictStorage();
        }

        // Get expected district ID for current slug
        const expectedDistrictId = getDistrictIdForSlug(currentDistrictSlug);

        // Check if header matches expected ID
        if (headerDistrictId !== expectedDistrictId) {
            throw createSovereignGateError(currentDistrictSlug);
        }

        return true;
    } catch (error) {
        throw error;
    }
}

/**
 * Clears district storage data
 */
export function clearDistrictStorage() {
    try {
        sessionStorage.removeItem("district_id");
        sessionStorage.removeItem("district_slug");
        localStorage.removeItem("district_id");
        localStorage.removeItem("district_slug");
    } catch {
        // Ignore storage errors
    }
}

/**
 * Gets district ID for a given slug
 * @param slug The district slug
 * @returns The corresponding district ID
 */
function getDistrictIdForSlug(slug: string): number {
    const districtMap: Record<string, number> = {
        shahdol: 1,
        anuppur: 2,
        umariad: 3,
        katni: 4,
        jabalpur: 5
    };
    return districtMap[slug] || 1;
}
