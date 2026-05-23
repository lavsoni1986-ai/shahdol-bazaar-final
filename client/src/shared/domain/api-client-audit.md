/**
 * PHASE 2 - API CLIENT AUDIT REPORT
 * BharatOS Canonicalization
 */

API CLIENT COMPARISON REPORT

Files:
- apiClient.ts (auto-generated, class-based, typed SDK)
- api-client.ts (manual, functional, district-aware)

KEY DIFFERENCES:

1. AUTHENTICATION:
   - apiClient.ts: Bearer token in Authorization header
   - api-client.ts: credentials: "include" (cookie-based auth)

2. DISTRICT HANDLING:
   - apiClient.ts: No district context
   - api-client.ts: Automatic district slug resolution from URL/localStorage, sent in x-district-slug header

3. ERROR HANDLING:
   - apiClient.ts: Throws Error with data.error
   - api-client.ts: Validates "success" in response, throws data?.error

4. RETRY LOGIC:
   - Neither has retry mechanisms

5. BODY SERIALIZATION:
   - apiClient.ts: JSON.stringify for all bodies
   - api-client.ts: Handles FormData, strings, objects

DUPLICATE LOGIC:
- Both handle API requests to /api/ endpoints
- Auth flows partially overlap but use different mechanisms
- Marketplace/order endpoints duplicated with different implementations

RECOMMENDATION:
- Merge into single canonical client in Phase 3
- Adopt district-aware approach from api-client.ts
- Add retry logic and better error handling
- Use api-client.ts as base, integrate typed methods from apiClient.ts