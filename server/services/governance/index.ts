/**
 * ============================================
 * 🛡️ BHARATOS SOVEREIGN GOVERNANCE LAYER
 * ============================================
 *
 * This is the gatekeeper for all sovereign entity operations.
 * Every mutation passes through governance validation.
 *
 * Exports:
 * - Product governance (district integrity, creation validation)
 * - Governance error types
 * - Integrity scanning utilities
 */
export * from './errors';
export * from './product-governance';
