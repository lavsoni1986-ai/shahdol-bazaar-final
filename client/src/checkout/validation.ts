/**
 * P0 — CENTRALIZED CHECKOUT VALIDATION ENGINE
 * 
 * Single source of truth for ALL checkout validation logic.
 * NO scattered validation across checkout.tsx, sovereign-gate, state-machine, cart-context.
 * 
 * Principles:
 * - ONE validateCheckoutState() — every consumer calls the same function
 * - Structured results (ValidationResult[]) — NOT booleans
 * - Every scope has exact error codes
 * - Designed for both render-time and action-time validation
 * - Recovery-aware — returns actionable recovery recommendations
 */

import type {
    ValidationScope,
    ValidationResult,
    CheckoutValidationReport,
    RecoveryAction,
} from "./types";

export interface CheckoutValidationInput {
    /** Auth state */
    authInitialized: boolean;
    authLoading: boolean;
    authState: string;
    /** User */
    userId?: number | null;
    /** Cart */
    cartHydrated: boolean;
    cartItems: Array<{
        id: string | number;
        productId?: number | null;
        vendorId?: number | null;
        quantity: number;
        price: number;
        name: string;
    }>;
    /** District */
    districtReady: boolean;
    districtId?: number | null;
    districtSlug?: string | null;
    /** Vendor validation results (from vendor validation service) */
    vendorValidationResults?: Array<{
        vendorId: number;
        valid: boolean;
        reason?: string;
    }>;
    /** Product validation results */
    productValidationResults?: Array<{
        productId: number;
        valid: boolean;
        reason?: string;
    }>;
}

/**
 * SOVEREIGN: Centralized checkout validation.
 * 
 * Called by:
 * - CheckoutSovereignGate (render gating)
 * - checkout.tsx handlePlaceOrder (pre-submit guard)
 * - Cart.tsx (pre-navigation guard)
 * - useCheckoutReady hook
 * 
 * EVERY consumer must call this. NO inline validation allowed.
 */
export function validateCheckoutState(input: CheckoutValidationInput): CheckoutValidationReport {
    const scopes: ValidationResult[] = [];

    // ── SCOPE: Auth ──
    scopes.push(validateAuth(input));

    // ── SCOPE: Cart ──
    scopes.push(validateCart(input));

    // ── SCOPE: District ──
    scopes.push(validateDistrict(input));

    // ── SCOPE: Vendor ──
    scopes.push(...validateVendors(input));

    // ── SCOPE: Product ──
    scopes.push(...validateProducts(input));

    const errors = scopes.filter((s) => !s.valid && s.severity === "error");
    const warnings = scopes.filter((s) => !s.valid && s.severity === "warning");
    const overall = errors.length === 0;
    const requiresRecovery = errors.some((e) =>
        ["cart_invalid_items", "vendor_not_found", "product_not_found", "cart_empty_after_sanitization"].includes(e.reason)
    );

    const recoveryActions: RecoveryAction[] = buildRecoveryActions(overall, requiresRecovery, scopes);

    return {
        overall,
        scopes,
        errors,
        warnings,
        requiresRecovery,
        recoveryActions,
    };
}

// ─── SCOPE VALIDATORS ───
// Each is a pure function. NO side effects. NO external dependencies.
// This makes them testable, deterministic, and portable.

function validateAuth(input: CheckoutValidationInput): ValidationResult {
    if (!input.authInitialized) {
        return {
            scope: "auth",
            valid: false,
            severity: "error",
            reason: "auth_not_initialized",
            message: "Authentication system is still initializing. Please wait.",
            errorCode: "AUTH_001",
        };
    }
    if (input.authLoading) {
        return {
            scope: "auth",
            valid: false,
            severity: "error",
            reason: "auth_still_loading",
            message: "Session verification in progress.",
            errorCode: "AUTH_002",
        };
    }
    if (input.authState === "loading") {
        return {
            scope: "auth",
            valid: false,
            severity: "error",
            reason: "auth_state_loading",
            message: "Authentication state has not stabilized.",
            errorCode: "AUTH_003",
        };
    }
    if (input.authState !== "authenticated") {
        return {
            scope: "auth",
            valid: false,
            severity: "error",
            reason: "auth_required",
            message: "You must be logged in to complete your checkout.",
            errorCode: "AUTH_004",
        };
    }
    return {
        scope: "auth",
        valid: true,
        severity: "info",
        reason: "auth_ready",
        message: "Authentication confirmed.",
    };
}

