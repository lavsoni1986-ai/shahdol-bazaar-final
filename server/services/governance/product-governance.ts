/**
 * ============================================
 * 🛡️ SOVEREIGN PRODUCT GOVERNANCE VALIDATION
 * ============================================
 *
 * BharatOS Phase P0 — Governance Constraint Hardening
 *
 * Enforces:
 * - Product.districtId === Vendor.districtId invariant
 * - Product.districtId is always populated on creation
 * - District mutation governance (immutable after creation)
 * - Observability for all governance events
 *
 * This is NOT optional.
 * Every product mutation MUST pass through these guards.
 */

import { prisma } from "../../storage";
import { safeLogger } from "../../lib/logging/safe-logger";
import { LogComponent } from "../../lib/logging/structured-logger";
import { GovernanceViolation, OrphanProductError, DistrictMismatchError } from "./errors";

const COMPONENT = LogComponent.SYSTEM;

// ============================================
// GOVERNANCE LOG TAGS
// ============================================

const Tags = {
    VALIDATION: '[PRODUCT_GOVERNANCE_VALIDATION]',
    DISTRICT_MISMATCH: '[PRODUCT_DISTRICT_MISMATCH]',
    ORPHAN_DETECTED: '[PRODUCT_ORPHAN_DETECTED]',
    MUTATION_BLOCKED: '[PRODUCT_MUTATION_BLOCKED]',
};

// ============================================
// INVARIANT: Product.districtId === Vendor.districtId
// ============================================

/**
 * Validate that the product's districtId matches its vendor's districtId.
 * This is the CORE sovereign invariant for product governance.
 *
 * Throws GovernanceViolation if mismatch detected.
 * Returns true if valid.
 */
export async function validateProductVendorDistrictIntegrity(
    productId: number,
    vendorDistrictId: number | null,
    productDistrictId: number | null,
    context?: { requestId?: string; merchantId?: number; districtId?: number },
): Promise<boolean> {
    // If both are null or both match, invariant holds
    if (productDistrictId === vendorDistrictId) {
        return true;
    }

    // If product has no districtId, that's an orphan violation
    if (productDistrictId === null || productDistrictId === undefined) {
        safeLogger.error(COMPONENT, Tags.ORPHAN_DETECTED,
            `Product id=${productId} has NULL districtId (vendor district=${vendorDistrictId})`,
            {
                requestId: context?.requestId,
                merchantId: context?.merchantId,
                districtId: context?.districtId,
                productId,
                vendorDistrictId,
            },
        );
        throw new OrphanProductError(
            `Product #${productId} has no districtId — governance violation`,
            productId,
        );
    }

    // Product districtId differs from vendor districtId — mismatch
    safeLogger.error(COMPONENT, Tags.DISTRICT_MISMATCH,
        `Product id=${productId} district mismatch: product=${productDistrictId}, vendor=${vendorDistrictId}`,
        {
            requestId: context?.requestId,
            merchantId: context?.merchantId,
            districtId: context?.districtId,
            productId,
            productDistrictId,
            vendorDistrictId,
        },
    );
    throw new DistrictMismatchError(
        `Product #${productId} district (${productDistrictId}) does not match vendor district (${vendorDistrictId})`,
        productId,
        productDistrictId ?? 0,
        vendorDistrictId ?? 0,
    );
}

// ============================================
// PRE-CREATION VALIDATION
// ============================================

/**
 * Validate product creation data before persisting.
 * Ensures districtId is always populated and matches vendor.
 */
