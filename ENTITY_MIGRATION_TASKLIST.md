# ENTITY_MIGRATION_TASKLIST

File	Legacy Shape	Canonical Contract	Action	Status
server/dto/entity.dto.ts	various DTOs using dsslScore, meta	CanonicalEntityV2 / CanonicalVendorEntityV2	Replace DTO fields to derive from CanonicalEntityV2; map dsslScore -> trustScore and preserve legacy in meta. (done: partial)	in_progress
server/services/searchUnified.service.ts	VendorResult / enriched vendor shapes	AISearchResultContract	Normalize outputs to AISearchResultContract and ensure explainability fields included. (mapping added)	in_progress
server/lib/cognition/*	cognition engines referencing entity.dsslScore, entity.*	CanonicalEntityV2 / AISearchResultContract	Refactor cognition engines to consume canonical contracts and stop mutating entity shapes.	pending
server/services/district-memory.service.ts	records using entity fields	records should use canonical fields	Migrate recording to use canonicalSemantics and AISearchResultContract where applicable	pending
server/services/telemetry.service.ts	telemetry shapes depending on legacy fields	TelemetryTruth / AISearchResultContract	Adapt telemetry ingestion to expect canonical entity fields and trust primitives	pending
client/src/components/shared/SovereignEntityCard.tsx	uses dsslScore display	CanonicalEntityV2 / DistrictPublicContract	Read trustScore and trustLabel from canonical contract; show legacy dssl via meta if present	pending

Notes:
- The tasklist enforces no Prisma/schema edits. All mappings are canonical-only and preserve legacy scores in meta. For each "pending" item, I'll apply changes in priority order upon your confirmation.
