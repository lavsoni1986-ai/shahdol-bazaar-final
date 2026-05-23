/**
 * P0 — OPERATIONAL TELEMETRY PIPELINE
 *
 * Centralized structured telemetry for checkout operational events.
 * NO console.log scattered across components — single pipeline.
 *
 * Captures:
 * - checkout failures
 * - validation failures
 * - vendor 404s
 * - auth transition instability
 * - recovery-mode activations
 * - cart sanitization events
 * - district mismatches
 * - API degradation
 * - ErrorBoundary crashes
 * - request governance events
 *
 * Designed for:
 * - Production observability
 * - Debugging merchant issues
 * - Support-grade diagnostics
 */

import type { TelemetryEvent, TelemetryLevel, RequestGovernanceEvent } from "./types";

// ─── CONFIGURATION ───

interface TelemetryConfig {
    /** Enable/disable telemetry */
    enabled: boolean;
    /** Minimum level to capture */
    minLevel: TelemetryLevel;
    /** Whether to log to console */
    consoleLogging: boolean;
    /** Whether to send to backend */
    backendReporting: boolean;
    /** Backend endpoint for telemetry */
    backendEndpoint: string;
    /** Sample rate (0.0 to 1.0) */
    sampleRate: number;
}

const DEFAULT_CONFIG: TelemetryConfig = {
    enabled: true,
    minLevel: "info",
    consoleLogging: true,
    backendReporting: false,
    backendEndpoint: "/analytics/track",
    sampleRate: 1.0,
};

// ─── SESSION MANAGEMENT ───

let sessionId: string | null = null;