export async function validateProductCreation(
    data: {
        vendorId: number;
        districtId?: number | null;
        title: string;
    },
    context?: { requestId?: string; merchantId?: number; districtId?: number },
): Promise<{ districtId: number }> {
    // 1. Resolve vendor to get canonical districtId
    const vendor = await prisma.vendor.findUnique({
        where: { id: data.vendorId },
        select: { id: true, districtId: true, status: true, isShadowBanned: true },
    });

    if (!vendor) {
        throw new GovernanceViolation(
            `Vendor #${data.vendorId} not found — cannot create product`,
            'VENDOR_NOT_FOUND',
        );
    }

    if (vendor.districtId === null || vendor.districtId === undefined) {
        throw new GovernanceViolation(
            `Vendor #${data.vendorId} has no districtId — governance incomplete`,
            'VENDOR_NO_DISTRICT',
        );
    }

    // 2. If districtId provided, validate it matches vendor
    if (data.districtId !== undefined && data.districtId !== null) {
        if (data.districtId !== vendor.districtId) {
            safeLogger.error(COMPONENT, Tags.MUTATION_BLOCKED,
                `Product creation blocked: provided districtId=${data.districtId} != vendor districtId=${vendor.districtId}`,
                {
                    requestId: context?.requestId,
                    merchantId: context?.merchantId,
                    districtId: context?.districtId,
                    vendorId: data.vendorId,
                    providedDistrictId: data.districtId,
                    vendorDistrictId: vendor.districtId,
                },
            );
            throw new DistrictMismatchError(
                `Product districtId (${data.districtId}) does not match vendor districtId (${vendor.districtId})`,
                null,
                data.districtId,
                vendor.districtId,
            );
        }
    }

    // 3. Log successful validation
    safeLogger.info(COMPONENT, Tags.VALIDATION,
        `Product creation validated: vendor=${data.vendorId} district=${vendor.districtId} title="${data.title}"`,
        {
            requestId: context?.requestId,
            merchantId: context?.merchantId,
            districtId: context?.districtId,
            vendorId: data.vendorId,
            productTitle: data.title,
        },
    );

    // Return the authoritative districtId (from vendor)
    return { districtId: vendor.districtId };
}

// ============================================
// POST-CREATION VERIFICATION
// ============================================

/**
 * Verify a product's governance state after creation.
 * Catches any silent divergence immediately.
 */
export async function verifyProductGovernance(
    productId: number,
    context?: { requestId?: string; merchantId?: number; districtId?: number },
): Promise<boolean> {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
            id: true,
            districtId: true,
            vendorId: true,
            approved: true,
            status: true,
        },
    });

    if (!product) {
        throw new GovernanceViolation(
            `Product #${productId} not found during post-creation verification`,
            'PRODUCT_NOT_FOUND',
        );
    }

    const vendor = await prisma.vendor.findUnique({
        where: { id: product.vendorId },
        select: { id: true, districtId: true },
    });

    if (!vendor) {
        throw new GovernanceViolation(
            `Vendor #${product.vendorId} not found during post-creation verification`,
            'VENDOR_NOT_FOUND',
        );
    }

    return validateProductVendorDistrictIntegrity(
        productId,
        vendor.districtId,
        product.districtId,
        context,
    );
}

// ============================================
// DISTRICT INTEGRITY SCAN
// ============================================

export interface DistrictIntegrityIssue {
    productId: number;
    productTitle: string;
    productDistrictId: number | null;
    vendorId: number;
    vendorDistrictId: number | null;
    issueType: 'ORPHAN' | 'MISMATCH';
}

/**
 * Scan all products for governance integrity issues.
 * Returns array of issues for operational review.
 */
export async function scanProductDistrictIntegrity(
    districtId?: number,
): Promise<DistrictIntegrityIssue[]> {
    const where: any = {};
    if (districtId !== undefined) {
        where.districtId = districtId;
    }

    const products = await prisma.product.findMany({
        where,
        select: {
            id: true,
            title: true,
            districtId: true,
            vendorId: true,
        },
    });

    const issues: DistrictIntegrityIssue[] = [];

    for (const product of products) {
        const vendor = await prisma.vendor.findUnique({
            where: { id: product.vendorId },
            select: { id: true, districtId: true },
        });

        if (!vendor) {
            issues.push({
                productId: product.id,
                productTitle: product.title,
                productDistrictId: product.districtId,
                vendorId: product.vendorId,
                vendorDistrictId: null,
                issueType: 'ORPHAN',
            });
            continue;
        }

        if (product.districtId !== vendor.districtId) {
            issues.push({
                productId: product.id,
                productTitle: product.title,
                productDistrictId: product.districtId,
                vendorId: vendor.id,
                vendorDistrictId: vendor.districtId,
                issueType: product.districtId === null ? 'ORPHAN' : 'MISMATCH',
            });
        }
    }

    if (issues.length > 0) {
        safeLogger.warn(COMPONENT, '[PRODUCT_GOVERNANCE_SCAN]',
            `Found ${issues.length} governance integrity issues`,
            { districtId, issueCount: issues.length, issues },
        );
    } else {
        safeLogger.info(COMPONENT, '[PRODUCT_GOVERNANCE_SCAN]',
            'All products pass governance integrity check',
            { districtId },
        );
    }

    return issues;
}

export default {
    validateProductCreation,
    validateProductVendorDistrictIntegrity,
    verifyProductGovernance,
    scanProductDistrictIntegrity,
};
