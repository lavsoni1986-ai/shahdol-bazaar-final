/**
 * ============================================
 * 🛡️ SOVEREIGN GOVERNANCE ERROR TYPES
 * ============================================
 *
 * BharatOS Phase P0 — Structured failure diagnostics
 * for governance violations.
 *
 * Every governance breach produces a typed error
 * with full context for observability.
 */

/**
 * Base governance violation.
 * Thrown when any sovereign integrity check fails.
 */
export class GovernanceViolation extends Error {
    public readonly code: string;
    public readonly timestamp: string;

    constructor(message: string, code: string) {
        super(message);
        this.name = 'GovernanceViolation';
        this.code = code;
        this.timestamp = new Date().toISOString();
    }
}

/**
 * Product has no districtId when it should.
 * Indicates an orphan product that skipped governance.
 */
export class OrphanProductError extends GovernanceViolation {
    public readonly productId: number;

    constructor(message: string, productId: number) {
        super(message, 'ORPHAN_PRODUCT');
        this.name = 'OrphanProductError';
        this.productId = productId;
    }
}

/**
 * Product.districtId !== Vendor.districtId
 * Indicates a district misalignment breach.
 */
export class DistrictMismatchError extends GovernanceViolation {
    public readonly productId: number | null;
    public readonly productDistrictId: number;
    public readonly vendorDistrictId: number;

    constructor(
        message: string,
        productId: number | null,
        productDistrictId: number,
        vendorDistrictId: number,
    ) {
        super(message, 'DISTRICT_MISMATCH');
        this.name = 'DistrictMismatchError';
        this.productId = productId;
        this.productDistrictId = productDistrictId;
        this.vendorDistrictId = vendorDistrictId;
    }
}

/**
 * Product mutation blocked by governance.
 * Used when creation/update violates sovereignty rules.
 */
export class MutationBlockedError extends GovernanceViolation {
    public readonly entityType: string;
    public readonly entityId: number | null;
    public readonly reason: string;

    constructor(
        message: string,
        entityType: string,
        entityId: number | null,
        reason: string,
    ) {
        super(message, 'MUTATION_BLOCKED');
        this.name = 'MutationBlockedError';
        this.entityType = entityType;
        this.entityId = entityId;
        this.reason = reason;
    }
}

export default {
    GovernanceViolation,
    OrphanProductError,
    DistrictMismatchError,
    MutationBlockedError,
};
