/**
 * EXECUTION EVENTS AUDIT REPORT
 * BharatOS Phase 4 - Execution Intelligence Foundation
 */

EXISTING EXECUTION EVENTS ANALYSIS:

1. CALL_VENDOR:
   - Triggered: server/routes/ai.routes.ts:463, server/routes/ai/concierge.routes.ts:592
   - Persisted: server/services/execution-telemetry.service.ts:trackCallVendor
   - Payload: userId?, vendorId, query, districtId
   - Missing: sessionId, actionType (hardcoded), timestamp (auto), metadata standardization

2. WHATSAPP_VENDOR:
   - Triggered: server/routes/ai.routes.ts:470, server/routes/ai/concierge.routes.ts:599
   - Persisted: server/services/execution-telemetry.service.ts:trackWhatsappVendor
   - Payload: userId?, vendorId, query, districtId
   - Missing: Same as CALL_VENDOR

3. MAP_OPEN:
   - Triggered: server/routes/ai.routes.ts:477, server/routes/ai/concierge.routes.ts:606
   - Persisted: server/services/execution-telemetry.service.ts:trackOpenMaps
   - Payload: userId?, vendorId, query, districtId
   - Missing: Same as above

4. ORDER_CREATED:
   - Triggered: server/services/webhookHandler.ts (Cashfree webhook)
   - Persisted: Order status updates, not as execution event
   - Payload: order_id, order_amount, etc.
   - Missing: User-initiated execution tracking, district context, vendor association

TELEMETRY GAPS IDENTIFIED:

- District context: Present in all events ✅
- Vendor context: Present in all events ✅
- User context: Optional, some events missing userId ❌
- Session context: Missing in all events ❌
- Action type: Hardcoded in persistence, not in payload ❌
- Timestamp: Auto-generated ✅
- Frontend-only events: Likely exist but not persisted ❌
- Duplicate events: No deduplication logic ❌
- Action outcomes: No success/failure tracking ❌

FRONTEND EVENTS (not persisted):
- Likely triggered in UI components but not sent to backend
- Examples: view_product, add_to_cart, search (beyond AI routes)

STANDARDIZATION NEEDS:
- Add sessionId to all payloads
- Explicit actionType parameter
- Consistent metadata structure
- Outcome tracking (success/failure)