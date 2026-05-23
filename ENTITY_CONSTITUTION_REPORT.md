# ENTITY_CONSTITUTION_REPORT

Category	Count
consumers migrated	0
duplicate entity types removed	0
trust primitives preserved	6
unresolved ontology drift	See list below
telemetry dependencies blocked	See list below

Top unresolved files and drift points:
- server/services/searchUnified.service.ts (mixes dsslScore, finalScore, isSponsored)
- server/dto/entity.dto.ts (zod schemas still using dsslScore, meta
- server/services/district-memory.service.ts (trust signals / telemetry mapping)
- server/services/telemetry.service.ts (telemetry DTO mismatches)
- client/src/shared/domain/canonical-entities.ts (client-side duplicates)

Notes:
- Sovereign entity types created in shared/contracts/entity.contract.ts (CanonicalEntityV2, CanonicalVendorEntityV2, AISearchResultContract, TrustLabelContract, SafetyBadgeContract).
- No Prisma or schema changes performed. Consumers need to migrate to canonical fields per ENTITY_ONTOLOGY_RECONCILIATION.md.
