/**
 * SOVEREIGN CHECKOUT TYPE SYSTEM
 * 
 * Canonical type definitions for the entire checkout domain.
 * NO scattered type definitions — single source of truth.
 * 
 * Domain: Checkout orchestration, validation, state machine.
 * Scope: BharatOS sovereign commerce checkout system.
 */

// ─── STATE MACHINE ───

/**
 * SOVEREIGN: Explicit checkout state machine.
 * NOT scattered booleans. Every transition is deliberate.
 */
export type CheckoutState =
    | "initializing"
    | "ready"
    | "submitting"
    | "recovery"
    | "completed";

// ─── VALIDATION ───

/**
 * Validation scope identifiers for traceability.
 * Each maps to a domain in the checkoutsystem.
 */
export type ValidationScope =
    | "auth"
    | "cart"
    | "vendor"
    | "product"
    | "district"
    | "payment"
    | "order"
    | "recovery";

/**
 * SOVEREIGN: Structured validation result — NOT a boolean.
 * Includes scope, severity, and human-readable context.
 */
export interface ValidationResult {
    /** Which domain this validation covers */
    scope: ValidationScope;
    /** Whether validation passed */
    valid: boolean;
    /** Severity level */
    severity: "error" | "warning" | "info";
    /** Machine-readable reason code */
    reason: string;
    /** Human-readable message for recovery UX */
    message: string;
    /** Optional details for diagnostics */
    details?: Record<string, unknown>;
    /** Unique error code for support tracing */
    errorCode?: string;
}

/**
 * Aggregate validation result for the entire checkout flow.
 */
export interface CheckoutValidationReport {
    /** Overall validity (ALL scopes must pass) */
    overall: boolean;
    /** Per-scope validation results */
    scopes: ValidationResult[];
    /** Errors only (filtered for quick access) */
    errors: ValidationResult[];
    /** Warnings only */
    warnings: ValidationResult[];
    /** Whether recovery mode is recommended */
    requiresRecovery: boolean;
    /** Recommended recovery actions */
    recoveryActions: RecoveryAction[];
}

/**
 * Recovery action for invalid checkout state.
 */
export interface RecoveryAction {
    type: "retry" | "clear_cart" | "relogin" | "change_district" | "contact_support";
    label: string;
    description: string;
}

// ─── CART ITEM SHAPE (independent of CartContext to avoid type coupling) ───

export interface CartItemShape {
    id: string | number;
    productId?: number | null;
    vendorId?: number | null;
    quantity: number;
    price: number;
    name: string;
}

export interface CartReconciliationResult {
    /** Items that passed all checks */
    validItems: CartItemShape[];
    /** Items removed during reconciliation */
    removedItems: CartItemShape[];
    /** Count of items removed */
    removedCount: number;
    /** Human-readable summary */
    summary: string;
    /** Detailed reasons for each removal */
    reasons: string[];
}

// ─── REQUEST GOVERNANCE ───

export interface RequestConfig {
    /** Request timeout in ms */
    timeout?: number;
    /** Number of retry attempts */
    retries?: number;
    /** Retry delay in ms */
    retryDelay?: number;
    /** AbortSignal for cancellation */
    signal?: AbortSignal;
    /** Whether to deduplicate in-flight requests */
    deduplicate?: boolean;
    /** Cache key for deduplication */
    cacheKey?: string;
    /** Priority for request queuing */
    priority?: "high" | "normal" | "low";
}

export interface RequestGovernanceEvent {
    type: "start" | "success" | "error" | "timeout" | "cancelled" | "deduplicated";
    url: string;
    method: string;
    duration: number;
    statusCode?: number;
    error?: string;
    requestId: string;
}

// ─── TELEMETRY ───

export interface TelemetryEvent {
    /** Event name in dot-notation (e.g., "checkout.vendor.validation_failed") */
    event: string;
    /** When the event occurred */
    timestamp: string;
    /** Event severity */
    level: "debug" | "info" | "warn" | "error";
    /** Structured metadata */
    metadata: Record<string, unknown>;
    /** Session identifier for tracing */
    sessionId?: string;
    /** User identifier */
    userId?: number | string;
    /** Request identifier for correlation */
    requestId?: string;
}

export type TelemetryLevel = "debug" | "info" | "warn" | "error";

// ─── DIAGNOSTICS ───

export interface DiagnosticTrace {
    /** Unique trace ID */
    traceId: string;
    /** When the trace started */
    startedAt: string;
    /** Scope being traced */
    scope: string;
    /** Events in chronological order */
    events: Array<{
        timestamp: string;
        type: string;
        data: Record<string, unknown>;
    }>;
    /** Duration in ms */
    duration: number;
    /** Final status */
    status: "success" | "failure" | "timeout";
}
