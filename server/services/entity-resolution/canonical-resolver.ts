/**
 * ============================================
 * SOVEREIGN CANONICAL ENTITY RESOLVER
 * ============================================
 *
 * SINGLE SOURCE OF TRUTH for all entity lookups.
 *
 * Requirements:
 * - district-aware
 * - moderation-aware
 * - visibility-aware
 * - typed
 * - telemetry-enabled
 *
 * NO duplicate Prisma logic allowed across routes.
 * All routes MUST use these resolvers.
 */

import { prisma } from "../../storage";
import { safeLogger } from "../../lib/logging/safe-logger";
import { LogComponent } from "../../lib/logging/structured-logger";
import {
    EntityResolutionResult,
    EntityResolutionFailure,
    EntityResolutionDiagnostics,
} from "./types";

// ============================================
// LOG TAG
// ============================================
const COMPONENT = LogComponent.SYSTEM;
const TAG = '[CANONICAL_RESOLVER]';

// ============================================
// DIAGNOSTIC BUILDER
// ============================================

function buildDiagnostics(overrides: Partial<EntityResolutionDiagnostics>): EntityResolutionDiagnostics {
    return {
        requestId: overrides.requestId,
        districtId: overrides.districtId ?? null,
        entityId: overrides.entityId ?? null,
        entitySlug: overrides.entitySlug ?? null,
        moderationStatus: overrides.moderationStatus ?? null,
        districtOwnership: overrides.districtOwnership ?? null,
        visibilityState: overrides.visibilityState ?? null,
        vendorStatus: overrides.vendorStatus ?? null,
        vendorDistrictId: overrides.vendorDistrictId ?? null,
        vendorShadowBanned: overrides.vendorShadowBanned ?? null,
        productApproved: overrides.productApproved ?? null,
        productStatus: overrides.productStatus ?? null,
        queryTimestamp: new Date().toISOString(),
    };
}

// ============================================
// SLUG NORMALIZATION (Phase 4)
// ============================================

/**
 * Normalize a slug deterministically.
 * Must match the slugGenerator.generateSlug() algorithm.
 */