function validateCart(input: CheckoutValidationInput): ValidationResult {
    if (!input.cartHydrated) {
        return {
            scope: "cart",
            valid: false,
            severity: "error",
            reason: "cart_not_hydrated",
            message: "Shopping cart has not been restored yet.",
            errorCode: "CART_001",
        };
    }

    if (input.cartItems.length === 0) {
        return {
            scope: "cart",
            valid: false,
            severity: "warning",
            reason: "cart_empty",
            message: "Your cart is empty. Add items before checkout.",
            errorCode: "CART_002",
        };
    }

    // Validate individual items
    for (const item of input.cartItems) {
        if (!item.vendorId || item.vendorId <= 0) {
            return {
                scope: "cart",
                valid: false,
                severity: "error",
                reason: "cart_item_missing_vendor",
                message: `"${item.name}" has no vendor information. It may no longer be available.`,
                details: { itemId: item.id, itemName: item.name },
                errorCode: "CART_003",
            };
        }
        if (!item.productId || item.productId <= 0) {
            return {
                scope: "cart",
                valid: false,
                severity: "error",
                reason: "cart_item_missing_product",
                message: `"${item.name}" has no product information.`,
                details: { itemId: item.id, itemName: item.name },
                errorCode: "CART_004",
            };
        }
        const qty = Number(item.quantity);
        if (isNaN(qty) || qty <= 0) {
            return {
                scope: "cart",
                valid: false,
                severity: "error",
                reason: "cart_item_invalid_quantity",
                message: `"${item.name}" has an invalid quantity.`,
                details: { itemId: item.id, itemName: item.name, quantity: item.quantity },
                errorCode: "CART_005",
            };
        }
        const price = Number(item.price);
        if (isNaN(price) || price < 0) {
            return {
                scope: "cart",
                valid: false,
                severity: "error",
                reason: "cart_item_invalid_price",
                message: `"${item.name}" has an invalid price.`,
                details: { itemId: item.id, itemName: item.name, price: item.price },
                errorCode: "CART_006",
            };
        }
    }

    return {
        scope: "cart",
        valid: true,
        severity: "info",
        reason: "cart_ready",
        message: `${input.cartItems.length} item(s) validated.`,
    };
}

function validateDistrict(input: CheckoutValidationInput): ValidationResult {
    if (!input.districtReady) {
        return {
            scope: "district",
            valid: false,
            severity: "error",
            reason: "district_not_ready",
            message: "District information is still loading.",
            errorCode: "DIST_001",
        };
    }
    if (!input.districtId || input.districtId <= 0) {
        return {
            scope: "district",
            valid: false,
            severity: "error",
            reason: "district_no_id",
            message: "District identifier is missing. Checkout requires a valid district.",
            details: { districtId: input.districtId, districtSlug: input.districtSlug },
            errorCode: "DIST_002",
        };
    }
    return {
        scope: "district",
        valid: true,
        severity: "info",
        reason: "district_ready",
        message: `District ${input.districtSlug || input.districtId} confirmed.`,
    };
}

