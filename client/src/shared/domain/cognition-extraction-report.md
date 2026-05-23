/**
 * COGNITION EXTRACTION REPORT
 * BharatOS Phase 3 - Cognition Extraction Foundation
 */

EXTRACTION SUMMARY:

✅ COMPLETED:
- Query normalization logic extracted to server/lib/cognition/normalize.ts
- Updated 3 locations: ai.routes.ts, ai/concierge.routes.ts, cognitive.query.engine.ts
- Behavior preserved: routes output identical

REMAINING DUPLICATED LOGIC:
- Intent parsing: cognitive.query.engine.ts vs intent.service.ts (parseIntent function)
- Telemetry writing: Scattered across 5+ locations (routes + services)
- DSSL calculation: ai_engine.service.ts, but used everywhere
- Grounding logic: ai.routes.ts (grounded flags), dssl.engine.ts (vector search)

RISKY EXTRACTION AREAS:
- Telemetry writes: High risk due to async nature and error handling
- DSSL ranking: Core business logic, changes could affect vendor visibility
- Grounding algorithms: Complex vector search logic

FUTURE MIGRATION CANDIDATES:
1. Intent parsing consolidation (Phase 4)
2. Telemetry service centralization (Phase 4)
3. DSSL ranking pipeline extraction (Phase 5)
4. Grounding engine modularization (Phase 5)

ARCHITECTURE STATUS:
- Parser foundation: ✅ Established
- Type definitions: ✅ Created
- Event definitions: ✅ Standardized
- Normalization: ✅ Extracted
- Routes updated: ✅ No behavior change

NEXT PHASE READINESS:
Ready for Phase 4 - Intent Parsing Extraction