export function normalizeSlug(raw: string): string {
    return raw
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Validate that a slug conforms to canonical format.
 */
export function isValidSlug(slug: string): boolean {
    return /^[a-z0-9-]+$/.test(slug) && slug.length > 0 &&
        !slug.startsWith('-') && !slug.endsWith('-');
}

// ============================================
// VENDOR RESOLVERS
// ============================================

/**
 * PUBLIC_VENDOR_WHERE - canonical vendor visibility filter.
 * This is the SINGLE source of truth for vendor governance.
 */
const PUBLIC_VENDOR_WHERE = {
    status: 'APPROVED' as const,
    isShadowBanned: false,
};

/**
 * Canonical vendor visibility filter for Prisma queries.
 * Must be used by ALL vendor lookups.
 */
export function vendorVisibilityFilter(districtId?: number): any {
    const where: any = {
        ...PUBLIC_VENDOR_WHERE,
    };
    if (districtId !== undefined && districtId !== null) {
        where.districtId = districtId;
    }
    return where;
}

/**
 * Canonical product governance filter.
 * Products must be APPROVED/ACTIVE and belong to APPROVED, non-shadow-banned vendors.
 * District isolation uses Product.districtId directly (sovereign product model).
 */
export function productGovernanceFilter(districtId?: number): any {
    const where: any = {
        approved: true,
        status: { in: ['APPROVED', 'ACTIVE'] },
        vendor: {
            ...PUBLIC_VENDOR_WHERE,
        },
    };
    if (districtId !== undefined && districtId !== null) {
        // Sovereign product model: districtId lives on Product for direct district isolation
        where.districtId = districtId;
    }
    return where;
}

/**
 * RESOLVE VENDOR BY SLUG
 *
 * Canonical district-aware, moderation-aware vendor lookup by slug.
 * Returns structured result with failure diagnostics.
 */
export async function resolveVendorBySlug(
    slug: string,
    districtId: number,
    requestId?: string,
): Promise<EntityResolutionResult<any>> {
    const diagnostics: EntityResolutionDiagnostics = buildDiagnostics({
        requestId,
        districtId,
        entitySlug: slug,
        queryTimestamp: new Date().toISOString(),
    });

    try {
        // 1. Validate slug
        const normalizedSlug = normalizeSlug(slug);
        if (!normalizedSlug || !isValidSlug(normalizedSlug)) {
            diagnostics.entityId = slug;
            diagnostics.visibilityState = 'INVALID_SLUG';
            safeLogger.warn(COMPONENT, Tag('VENDOR_RESOLUTION_FAILED'),
                `Invalid slug format: "${slug}"`, { diagnostics });
            return {
                success: false,
                data: null,
                failure: {
                    reason: EntityResolutionFailure.INVALID_SLUG,
                    message: `Invalid vendor slug format: "${slug}"`,
                    diagnostics,
                },
            };
        }

        // 2. Attempt lookup with full governance filters
        diagnostics.entityId = normalizedSlug;

        const vendor = await prisma.vendor.findFirst({
            where: {
                slug: normalizedSlug,
                ...vendorVisibilityFilter(districtId),
            },
            include: {
                products: {
                    where: { approved: true, status: { in: ['APPROVED', 'ACTIVE'] } },
                    include: { images: true },
                },
            },
        });

        // 3. Handle not found
        if (!vendor) {
            // Check if vendor exists at all (without governance filters) for diagnostics
            const rawVendor = await prisma.vendor.findFirst({
                where: { slug: normalizedSlug },
                select: {
                    id: true,
                    status: true,
                    districtId: true,
                    isShadowBanned: true,
                },
            });

            if (!rawVendor) {
                diagnostics.moderationStatus = 'NONEXISTENT';
                safeLogger.warn(COMPONENT, Tag('VENDOR_RESOLUTION_FAILED'),
                    `Vendor not found for slug: "${normalizedSlug}" in district ${districtId}`,
                    { diagnostics });
                return {
                    success: false,
                    data: null,
                    failure: {
                        reason: EntityResolutionFailure.VENDOR_NOT_FOUND,
                        message: `Vendor "${slug}" not found`,
                        diagnostics,
                    },
                };
            }

            // Vendor exists but filtered out — determine why
            diagnostics.moderationStatus = rawVendor.status;
            diagnostics.districtOwnership = rawVendor.districtId;
            diagnostics.vendorStatus = rawVendor.status;
            diagnostics.vendorShadowBanned = rawVendor.isShadowBanned;

            if (rawVendor.status !== 'APPROVED') {
                safeLogger.warn(COMPONENT, Tag('VENDOR_RESOLUTION_FAILED'),
                    `Vendor "${slug}" found but unapproved (status=${rawVendor.status})`,
                    { diagnostics });
                return {
                    success: false,
                    data: null,
                    failure: {
                        reason: EntityResolutionFailure.VENDOR_UNAPPROVED,
                        message: `Vendor "${slug}" is not yet approved`,
                        diagnostics,
                    },
                };
            }

            if (rawVendor.isShadowBanned) {
                safeLogger.warn(COMPONENT, Tag('VENDOR_RESOLUTION_FAILED'),
                    `Vendor "${slug}" is shadow banned`,
                    { diagnostics });
                return {
                    success: false,
                    data: null,
                    failure: {
                        reason: EntityResolutionFailure.VENDOR_SHADOW_BANNED,
                        message: `Vendor "${slug}" is restricted`,
                        diagnostics,
                    },
                };
            }

            if (rawVendor.districtId !== districtId) {
                safeLogger.warn(COMPONENT, Tag('VENDOR_RESOLUTION_FAILED'),
                    `Vendor "${slug}" district mismatch: expected ${districtId}, got ${rawVendor.districtId}`,
                    { diagnostics });
                return {
                    success: false,
                    data: null,
                    failure: {
                        reason: EntityResolutionFailure.VENDOR_DISTRICT_MISMATCH,
                        message: `Vendor "${slug}" is not available in this district`,
                        diagnostics,
                    },
                };
            }

            // Catch-all: should not reach here
            return {
                success: false,
                data: null,
                failure: {
                    reason: EntityResolutionFailure.VENDOR_NOT_FOUND,
                    message: `Vendor "${slug}" not found (governance filtered)`,
                    diagnostics,
                },
            };
        }

        // 4. Success
        diagnostics.moderationStatus = vendor.status;
        diagnostics.districtOwnership = vendor.districtId;
        diagnostics.vendorStatus = vendor.status;
        diagnostics.vendorShadowBanned = vendor.isShadowBanned;
        diagnostics.entityId = vendor.id;

        safeLogger.info(COMPONENT, Tag('VENDOR_RESOLVED'),
            `Vendor resolved: id=${vendor.id} slug="${vendor.slug}" district=${vendor.districtId}`,
            { diagnostics });

        return {
            success: true,
            data: vendor,
        };
    } catch (error: any) {
        safeLogger.error(COMPONENT, Tag('VENDOR_RESOLUTION_FAILED'),
            `Exception resolving vendor slug="${slug}": ${error.message}`,
            { diagnostics }, error);
        return {
            success: false,
            data: null,
            failure: {
                reason: EntityResolutionFailure.VENDOR_NOT_FOUND,
                message: `Error resolving vendor: ${error.message}`,
                diagnostics,
            },
        };
    }
}

/**
 * RESOLVE VENDOR BY ID
 *
 * Canonical vendor lookup by numeric ID with governance filters.
 */
export async function resolveVendorById(
    vendorId: number,
    districtId: number,
    requestId?: string,
): Promise<EntityResolutionResult<any>> {
    const diagnostics: EntityResolutionDiagnostics = buildDiagnostics({
        requestId,
        districtId,
        entityId: vendorId,
        queryTimestamp: new Date().toISOString(),
    });

    try {
        if (!Number.isFinite(vendorId) || vendorId <= 0) {
            safeLogger.warn(COMPONENT, Tag('VENDOR_RESOLUTION_FAILED'),
                `Invalid vendor ID: ${vendorId}`, { diagnostics });
            return {
                success: false,
                data: null,
                failure: {
                    reason: EntityResolutionFailure.VENDOR_NOT_FOUND,
                    message: `Invalid vendor ID`,
                    diagnostics,
                },
            };
        }

        const vendor = await prisma.vendor.findFirst({
            where: {
                id: vendorId,
                ...vendorVisibilityFilter(districtId),
            },
            include: {
                products: {
                    where: { approved: true, status: { in: ['APPROVED', 'ACTIVE'] } },
                    include: { images: true },
                },
            },
        });

        if (!vendor) {
            diagnostics.moderationStatus = 'NONEXISTENT';
            safeLogger.warn(COMPONENT, Tag('VENDOR_RESOLUTION_FAILED'),
                `Vendor id=${vendorId} not found in district ${districtId}`,
                { diagnostics });
            return {
                success: false,
                data: null,
                failure: {
                    reason: EntityResolutionFailure.VENDOR_NOT_FOUND,
                    message: `Vendor #${vendorId} not found`,
                    diagnostics,
                },
            };
        }

        diagnostics.moderationStatus = vendor.status;
        diagnostics.districtOwnership = vendor.districtId;
        diagnostics.vendorStatus = vendor.status;
        diagnostics.vendorShadowBanned = vendor.isShadowBanned;

        safeLogger.info(COMPONENT, Tag('VENDOR_RESOLVED'),
            `Vendor resolved by id: id=${vendor.id} slug="${vendor.slug}"`,
            { diagnostics });

        return {
            success: true,
            data: vendor,
        };
    } catch (error: any) {
        safeLogger.error(COMPONENT, Tag('VENDOR_RESOLUTION_FAILED'),
            `Exception resolving vendor id=${vendorId}: ${error.message}`,
            { diagnostics }, error);
        return {
            success: false,
            data: null,
            failure: {
                reason: EntityResolutionFailure.VENDOR_NOT_FOUND,
                message: `Error resolving vendor: ${error.message}`,
                diagnostics,
            },
        };
    }
}

// ============================================
// PRODUCT RESOLVERS
// ============================================

/**
 * RESOLVE PRODUCT BY ID
 *
 * Canonical product lookup with full governance chain:
 * - Product must be approved/active
 * - Vendor must be approved/not shadow-banned
 * - District must match
 */
export async function resolveProductById(
    productId: number,
    districtId: number,
    requestId?: string,
): Promise<EntityResolutionResult<any>> {
    const diagnostics: EntityResolutionDiagnostics = buildDiagnostics({
        requestId,
        districtId,
        entityId: productId,
        queryTimestamp: new Date().toISOString(),
    });

    try {
        // 1. Validate product ID
        if (!Number.isFinite(productId) || productId <= 0) {
            diagnostics.visibilityState = 'INVALID_ID';
            safeLogger.warn(COMPONENT, Tag('PRODUCT_RESOLUTION_FAILED'),
                `Invalid product ID: ${productId}`, { diagnostics });
            return {
                success: false,
                data: null,
                failure: {
                    reason: EntityResolutionFailure.INVALID_PRODUCT_ID,
                    message: `Invalid product ID`,
                    diagnostics,
                },
            };
        }

        // 2. Attempt lookup with full governance
        const product = await prisma.product.findFirst({
            where: {
                id: productId,
                ...productGovernanceFilter(districtId),
            },
            include: {
                vendor: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        logo: true,
                        address: true,
                        phone: true,
                        rating: true,
                        dsslScore: true,
                        status: true,
                        districtId: true,
                        isShadowBanned: true,
                    },
                },
                images: true,
            },
        });

        // 3. Handle not found — determine why
        if (!product) {
            // Check raw product existence
            const rawProduct = await prisma.product.findUnique({
                where: { id: productId },
                select: {
                    id: true,
                    approved: true,
                    status: true,
                    vendorId: true,
                    districtId: true,
                },
            });

            if (!rawProduct) {
                diagnostics.moderationStatus = 'NONEXISTENT';
                safeLogger.warn(COMPONENT, Tag('PRODUCT_RESOLUTION_FAILED'),
                    `Product id=${productId} not found in DB`,
                    { diagnostics });
                return {
                    success: false,
                    data: null,
                    failure: {
                        reason: EntityResolutionFailure.PRODUCT_NOT_FOUND,
                        message: `Product #${productId} not found`,
                        diagnostics,
                    },
                };
            }

            diagnostics.productApproved = rawProduct.approved;
            diagnostics.productStatus = rawProduct.status;
            diagnostics.entityId = rawProduct.id;

            // Product exists but governance filtered
            if (!rawProduct.approved ||
                !['APPROVED', 'ACTIVE'].includes(rawProduct.status)) {
                safeLogger.warn(COMPONENT, Tag('PRODUCT_RESOLUTION_FAILED'),
                    `Product id=${productId} not approved (approved=${rawProduct.approved}, status=${rawProduct.status})`,
                    { diagnostics });
                return {
                    success: false,
                    data: null,
                    failure: {
                        reason: EntityResolutionFailure.PRODUCT_UNAPPROVED,
                        message: `Product #${productId} is not available`,
                        diagnostics,
                    },
                };
            }

            // Check vendor governance
            if (rawProduct.vendorId) {
                const rawVendor = await prisma.vendor.findUnique({
                    where: { id: rawProduct.vendorId },
                    select: { id: true, status: true, isShadowBanned: true, districtId: true },
                });

                if (rawVendor) {
                    diagnostics.vendorStatus = rawVendor.status;
                    diagnostics.vendorShadowBanned = rawVendor.isShadowBanned;
                    diagnostics.vendorDistrictId = rawVendor.districtId;

                    if (rawVendor.status !== 'APPROVED') {
                        safeLogger.warn(COMPONENT, Tag('PRODUCT_RESOLUTION_FAILED'),
                            `Product id=${productId} vendor id=${rawVendor.id} unapproved (status=${rawVendor.status})`,
                            { diagnostics });
                        return {
                            success: false,
                            data: null,
                            failure: {
                                reason: EntityResolutionFailure.PRODUCT_VENDOR_HIDDEN,
                                message: `Product #${productId} is not available (vendor restricted)`,
                                diagnostics,
                            },
                        };
                    }

                    if (rawVendor.districtId !== districtId) {
                        safeLogger.warn(COMPONENT, Tag('PRODUCT_RESOLUTION_FAILED'),
                            `Product id=${productId} vendor district mismatch: product district=${rawProduct.districtId}, vendor district=${rawVendor.districtId}, requested district=${districtId}`,
                            { diagnostics });
                        return {
                            success: false,
                            data: null,
                            failure: {
                                reason: EntityResolutionFailure.PRODUCT_DISTRICT_MISMATCH,
                                message: `Product #${productId} is not available in this district`,
                                diagnostics,
                            },
                        };
                    }
                }
            }

            diagnostics.visibilityState = 'GOVERNANCE_FILTERED';
            safeLogger.warn(COMPONENT, Tag('PRODUCT_RESOLUTION_FAILED'),
                `Product id=${productId} filtered by governance`,
                { diagnostics });
            return {
                success: false,
                data: null,
                failure: {
                    reason: EntityResolutionFailure.PRODUCT_NOT_FOUND,
                    message: `Product #${productId} not available`,
                    diagnostics,
                },
            };
        }

        // 4. Success
        diagnostics.productApproved = product.approved;
        diagnostics.productStatus = product.status;
        diagnostics.moderationStatus = product.vendor?.status ?? null;
        diagnostics.districtOwnership = product.vendor?.districtId ?? null;
        diagnostics.vendorStatus = product.vendor?.status ?? null;
        diagnostics.vendorDistrictId = product.vendor?.districtId ?? null;

        safeLogger.info(COMPONENT, Tag('PRODUCT_RESOLVED'),
            `Product resolved: id=${product.id} title="${product.title}" vendor="${product.vendor?.slug}" district=${districtId}`,
            { diagnostics });

        return {
            success: true,
            data: product,
        };
    } catch (error: any) {
        safeLogger.error(COMPONENT, Tag('PRODUCT_RESOLUTION_FAILED'),
            `Exception resolving product id=${productId}: ${error.message}`,
            { diagnostics }, error);
        return {
            success: false,
            data: null,
            failure: {
                reason: EntityResolutionFailure.PRODUCT_NOT_FOUND,
                message: `Error resolving product: ${error.message}`,
                diagnostics,
            },
        };
    }
}

