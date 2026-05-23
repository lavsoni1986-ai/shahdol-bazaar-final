/**
 * MIGRATION CONTROL FLAGS
 *
 * Enterprise-grade feature flags for controlled migration.
 * Enables gradual rollout and instant rollback capabilities.
 */

// ============================================
// ORDER ENGINE VERSION CONTROL
// ============================================

export enum OrderEngineVersion {
  LEGACY = 'legacy',           // Old single-item orders
  SOVEREIGN = 'sovereign'      // New basket orders with financial authority
}

export const ORDER_ENGINE_VERSION: OrderEngineVersion =
  (process.env.ORDER_ENGINE_VERSION as OrderEngineVersion) ||
  OrderEngineVersion.LEGACY; // Default to legacy for safety

// ============================================
// MIGRATION PHASE FLAGS
// ============================================

export const MIGRATION_FLAGS = {
  // Phase 1: Legacy freeze (read-only)
  LEGACY_READ_ONLY: process.env.LEGACY_READ_ONLY === 'true' || true, // Default true for safety

  // Phase 2: Sovereign engine activation
  SOVEREIGN_ENGINE_ACTIVE: ORDER_ENGINE_VERSION === OrderEngineVersion.SOVEREIGN,

  // Phase 3: Migration observability
  MIGRATION_OBSERVABILITY: process.env.MIGRATION_OBSERVABILITY === 'true' || false,

  // Phase 4: Financial ledger
  FINANCIAL_LEDGER_ACTIVE: process.env.FINANCIAL_LEDGER_ACTIVE === 'true' || false,

  // Emergency rollback flags
  FORCE_LEGACY_MODE: process.env.FORCE_LEGACY_MODE === 'true' || false,
  MAINTENANCE_MODE: process.env.MAINTENANCE_MODE === 'true' || false,
};

// ============================================
// MIGRATION LOGGING
// ============================================

export function logMigrationEvent(event: string, data: any) {
  console.log(`🔄 [MIGRATION:${ORDER_ENGINE_VERSION.toUpperCase()}] ${event}`, data);
}

export function logMigrationWarning(warning: string, data?: any) {
  console.warn(`⚠️ [MIGRATION:${ORDER_ENGINE_VERSION.toUpperCase()}] ${warning}`, data || '');
}

export function logMigrationError(error: string, data?: any) {
  console.error(`❌ [MIGRATION:${ORDER_ENGINE_VERSION.toUpperCase()}] ${error}`, data || '');
}