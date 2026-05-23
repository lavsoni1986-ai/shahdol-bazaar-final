/**
 * ============================================
 * SOVEREIGN ENTITY RESOLUTION TYPES
 * ============================================
 * Single source of truth for resolution diagnostics.
 * Every entity lookup produces a structured result.
 */

/**
 * Canonical failure reasons for entity resolution.
 * NO generic 404s allowed - every failure must have a reason.
 */
export enum EntityResolutionFailure {
    VENDOR_NOT_FOUND = 'VENDOR_NOT_FOUND',
    VENDOR_UNAPPROVED = 'VENDOR_UNAPPROVED',
    VENDOR_SHADOW_BANNED = 'VENDOR_SHADOW_BANNED',
    VENDOR_DISTRICT_MISMATCH = 'VENDOR_DISTRICT_MISMATCH',
    VENDOR_SOFT_DELETED = 'VENDOR_SOFT_DELETED',
    VENDOR_MISSING_SLUG = 'VENDOR_MISSING_SLUG',

    PRODUCT_NOT_FOUND = 'PRODUCT_NOT_FOUND',
    PRODUCT_SOFT_DELETED = 'PRODUCT_SOFT_DELETED',
    PRODUCT_UNAPPROVED = 'PRODUCT_UNAPPROVED',
    PRODUCT_VENDOR_HIDDEN = 'PRODUCT_VENDOR_HIDDEN',
    PRODUCT_DISTRICT_MISMATCH = 'PRODUCT_DISTRICT_MISMATCH',

    INVALID_SLUG = 'INVALID_SLUG',
    INVALID_PRODUCT_ID = 'INVALID_PRODUCT_ID',
    DISTRICT_REQUIRED = 'DISTRICT_REQUIRED',
    DISTRICT_NOT_RESOLVED = 'DISTRICT_NOT_RESOLVED',
}

/**
 * Structured result for entity resolution.
 * Every resolution returns this - success or failure.
 */
export interface EntityResolutionResult<T> {
    success: boolean;
    data: T | null;
    failure?: {
        reason: EntityResolutionFailure;
        message: string;
        diagnostics: EntityResolutionDiagnostics;
    };
}

/**
 * Diagnostics payload for every resolution attempt.
 * Enables support-grade debugging.
 */
export interface EntityResolutionDiagnostics {
    requestId?: string;
    districtId: number | null;
    entityId: number | null | string;
    entitySlug: string | null;
    moderationStatus: string | null;
    districtOwnership: number | null;
    visibilityState: string | null;
    vendorStatus: string | null;
    vendorDistrictId: number | null;
    vendorShadowBanned: boolean | null;
    productApproved: boolean | null;
    productStatus: string | null;
    queryTimestamp: string;
}
