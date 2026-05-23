# API CONTRACT MATRIX - BharatOS Sovereign Endpoints

## Active Endpoints

| Feature | Method | Endpoint | Frontend Files | Backend File | Status | Notes |
|---------|--------|----------|----------------|--------------|--------|-------|
| AI Concierge | POST | `/ai/concierge` | AISearchTerminal.tsx, useSearch.ts | ai/concierge.routes.ts | ✅ | Main AI pipeline |
| Hospitals Page | POST | `/ai/concierge` | hospitals.tsx | ai/concierge.routes.ts | ✅ | Fixed from GET /api/ai/concierge |
| Category Listing | POST | `/ai/concierge` | category-listing.tsx | ai/concierge.routes.ts | ✅ | Fixed from GET /api/ai/concierge |
| AI Assistant | POST | `/ai/concierge` | SovereignAIAssistant.tsx | ai/concierge.routes.ts | ✅ | Fixed from /api/ai/concierge |

## Route Mounting
- aiRoutes mounted at `/ai` in `server/routes/index.ts`
- Full endpoint: `/ai/concierge` (not `/api/ai/concierge`)

## Response Formats
- All AI concierge responses: `{ success: true, answer: string, results: any[], products: any[] }`
- Canonical entities processed via `normalizeDistrictSnapshot()`

## Forbidden Patterns
- ❌ `/api/ai/concierge` (wrong prefix)
- ❌ GET method for search queries (use POST)
- ❌ Direct marketplace endpoints in AI flows

## Runtime Verification
- ✅ Network tab shows 200 status for `/ai/concierge` POST
- ✅ No 404 errors in AI concierge flows
- ✅ Hospitals and category pages load with AI results
- ✅ No false demand recording for found entities