function validateVendors(input: CheckoutValidationInput): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (!input.vendorValidationResults || input.vendorValidationResults.length === 0) {
        // No explicit vendor validation results — check cart items have vendorIds
        const cartItemsWithoutVendor = input.cartItems.filter((i) => !i.vendorId || i.vendorId <= 0);
        if (cartItemsWithoutVendor.length > 0) {
            results.push({
                scope: "vendor",
                valid: false,
                severity: "error",
                reason: "vendor_missing_from_cart",
                message: `${cartItemsWithoutVendor.length} item(s) are missing vendor details.`,
                details: { affectedItems: cartItemsWithoutVendor.map((i) => i.id) },
                errorCode: "VND_001",
            });
        }
        // If all items have vendorIds but no validation results, assume pass
        if (results.length === 0) {
            results.push({
                scope: "vendor",
                valid: true,
                severity: "info",
                reason: "vendor_ids_present",
                message: "All items have vendor identifiers.",
            });
        }
        return results;
    }

    const failedVendors = input.vendorValidationResults.filter((v) => !v.valid);
    if (failedVendors.length > 0) {
        results.push({
            scope: "vendor",
            valid: false,
            severity: "error",
            reason: "vendor_validation_failed",
            message: `${failedVendors.length} vendor(s) failed validation.`,
            details: {
                failedVendors: failedVendors.map((v) => ({
                    vendorId: v.vendorId,
                    reason: v.reason || "unknown",
                })),
            },
            errorCode: "VND_002",
        });
    }

    if (results.length === 0) {
        results.push({
            scope: "vendor",
            valid: true,
            severity: "info",
            reason: "vendor_all_valid",
            message: "All vendors validated successfully.",
        });
    }

    return results;
}

function validateProducts(input: CheckoutValidationInput): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (!input.productValidationResults || input.productValidationResults.length === 0) {
        // No explicit product validation — check cart items have productIds
        const itemsWithoutProduct = input.cartItems.filter((i) => !i.productId || i.productId <= 0);
        if (itemsWithoutProduct.length > 0) {
            results.push({
                scope: "product",
                valid: false,
                severity: "error",
                reason: "product_missing_from_cart",
                message: `${itemsWithoutProduct.length} item(s) are missing product details.`,
                details: { affectedItems: itemsWithoutProduct.map((i) => i.id) },
                errorCode: "PRD_001",
            });
        }
        if (results.length === 0) {
            results.push({
                scope: "product",
                valid: true,
                severity: "info",
                reason: "product_ids_present",
                message: "All items have product identifiers.",
            });
        }
        return results;
    }

    const failedProducts = input.productValidationResults.filter((p) => !p.valid);
    if (failedProducts.length > 0) {
        results.push({
            scope: "product",
            valid: false,
            severity: "error",
            reason: "product_validation_failed",
            message: `${failedProducts.length} product(s) failed validation.`,
            details: {
                failedProducts: failedProducts.map((p) => ({
                    productId: p.productId,
                    reason: p.reason || "unknown",
                })),
            },
            errorCode: "PRD_002",
        });
    }

    if (results.length === 0) {
        results.push({
            scope: "product",
            valid: true,
            severity: "info",
            reason: "product_all_valid",
            message: "All products validated successfully.",
        });
    }

    return results;
}

// ─── RECOVERY ACTIONS ───

function buildRecoveryActions(
    overall: boolean,
    requiresRecovery: boolean,
    scopes: ValidationResult[]
): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    if (overall) return actions;

    if (requiresRecovery) {
        actions.push({
            type: "clear_cart",
            label: "Clear Cart Cache",
            description: "Remove invalid items and refresh the page.",
        });
    }

    actions.push({
        type: "retry",
        label: "Try Again",
        description: "Retry the current operation.",
    });

    const hasAuthError = scopes.some(
        (s) => s.scope === "auth" && !s.valid
    );
    if (hasAuthError) {
        actions.push({
            type: "relogin",
            label: "Re-login",
            description: "Your session may have expired. Please log in again.",
        });
    }

    const hasDistrictError = scopes.some(
        (s) => s.scope === "district" && !s.valid
    );
    if (hasDistrictError) {
        actions.push({
            type: "change_district",
            label: "Change District",
            description: "The current district could not be validated.",
        });
    }

    actions.push({
        type: "contact_support",
        label: "Contact Support",
        description: "If the issue persists, please contact customer support.",
    });

    return actions;
}
