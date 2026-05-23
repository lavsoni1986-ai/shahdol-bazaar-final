/**
 * P0 — PRODUCTION DIAGNOSTICS AND TRACING
 *
 * Human-debuggable operational traces for checkout.
 * Every validation failure, auth transition, and API error produces a trace.
 *
 * Features:
 * - Checkout blocker tracing
 * - Validation failure tracing
 * - Request lifecycle tracing
 * - Auth lifecycle tracing
 * - Exportable diagnostics for support
 *
 * Designed for:
 * - Support-grade debugging
 * - Root cause analysis
 * - Merchant issue investigation
 */

import type { DiagnosticTrace, ValidationResult } from "./types";

// ─── TRACE STORAGE ───

const traces = new Map<string, DiagnosticTrace>();
const MAX_TRACES = 50; // Keep last 50 traces

/**
 * SOVEREIGN: Create a new diagnostic trace.
 * Returns the traceId for subsequent events.
 */
export function createTrace(scope: string): string {
    const traceId = `TRACE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const trace: DiagnosticTrace = {
        traceId,
        startedAt: new Date().toISOString(),
        scope,
        events: [],
        duration: 0,
        status: "success",
    };

    traces.set(traceId, trace);

    // Limit buffer size
    if (traces.size > MAX_TRACES) {
        const oldest = traces.keys().next().value;
        if (oldest) traces.delete(oldest);
    }

    return traceId;
}

/**
 * SOVEREIGN: Add an event to a trace.
 */
export function addTraceEvent(
    traceId: string,
    type: string,
    data: Record<string, unknown> = {}
): void {
    const trace = traces.get(traceId);
    if (!trace) {
        console.warn(`[DIAGNOSTICS] Trace ${traceId} not found`);
        return;
    }

    trace.events.push({
        timestamp: new Date().toISOString(),
        type,
        data,
    });
}

/**
 * SOVEREIGN: Mark a trace as failed.
 */
export function failTrace(traceId: string, reason: string): void {
    const trace = traces.get(traceId);
    if (!trace) return;

    trace.status = "failure";
    trace.duration = Date.now() - new Date(trace.startedAt).getTime();

    addTraceEvent(traceId, "failure", { reason });
}

/**
 * SOVEREIGN: Complete a trace successfully.
 */
export function completeTrace(traceId: string): void {
    const trace = traces.get(traceId);
    if (!trace) return;

    trace.duration = Date.now() - new Date(trace.startedAt).getTime();
    addTraceEvent(traceId, "complete", { duration: trace.duration });
}

/**
 * SOVEREIGN: Get a trace by ID.
 */
export function getTrace(traceId: string): DiagnosticTrace | undefined {
    return traces.get(traceId);
}

/**
 * SOVEREIGN: Get all recent traces.
 */
export function getAllTraces(): DiagnosticTrace[] {
    return Array.from(traces.values());
}

/**
 * SOVEREIGN: Export traces as formatted string for support.
 */
export function exportTraces(scope?: string): string {
    const relevantTraces = scope
        ? Array.from(traces.values()).filter((t) => t.scope === scope)
        : Array.from(traces.values());

    return JSON.stringify(relevantTraces, null, 2);
}

/**
 * SOVEREIGN: Clear all traces.
 */
export function clearTraces(): void {
    traces.clear();
}

// ─── CONVENIENCE TRACING FUNCTIONS ───

/**
 * Create a trace for a checkout blocker.
 */
export function traceCheckoutBlocker(traceId: string, validationResult: ValidationResult): void {
    addTraceEvent(traceId, "checkout_blocker", {
        scope: validationResult.scope,
        reason: validationResult.reason,
        message: validationResult.message,
        severity: validationResult.severity,
        errorCode: validationResult.errorCode,
    });
}

/**
 * Create a trace for a vendor validation failure.
 */
export function traceVendorValidation(traceId: string, vendorId: number, failed: boolean, reason?: string): void {
    addTraceEvent(traceId, "vendor_validation", {
        vendorId,
        failed,
        reason: reason || "unknown",
    });
}

/**
 * Create a trace for auth lifecycle.
 */
export function traceAuthLifecycle(traceId: string, event: string, data?: Record<string, unknown>): void {
    addTraceEvent(traceId, `auth.${event}`, data || {});
}

/**
 * Create a trace for request lifecycle.
 */
export function traceRequestLifecycle(
    traceId: string,
    event: string,
    data?: Record<string, unknown>
): void {
    addTraceEvent(traceId, `request.${event}`, data || {});
}

/**
 * Create a trace for cart lifecycle.
 */
export function traceCartLifecycle(
    traceId: string,
    event: string,
    data?: Record<string, unknown>
): void {
    addTraceEvent(traceId, `cart.${event}`, data || {});
}

/**
 * Generate a support summary from traces.
 */
export function generateSupportSummary(): string {
    const allTraces = getAllTraces();
    const failedTraces = allTraces.filter((t) => t.status === "failure");

    if (failedTraces.length === 0) {
        return "No failures detected. All traces show successful operations.";
    }

    let summary = `=== CHECKOUT SUPPORT SUMMARY ===\n`;
    summary += `Total Traces: ${allTraces.length}\n`;
    summary += `Failed Traces: ${failedTraces.length}\n\n`;

    for (const trace of failedTraces) {
        summary += `--- Trace: ${trace.traceId} ---\n`;
        summary += `Scope: ${trace.scope}\n`;
        summary += `Started: ${trace.startedAt}\n`;
        summary += `Duration: ${trace.duration}ms\n\n`;

        const failureEvents = trace.events.filter((e) => e.type === "failure");
        for (const event of failureEvents) {
            summary += `  Failure: ${JSON.stringify(event.data)}\n`;
        }

        const blockerEvents = trace.events.filter((e) => e.type === "checkout_blocker");
        for (const event of blockerEvents) {
            summary += `  Blocker: ${JSON.stringify(event.data)}\n`;
        }

        summary += "\n";
    }

    return summary;
}
