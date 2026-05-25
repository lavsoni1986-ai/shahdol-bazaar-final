import { Router } from "express";
import { success, failure } from "../lib/apiResponse";
import { safeLogger } from "../lib/logging/safe-logger";
import { LogComponent } from "../lib/logging/structured-logger";

const router = Router();

// ─── ALLOWED EVENT TYPES ─────────────────────────────────

const ALLOWED_EVENT_TYPES = new Set([
    "PAGE_VIEW",
    "PRODUCT_VIEW",
    "VENDOR_VIEW",
    "SEARCH",
    "CLICK",
    "CTA_CLICK",
    "WHATSAPP_CLICK",
    "CALL_CLICK",
    "ADD_TO_CART",
    "ORDER_PLACED",
    "ORDER_COMPLETED",
    "ERROR",
    "SESSION_START",
    "SESSION_END",
]);

// ─── VALIDATION ─────────────────────────────────────────

interface ValidatedPayload {
    eventType: string;
    vendorId?: number | null;
    source?: string;
    action?: string;
    value?: Record<string, unknown>;
}

function validateAnalyticsPayload(body: Record<string, unknown>): ValidatedPayload | string {
    const { eventType, vendorId, source, action, value } = body;

    // eventType is required
    if (!eventType || typeof eventType !== "string") {
        return "Missing or invalid eventType";
    }

    if (!ALLOWED_EVENT_TYPES.has(eventType)) {
        return `Invalid eventType: ${eventType}. Must be one of: ${[...ALLOWED_EVENT_TYPES].join(", ")}`;
    }

    // vendorId optional but must be number if provided
    if (vendorId !== undefined && vendorId !== null && (typeof vendorId !== "number" || !Number.isFinite(vendorId))) {
        return "vendorId must be a finite number";
    }

    // source optional but must be string if provided
    if (source !== undefined && source !== null && typeof source !== "string") {
        return "source must be a string if provided";
    }

    // action optional but must be string if provided
    if (action !== undefined && action !== null && typeof action !== "string") {
        return "action must be a string if provided";
    }

    return {
        eventType: eventType,
        vendorId: vendorId != null ? Number(vendorId) : null,
        source: source != null ? String(source) : undefined,
        action: action != null ? String(action) : undefined,
        value: value != null && typeof value === "object" ? (value as Record<string, unknown>) : undefined,
    };
}

// ─── ROUTE ──────────────────────────────────────────────

router.post("/track", async (req, res) => {
    try {
        const body = req.body;
        const districtId = req.ctx?.districtId || req.districtId;

        // Strict telemetry district isolation check
        if (!districtId) {
            safeLogger.warn(LogComponent.TELEMETRY, 'analytics_rejected', 'Sovereign Violation: districtId context required');
            return failure(res, "SOVEREIGN_VIOLATION", "Sovereign Violation: x-district-slug header or body fallback required", 400);
        }

        if (Array.isArray(body)) {
            if (body.length === 0) {
                return success(res, { message: "Empty batch received" });
            }

            // Cap batch bursts at 100 events to prevent memory pressure
            if (body.length > 100) {
                safeLogger.warn(LogComponent.TELEMETRY, 'analytics_batch_overflow', `Batch size of ${body.length} exceeded limit of 100, slicing.`);
                body.splice(100);
            }

            // STRICT VALIDATION: Mixed district telemetry batch rejected
            const firstSlug = body[0]?.districtSlug;
            const isConsistent = body.every(item => item && item.districtSlug === firstSlug);
            if (!isConsistent) {
                safeLogger.warn(LogComponent.TELEMETRY, 'analytics_mixed_districts_rejected', 'Mixed district telemetry batch rejected', { body });
                return failure(res, "MIXED_DISTRICTS", "Sovereign Violation: Mixed district telemetry batch rejected", 400);
            }

            const validatedEvents = [];
            for (const item of body) {
                const validated = validateAnalyticsPayload(item);
                if (typeof validated === "string") {
                    safeLogger.warn(LogComponent.TELEMETRY, 'analytics_validation_failed', validated, { item });
                    continue;
                }
                validatedEvents.push(validated);
            }

            safeLogger.info(LogComponent.TELEMETRY, 'analytics_batch_received', `Received batch of ${validatedEvents.length} events`, {
                count: validatedEvents.length,
                districtId,
            });

            return success(res, { message: `Batch of ${validatedEvents.length} events tracked successfully` });
        } else {
            const validated = validateAnalyticsPayload(body);

            if (typeof validated === "string") {
                safeLogger.warn(LogComponent.TELEMETRY, 'analytics_validation_failed', validated, { body });
                return failure(res, "VALIDATION_ERROR", validated, 400);
            }

            safeLogger.info(LogComponent.TELEMETRY, 'analytics_event_received', 'Analytics event received', {
                vendorId: validated.vendorId,
                eventType: validated.eventType,
                source: validated.source,
                action: validated.action,
                districtId,
            });

            return success(res, { message: "Event tracked successfully" });
        }
    } catch (err) {
        console.error("Analytics error:", err);
        safeLogger.error(LogComponent.TELEMETRY, 'analytics_processing_failed', 'Failed to process analytics event', {}, err);
        return failure(res, "PROCESSING_ERROR", "Failed to track analytics event", 500);
    }
});

export default router;