/**
 * RESOLVE PRODUCT BY SLUG
 */
export async function resolveProductBySlug(
    slug: string,
    districtId: number,
    requestId?: string,
): Promise<EntityResolutionResult<any>> {
    const diagnostics: EntityResolutionDiagnostics = buildDiagnostics({
        requestId,
        districtId,
        entitySlug: slug,
        queryTimestamp: new Date().toISOString(),
    });

    try {
        const normalizedSlug = normalizeSlug(slug);
        if (!normalizedSlug || !isValidSlug(normalizedSlug)) {
            safeLogger.warn(COMPONENT, Tag('PRODUCT_RESOLUTION_FAILED'),
                `Invalid product slug format: "${slug}"`, { diagnostics });
            return {
                success: false,
                data: null,
                failure: {
                    reason: EntityResolutionFailure.INVALID_SLUG,
                    message: `Invalid product slug`,
                    diagnostics,
                },
            };
        }

        const product = await prisma.product.findFirst({
            where: {
                slug: normalizedSlug,
                ...productGovernanceFilter(districtId),
            },
            include: {
                vendor: true,
                images: true,
            },
        });

        if (!product) {
            diagnostics.moderationStatus = 'NONEXISTENT';
            safeLogger.warn(COMPONENT, Tag('PRODUCT_RESOLUTION_FAILED'),
                `Product slug="${slug}" not found in district ${districtId}`,
                { diagnostics });
            return {
                success: false,
                data: null,
                failure: {
                    reason: EntityResolutionFailure.PRODUCT_NOT_FOUND,
                    message: `Product "${slug}" not found`,
                    diagnostics,
                },
            };
        }

        diagnostics.productApproved = product.approved;
        diagnostics.productStatus = product.status;
        diagnostics.entityId = (product as any).id;

        safeLogger.info(COMPONENT, Tag('PRODUCT_RESOLVED'),
            `Product resolved by slug: id=${product.id} slug="${product.slug}"`,
            { diagnostics });

        return {
            success: true,
            data: product,
        };
    } catch (error: any) {
        safeLogger.error(COMPONENT, Tag('PRODUCT_RESOLUTION_FAILED'),
            `Exception resolving product slug="${slug}": ${error.message}`,
            { diagnostics }, error);
        return {
            success: false,
            data: null,
            failure: {
                reason: EntityResolutionFailure.PRODUCT_NOT_FOUND,
                message: `Error resolving product: ${error.message}`,
                diagnostics,
            },
        };
    }
}

// ============================================
// HELPER
// ============================================

function Tag(op: string): string {
    return `[ENTITY_RESOLUTION] ${op}`;
}

export default {
    resolveVendorBySlug,
    resolveVendorById,
    resolveProductById,
    resolveProductBySlug,
    normalizeSlug,
    isValidSlug,
    vendorVisibilityFilter,
    productGovernanceFilter,
};
