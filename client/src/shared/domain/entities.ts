/**
 * CANONICAL ENTITY REGISTRY
 * BharatOS - Phase 2 Canonicalization
 *
 * Purpose: Unified vocabulary for entities across the system.
 * This creates a future migration shield for renaming entities.
 */

export const ENTITY_ALIASES = {
  PARTNER: [
    'shop',
    'vendor',
    'seller',
    'merchant',
    'store'
  ]
} as const;

/**
 * Canonical entity types for type safety
 */
export type EntityType = keyof typeof ENTITY_ALIASES;

/**
 * Helper function to check if a term is an alias for an entity
 */
export function isEntityAlias(entity: EntityType, term: string): boolean {
  return ENTITY_ALIASES[entity].includes(term.toLowerCase() as any);
}

/**
 * Get canonical entity name from any alias
 */
export function getCanonicalEntity(term: string): EntityType | null {
  const lowerTerm = term.toLowerCase();
  for (const [entity, aliases] of Object.entries(ENTITY_ALIASES)) {
    if (aliases.includes(lowerTerm as any)) {
      return entity as EntityType;
    }
  }
  return null;
}