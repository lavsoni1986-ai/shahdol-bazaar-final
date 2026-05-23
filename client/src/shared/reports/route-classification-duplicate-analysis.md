/**
 * AI ROUTE CLASSIFICATION & DUPLICATE ANALYSIS
 * BharatOS Route Consolidation Analysis
 */

ROUTE CLASSIFICATION:

ACTIVE ROUTES:
- ai/concierge.routes.ts: ✅ FULLY ACTIVE - main AI pipeline
- ai/dssl.engine.ts: ✅ FULLY ACTIVE - DSSL/trust operations

LEGACY/DEAD ROUTES:
- ai.routes.ts: ❌ DEAD CODE - not mounted, duplicate functionality exists in concierge

DUPLICATE LOGIC IDENTIFIED:

1. COGNITION PARSING:
   - Location: Both ai.routes.ts and ai/concierge.routes.ts call cognitiveParseQuery()
   - Status: ✅ Handled by shared cognitive.query.engine.ts
   - Action: No duplication issue - uses shared service

2. QUERY NORMALIZATION:
   - Location: Both routes call normalizeQueryLegacy()
   - Status: ✅ Handled by shared lib/cognition/normalize.ts
   - Action: No duplication issue - uses shared utility

3. TELEMETRY WRITES:
   - ai.routes.ts: Has telemetry in click-learn and action-learn
   - ai/concierge.routes.ts: Has telemetry in click-learn and action-learn
   - Status: ⚠️ DUPLICATE - same telemetry logic in both files
   - Action: Remove from ai.routes.ts

4. MEMORY PERSISTENCE:
   - ai.routes.ts: Calls updateDistrictDemandMemory, updateSharedLearning
   - ai/concierge.routes.ts: Calls updateDistrictDemandMemory, updateSharedLearning
   - Status: ⚠️ DUPLICATE - same memory operations in both files
   - Action: Remove from ai.routes.ts

5. GROUNDING LOGIC:
   - Both routes have vendor/product search with aiRankScore ordering
   - Status: ⚠️ DUPLICATE - same grounding queries in both files
   - Action: Remove from ai.routes.ts

6. AI RESPONSE GENERATION:
   - Both routes call Groq API for response generation
   - Status: ⚠️ DUPLICATE - same AI completion logic in both files
   - Action: Remove from ai.routes.ts

7. DISTRICT INTELLIGENCE UPDATES:
   - ai.routes.ts: Updates districtEconomicCluster, districtHeatSignal
   - ai/concierge.routes.ts: Updates shared learning
   - Status: ⚠️ PARTIALLY DUPLICATE - different but related intelligence updates
   - Action: Consolidate into shared district-intelligence.service.ts

DUPLICATE ENDPOINT ANALYSIS:

1. /concierge POST:
   - ai.routes.ts: Basic implementation
   - ai/concierge.routes.ts: Full implementation with vision, voice, insights
   - Winner: ai/concierge.routes.ts (more complete)

2. /click-learn POST:
   - Both have identical vendor/product ranking updates
   - Winner: ai/concierge.routes.ts (active)

3. /voice-search POST:
   - ai.routes.ts: Basic implementation
   - ai/concierge.routes.ts: Full implementation
   - Winner: ai/concierge.routes.ts

4. /action-learn POST:
   - Both have identical telemetry tracking
   - Winner: ai/concierge.routes.ts (active)

5. /vector-search POST:
   - ai.routes.ts: Not implemented (placeholder)
   - ai/dssl.engine.ts: Full implementation
   - Winner: ai/dssl.engine.ts (correct location)

THIN ROUTE VIOLATIONS (routes containing intelligence logic):

ai/concierge.routes.ts violations:
- Contains cognitiveParseQuery() call (should be in cognition-engine)
- Contains AI response generation (should be in cognition-engine)
- Contains grounding queries (should be in grounding service)
- Contains telemetry calls (should be centralized)

ai.routes.ts violations:
- Same violations as above (dead code)

CANONICAL PIPELINE VIOLATION:
- Routes call services directly instead of going through engines
- Missing: cognition-engine, execution-engine, ranking-engine orchestration

RECOMMENDED CONSOLIDATION STEPS:

1. IMMEDIATE: Archive ai.routes.ts to archive/routes-legacy/
2. SHORT TERM: Thin ai/concierge.routes.ts to only orchestration
3. MEDIUM TERM: Create proper engine orchestration layer
4. LONG TERM: Implement canonical pipeline with engine calls