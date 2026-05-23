/**
 * P0 — SOVEREIGN CHECKOUT ORCHESTRATOR
 *
 * Single entry point for the entire checkout subsystem.
 * Wires together: validation, request governance, telemetry, diagnostics, reconciliation.
 *
 * Usage:
 * ```ts
 * import { validateThenAct, trackVendorCheck } from "@/checkout/orchestrator";
 *
 * // At checkout render time:
 * const report = validateThenAct(currentState);
 * if (!report.overall) return <RecoveryUI report={report} />;
 *
 * // At vendor fetch time:
 * const result = await trackVendorCheck(4, districtId);
 * ```
 */

export {
    // Validation
    validateCheckoutState,
} from "./validation";
export type { CheckoutValidationInput } from "./validation";

export {
    // Request governance
    governedRequest,
    cleanupContextRequests,
    registerContextAbort,
    isResponseStale,
} from "./request-governance";
export type { GovernedResponse } from "./request-governance";

export {
    // Telemetry
    trackEvent,
    trackVendorValidationFailed,
    trackVendor404,
    trackCartSanitization,
    trackAuthTransition,
    trackRecoveryMode,
    trackCheckoutSuccess,
    trackCheckoutFailure,
    trackErrorBoundaryCrash,
    trackAPIDegradation,
    configureTelemetry,
} from "./telemetry";

export {
    // Diagnostics
    createTrace,
    addTraceEvent,
    failTrace,
    completeTrace,
    getAllTraces,
    exportTraces,
    generateSupportSummary,
    traceCheckoutBlocker,
    traceVendorValidation,
} from "./diagnostics";

export {
    // Reconciliation
    reconcileCart,
    listenForCartChanges,
} from "./reconciliation";
export type { ReconciliationInput } from "./reconciliation";

export type {
    // Types
    CheckoutState,
    ValidationScope,
    ValidationResult,
    CheckoutValidationReport,
    RecoveryAction,
    CartItemShape,
    CartReconciliationResult,
    RequestConfig,
    RequestGovernanceEvent,
    TelemetryEvent,
    TelemetryLevel,
    DiagnosticTrace,
} from "./types";
