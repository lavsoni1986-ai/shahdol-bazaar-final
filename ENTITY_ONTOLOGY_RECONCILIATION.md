# ENTITY_ONTOLOGY_RECONCILIATION

Legacy Field	Canonical Field	Verdict
vendor	canonicalVendor (CanonicalVendorEntityV2)	RENAME / MERGE
image	images (array) / images.primary	RESTRUCTURE
trustLabel	trustLabel	KEEP
safetyBadges	safetyBadges	KEEP
canonicalId	canonicalId	KEEP
rating	rating	KEEP
type	entityType	RENAME
dsslScore	trustScore	RENAME (map to trustScore)
finalScore	performanceMetrics.finalScore	REMAP
isSponsored	meta.isSponsored	DEPRECATE -> move to meta
vendorId	canonicalVendor.canonicalId	RELINK
processingSteps	processingSteps	KEEP
performanceMetrics	performanceMetrics	KEEP
groundingConfidence	processingSteps / groundingConfidence	KEEP (explicit field)
reasoningTrace	reasoningTrace	KEEP
entityLineage	entityLineage	KEEP

Notes:
- This map is authoritative for Phase 1B.2. Consumer code must move to these canonical fields. No Prisma changes.
- Avoid introducing small variants (VendorLite etc.). Use projections derived from canonical types when needed.