function getSessionId(): string {
    if (sessionId) return sessionId;
    try {
        const stored = localStorage.getItem("checkout_telemetry_session");
        if (stored) {
            sessionId = stored;
            return sessionId;
        }
    } catch { }

    sessionId = `${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    try {
        localStorage.setItem("checkout_telemetry_session", sessionId);
    } catch { }
    return sessionId;
}

// ─── EVENT BUFFER ───

const eventBuffer: TelemetryEvent[] = [];
let bufferFlushTimer: ReturnType<typeof setTimeout> | null = null;
let config: TelemetryConfig = { ...DEFAULT_CONFIG };

/**
 * SOVEREIGN: Configure the telemetry pipeline.
 */
export function configureTelemetry(overrides: Partial<TelemetryConfig>): void {
    config = { ...config, ...overrides };
}

/**
 * SOVEREIGN: Track a structured telemetry event.
 *
 * Usage:
 * ```ts
 * trackEvent("checkout.vendor.validation_failed", "error", {
 *   vendorId: 4,
 *   districtId: 121,
 *   cartItemCount: 3,
 * });
 * ```
 */
export function trackEvent(
    event: string,
    level: TelemetryLevel = "info",
    metadata: Record<string, unknown> = {},
    overrides?: { userId?: number | string; requestId?: string }
): void {
    if (!config.enabled) return;
    if (!shouldSample()) return;
    if (!shouldCapture(level)) return;

    const telemetryEvent: TelemetryEvent = {
        event,
        timestamp: new Date().toISOString(),
        level,
        metadata,
        sessionId: getSessionId(),
        ...(overrides?.userId ? { userId: overrides.userId } : {}),
        ...(overrides?.requestId ? { requestId: overrides.requestId } : {}),
    };

    // Console logging
    if (config.consoleLogging) {
        const logFn = level === "error" ? console.error
            : level === "warn" ? console.warn
                : level === "debug" ? console.debug
                    : console.log;
        logFn(
            `📡 [TELEMETRY] [${level.toUpperCase()}] ${event}`,
            metadata
        );
    }

    // Buffer for backend reporting
    if (config.backendReporting) {
        eventBuffer.push(telemetryEvent);
        scheduleBufferFlush();
    }
}

/**
 * SOVEREIGN: Track a request governance event.
 */
export function trackGovernanceEvent(
    govEvent: RequestGovernanceEvent,
    metadata: Record<string, unknown> = {}
): void {
    const level: TelemetryLevel =
        govEvent.type === "success" ? "info"
            : govEvent.type === "error" || govEvent.type === "timeout" ? "error"
                : govEvent.type === "cancelled" ? "warn"
                    : "debug";

    trackEvent(`request.${govEvent.type}`, level, {
        ...metadata,
        url: govEvent.url,
        method: govEvent.method,
        duration: govEvent.duration,
        statusCode: govEvent.statusCode,
        requestId: govEvent.requestId,
    });
}

// ─── CONVENIENCE TRACKERS ───

/**
 * Track checkout vendor validation failure.
 */
export function trackVendorValidationFailed(vendorId: number, reason: string, extra?: Record<string, unknown>): void {
    trackEvent("checkout.vendor.validation_failed", "error", {
        vendorId,
        reason,
        ...extra,
    });
}

/**
 * Track checkout vendor 404.
 */
export function trackVendor404(vendorId: number, districtId?: number | null): void {
    trackEvent("checkout.vendor.not_found", "error", {
        vendorId,
        districtId,
        errorCode: "VENDOR_404",
        source: "checkout",
    });
}

/**
 * Track cart sanitization event.
 */
export function trackCartSanitization(removedCount: number, reasons: string[], extra?: Record<string, unknown>): void {
    trackEvent("cart.sanitization", "warn", {
        removedCount,
        reasons,
        ...extra,
    });
}

/**
 * Track auth transition instability.
 */
export function trackAuthTransition(from: string, to: string): void {
    trackEvent("auth.transition", "warn", {
        fromState: from,
        toState: to,
    });
}

/**
 * Track recovery mode activation.
 */
export function trackRecoveryMode(reason: string, errors: string[]): void {
    trackEvent("checkout.recovery_mode", "warn", {
        reason,
        errors,
    });
}

/**
 * Track district mismatch.
 */
export function trackDistrictMismatch(
    expectedSlug: string,
    actualSlug: string,
    extra?: Record<string, unknown>
): void {
    trackEvent("district.mismatch", "warn", {
        expectedSlug,
        actualSlug,
        ...extra,
    });
}

/**
 * Track ErrorBoundary crash.
 */
export function trackErrorBoundaryCrash(
    errorMessage: string,
    contextName?: string,
    extra?: Record<string, unknown>
): void {
    trackEvent("error_boundary.crash", "error", {
        errorMessage,
        contextName,
        ...extra,
    });
}

/**
 * Track checkout success.
 */
export function trackCheckoutSuccess(
    orderId?: string | number,
    itemCount?: number,
    total?: number
): void {
    trackEvent("checkout.success", "info", {
        orderId,
        itemCount,
        total,
        paymentMethod: "cod",
    });
}

/**
 * Track checkout failure.
 */
export function trackCheckoutFailure(
    error: string,
    stage: string,
    extra?: Record<string, unknown>
): void {
    trackEvent("checkout.failure", "error", {
        error,
        stage,
        ...extra,
    });
}

/**
 * Track API degradation.
 */
export function trackAPIDegradation(
    endpoint: string,
    statusCode: number,
    durationMs: number,
    extra?: Record<string, unknown>
): void {
    if (durationMs > 5000 || statusCode >= 500) {
        trackEvent("api.degradation", "warn", {
            endpoint,
            statusCode,
            durationMs,
            ...extra,
        });
    }
}

// ─── INTERNAL HELPERS ───

function shouldSample(): boolean {
    if (config.sampleRate >= 1.0) return true;
    return Math.random() < config.sampleRate;
}

function shouldCapture(level: TelemetryLevel): boolean {
    const levels: TelemetryLevel[] = ["debug", "info", "warn", "error"];
    const minIndex = levels.indexOf(config.minLevel);
    const levelIndex = levels.indexOf(level);
    return levelIndex >= minIndex;
}

function scheduleBufferFlush(): void {
    if (bufferFlushTimer) return;
    bufferFlushTimer = setTimeout(() => {
        flushBuffer();
        bufferFlushTimer = null;
    }, 5000); // Flush every 5s
}

async function flushBuffer(): Promise<void> {
    if (eventBuffer.length === 0) return;
    const events = [...eventBuffer];
    eventBuffer.length = 0;

    try {
        const { apiRequest } = await import("@/lib/api-client");
        await apiRequest("POST", config.backendEndpoint, {
            events,
            sessionId: getSessionId(),
        });
    } catch (err) {
        console.warn("📡 [TELEMETRY] Failed to flush buffer:", err);
        // Re-buffer on failure
        eventBuffer.push(...events);
    }
}

/**
 * SOVEREIGN: Get the current event buffer (for debugging).
 */
export function getEventBuffer(): TelemetryEvent[] {
    return [...eventBuffer];
}

/**
 * SOVEREIGN: Clear all stored events.
 */
export function clearEventBuffer(): void {
    eventBuffer.length = 0;
}
