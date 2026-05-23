# DISTRICT_CONSTITUTION_REPORT

Category	Count
consumers migrated	3
local District types removed	1
deprecated config usage (occurrences)	14
deprecated config usage (files affected)	12
unresolved schema dependencies	See list below
remaining drift points	See list below

---

Canonical district field list
- primaryColor
- secondaryColor
- faviconUrl
- metaTitle
- metaDescription
- logoUrl
- ogImageUrl
- twitterImageUrl
- contactNumber
- description
- state
- metadata (free-form)

---

Top unresolved schema / drift files (examples — needs domain reconciliation):
- server/services/district-memory.service.ts
- server/services/district-intelligence.service.ts
- server/services/telemetry.service.ts
- server/services/user.intelligence.ts
- server/services/searchUnified.service.ts
- server/services/district.manager.ts
- shared/discovery-gateway.ts

Notes:
- Counts reflect current repository state after adopting District contracts and refactoring obvious local types.
- "consumers migrated" counts files now deriving district types from shared/contracts/district.contract.ts or shared/contracts.ts (District alias).
- Deprecated config usage should be migrated: prefer explicit top-level sovereign fields in DistrictContract; avoid district.config nesting.

This report is a governance artifact. Store in documentation and use for Phase 1B.2 planning.
