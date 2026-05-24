// 🏛️ BHARAT-OS: CANONICAL ANALYTICS CLIENT
// ================================================================
// Single typed entry point for ALL frontend analytics events.
// NO ad-hoc analytics calls. NO console.log tracking. NO stringly-typed events.
//
// Every analytics event MUST go through this module.
// ================================================================

// ─── EVENT TYPES ─────────────────────────────────────────

export type AnalyticsEventType =
    | "PAGE_VIEW"
    | "PRODUCT_VIEW"
    | "VENDOR_VIEW"
    | "SEARCH"
    | "SEARCH_INTERACTION"
    | "CLICK"
    | "CTA_CLICK"
    | "WHATSAPP_CLICK"
    | "CALL_CLICK"
    | "ADD_TO_CART"
    | "ORDER_PLACED"
    | "ORDER_COMPLETED"
    | "ERROR"
    | "SESSION_START"
    | "SESSION_END";

export interface AnalyticsPayload {
    eventType: AnalyticsEventType;
    vendorId?: number | null;
    source?: string;
    action?: string;
    value?: Record<string, unknown>;
    sessionId?: string;
    timestamp?: string;
}

// ─── SESSION MANAGEMENT ──────────────────────────────────

function getOrCreateSessionId(): string {
    const STORAGE_KEY = "bharatos_session_id";
    let sessionId = sessionStorage.getItem(STORAGE_KEY);
    if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        sessionStorage.setItem(STORAGE_KEY, sessionId);
    }
    return sessionId;
}

// ─── CANONICAL TRACKING ──────────────────────────────────

const API_ENDPOINT = "/analytics/track";

/**
 * Track an analytics event with typed payload.
 *
 * Usage:
 *   trackEvent("PAGE_VIEW", { source: "marketplace" });
 *   trackEvent("ADD_TO_CART", { vendorId: 42, value: { productId: 7 } });
 *
 * @param eventType - Canonical event type
 * @param payload - Optional additional payload fields
 */
export async function trackEvent(
    eventType: AnalyticsEventType,
    payload?: Partial<Omit<AnalyticsPayload, "eventType">>
): Promise<void> {
    try {
        const body: AnalyticsPayload = {
            eventType,
            vendorId: payload?.vendorId ?? null,
            source: payload?.source ?? "web",
            action: payload?.action,
            value: payload?.value,
            sessionId: getOrCreateSessionId(),
            timestamp: new Date().toISOString(),
        };

        // Use sendBeacon for page unload events, fetch for everything else
        if (eventType === "SESSION_END") {
            navigator.sendBeacon(API_ENDPOINT, JSON.stringify(body));
            return;
        }

        await fetch(API_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    } catch {
        // Silently fail — analytics should never block the user experience
        if (process.env.NODE_ENV === "development") {
            console.warn("[Analytics] Failed to track event:", eventType);
        }
    }
}

// ─── CONVENIENCE WRAPPERS ────────────────────────────────

export function trackPageView(source?: string): void {
    trackEvent("PAGE_VIEW", { source: source || window.location.pathname });
}

export function trackVendorView(vendorId: number): void {
    trackEvent("VENDOR_VIEW", { vendorId, source: "profile" });
}

export function trackProductView(productId: number): void {
    trackEvent("PRODUCT_VIEW", { source: `product/${productId}` });
}

export function trackSearch(query: string): void {
    trackEvent("SEARCH", { action: query });
}

export function trackWhatsAppClick(vendorId?: number): void {
    trackEvent("WHATSAPP_CLICK", { vendorId, source: "cta" });
}

export function trackCallClick(vendorId?: number): void {
    trackEvent("CALL_CLICK", { vendorId, source: "cta" });
}

export function trackAddToCart(vendorId: number, productId: number): void {
    trackEvent("ADD_TO_CART", { vendorId, value: { productId } });
}

export function trackOrderPlaced(orderId?: string): void {
    trackEvent("ORDER_PLACED", { value: { orderId } });
}

export function trackError(errorMessage: string): void {
    trackEvent("ERROR", { action: errorMessage });
}

// ─── METADATA ───────────────────────────────────────────

export const ANALYTICS_GOVERNANCE = {
    VERSION: "1.0.0",
    CREATED: "2026-05-24",
    ENDPOINT: API_ENDPOINT,
    STRATEGY: "Canonical typed analytics with sendBeacon fallback",
    SAFETY_LEVEL: "LOW - Analytics failures never block user flow",
} as const;
