/**
 * AI ROUTE DEPENDENCY MAP
 * BharatOS Route Consolidation Analysis
 */

ACTIVE AI ROUTES (currently mounted):

1. /ai/concierge (ai/concierge.routes.ts)
   - Status: ✅ ACTIVE
   - Mount: server/routes/index.ts:310
   - Import: import aiRoutes from "./ai/concierge.routes"
   - Endpoints:
     - POST /concierge (main AI conversation)
     - POST /onboard-vision (AI merchant onboarding)
     - POST /click-learn (AI learning from clicks)
     - POST /voice-search (voice input processing)
     - GET /market-insights (AI market analysis)
     - POST /action-learn (action telemetry)

2. /ai/dssl (ai/dssl.engine.ts)
   - Status: ✅ ACTIVE
   - Mount: server/routes/index.ts:311
   - Import: import dsslRoutes from "./ai/dssl.engine"
   - Endpoints:
     - POST /score (DSSL scoring)
     - POST /analysis (trust analysis)
     - POST /vector-search (AI vector search)

DEAD/LEGACY AI ROUTES (not mounted):

3. ai.routes.ts
   - Status: ❌ DEAD CODE
   - Mount: NONE
   - Import: NONE
   - Endpoints:
     - POST /concierge (duplicate)
     - POST /click-learn (duplicate)
     - POST /voice-search (duplicate)
     - POST /action-learn (duplicate)
     - POST /vector-search (duplicate)
     - POST /trending (not in concierge)
     - POST /click (duplicate)
     - POST /global-search (not in concierge)

DUPLICATE ENDPOINTS IDENTIFIED:

- /concierge: ai.routes.ts ❌ vs ai/concierge.routes.ts ✅
- /click-learn: ai.routes.ts ❌ vs ai/concierge.routes.ts ✅
- /voice-search: ai.routes.ts ❌ vs ai/concierge.routes.ts ✅
- /action-learn: ai.routes.ts ❌ vs ai/concierge.routes.ts ✅
- /vector-search: ai.routes.ts ❌ vs ai/concierge.routes.ts ✅

UNIQUE ENDPOINTS IN DEAD ROUTES:

ai.routes.ts only:
- /trending GET
- /global-search POST

RECOMMENDED ACTION:

1. IMMEDIATE: Remove ai.routes.ts import from any potential locations
2. VERIFY: Confirm no frontend calls to ai.routes.ts endpoints
3. ARCHIVE: Move ai.routes.ts to archive/routes-legacy/
4. MONITOR: Watch for any missing endpoint errors
5. CLEANUP: Delete ai.routes.ts after 30-day monitoring period

CANONICAL AI PIPELINE (current active):

User Query → /ai/concierge → cognitiveParseQuery → vendor/product search → AI response generation → telemetry → memory persistence

DEPENDENCY FLOW:

ai/concierge.routes.ts depends on:
- cognitiveParseQuery (cognitive.query.engine.ts)
- normalizeQueryLegacy (lib/cognition/normalize.ts)
- updateDistrictDemandMemory (services/district-intelligence.service.ts)
- trackCallVendor, etc. (services/execution-telemetry.service.ts)
- getGroq (middleware/groq.ts)

ai/dssl.engine.ts depends on:
- generateEmbedding (services/brain.service.ts)
- cosineSimilarity (utility function)