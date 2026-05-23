/**
 * PHASE 2 - COGNITION FLOW MAP
 * BharatOS Canonicalization
 */

CURRENT COGNITION DISTRIBUTION:

CLIENT-SIDE AI LOGIC:
- client/src/lib/ai-brain.ts: Search, ranking, recommendations, trending, signal tracking, vector search, DSSL scoring
- client/src/lib/ai-router.ts: Query parsing and routing logic

SERVER-SIDE AI LOGIC:
- server/services/ai_engine.service.ts: Sovereign score calculation (DSSL + ML + Context)
- server/routes/ai.routes.ts: AI search, vector search, DSSL scoring, recommendations, trending, signal tracking
- server/routes/ai/concierge.routes.ts: Vision processing, concierge AI, insights, user events

KEY COGNITION COMPONENTS IDENTIFIED:
1. PARSING: ai-router.ts (query classification)
2. TAXONOMY: Implicit in search/routing (categories, vendors)
3. MEMORY: userEvent.create, queryIntelligence.create (demand signals)
4. RANKING: calculateSovereignScore, DSSL scoring
5. TELEMETRY: execution-telemetry.service, userEvent tracking
6. GROUNDING: Vector search, similarity matching
7. TRUST: DSSL score components (rating, reviews, etc.)
8. ORCHESTRATION: aiSearch with fallbacks, smartSearch logic

RECOMMENDATION:
- Extract cognition components into core/cognition-engine/
- Centralize AI logic scattered across routes and services
- Standardize telemetry collection