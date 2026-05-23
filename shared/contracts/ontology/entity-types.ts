// shared/contracts/ontology/entity-types.ts
// Canonical Entity Types - Single Source of Semantic Truth

export enum CanonicalEntityType {
  PROVIDER = "PROVIDER",
  PRODUCT = "PRODUCT",
  SERVICE = "SERVICE",
  INSTITUTION = "INSTITUTION",
  PERSON = "PERSON",
  EVENT = "EVENT"
}

export const CANONICAL_ENTITY_TYPES = Object.values(CanonicalEntityType);