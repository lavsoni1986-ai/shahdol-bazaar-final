/**
 * COGNITION FLOW MAP
 * BharatOS Phase 3 - Cognition Extraction Foundation
 */

CURRENT COGNITION DISTRIBUTION ANALYSIS:

1. QUERY NORMALIZATION:
   - Location: server/routes/ai/concierge.routes.ts:177, server/routes/ai.routes.ts:49, server/services/cognitive.query.engine.ts:15
   - Logic: message.trim().toLowerCase()
   - Duplication: 3 locations with identical normalization

2. AI PARSING:
   - Location: server/services/cognitive.query.engine.ts (parseNaturalLanguage function)
   - Location: server/services/intent.service.ts (parseIntent function)
   - Logic: Natural language processing, intent classification, keyword matching

3. ENTITY EXTRACTION:
   - Limited explicit extraction found
   - Implicit in search logic: category matching, vendor text search
   - Location: server/services/sovereign.global.search.ts, server/services/intent.service.ts

4. TELEMETRY WRITES:
   - userEvent.create: server/routes/ai.routes.ts:163,407; server/routes/ai/concierge.routes.ts:250,417; server/services/execution-telemetry.service.ts
   - queryIntelligence.create: server/routes/ai.routes.ts:181
   - eventLog.create: server/routes/ai.routes.ts:599; server/middleware/sovereign-logger.ts

5. DEMAND MEMORY WRITES:
   - queryIntelligence.create for search patterns
   - userEvent.create for user behavior signals

6. DSSL RANKING:
   - Calculation: server/services/ai_engine.service.ts:calculateSovereignScore
   - Usage: Widespread across ai.routes.ts, stores.routes.ts, admin.routes.ts
   - Components: DSSL score + ML profile + contextual pulse

7. VENDOR GROUNDING:
   - Vector search: server/routes/ai/dssl.engine.ts (vector-search endpoint)
   - Embedding generation: server/services/brain.service.ts
   - Grounding flags: ai.routes.ts (grounded: true/false)

KEY COGNITION FLOWS:

User Query → [Normalization] → [Intent Parsing] → [Entity Extraction] → [Grounding] → [Ranking] → [Response]
                                ↓
[Telemetry Write] ← [Demand Signal] ← [User Behavior]

EXTRACTION CANDIDATES:

HIGH PRIORITY:
- Query normalization (duplicate in 3 files)
- Telemetry writing logic (scattered across routes)

MEDIUM PRIORITY:
- Intent parsing (cognitive.query.engine.ts vs intent.service.ts)
- DSSL calculation (ai_engine.service.ts)

FUTURE EXTRACTION:
- Entity extraction logic
- Grounding algorithms
- Ranking pipelines