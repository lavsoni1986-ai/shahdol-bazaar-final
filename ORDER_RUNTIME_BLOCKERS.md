# ORDER_RUNTIME_BLOCKERS

Scope: server/services/order.engine.ts (Sovereign order creation path) and direct Prisma order mutation inputs.

Summary: Identified runtime-critical mismatches that would cause failed transactions or runtime Prisma errors. Classified as A/B/C.

A. WILL FAIL RUNTIME (fixed in surgical stabilization)

1) Mutation: tx.sovereignOrder.create (nested items.create)
   - Exact mutation (excerpt): server/services/order.engine.ts:105-128
     tx.sovereignOrder.create({ data: { ..., items: { create: validatedItems.map(...) } } })
   - Prisma mismatch: SovereignOrderItem model requires totalPricePaisa (Int) and product relation. Callsite previously provided subtotalPaisa under the key `subtotalPaisa` and included `vendorId` and `commissionPaisa` keys not present in model.
   - Runtime consequence: Prisma validation error on nested create (missing required field totalPricePaisa and unexpected fields), transaction abort -> order creation fails.
   - Surgical stabilization applied: Map subtotalPaisa -> totalPricePaisa and remove unsupported fields. Updated mapping to:
       create: validatedItems.map(item => ({ productId, quantity, unitPricePaisa, totalPricePaisa: item.subtotalPaisa }))
     (file changed: server/services/order.engine.ts:116-123)
   - Rationale: totalPricePaisa is derived from unitPricePaisa * quantity (validatedItems already computes subtotalPaisa). This supplies authoritative derived value from existing runtime truth.

2) Mutation: tx.auditLog.create (order audit entry)
   - Exact mutation (excerpt): server/services/order.engine.ts:261-277 (createOrderAudit)
   - Prisma mismatch: AuditLog model requires non-optional fields entityType (String) and entityId (Int) per prisma/schema.prisma (model AuditLog). Callsite used targetType/targetId without entityType/entityId.
   - Runtime consequence: Prisma validation error on audit create causing transaction to fail or throw (audit is inside tx in order.engine.ts), leading to order creation rollback.
   - Surgical stabilization applied: supply entityType: 'SOVEREIGN_ORDER' and entityId: order.id in the audit create payload, preserving existing details/metadata. (file changed: server/services/order.engine.ts:261-277)
   - Rationale: audit schema requires these scalars; supplying them preserves auditability and prevents transaction failure. Values are authoritative (order.id and SOVEREIGN_ORDER).

B. TYPE-ONLY DRIFT (no runtime failure expected in order engine path)

1) DTO vs Prisma names: `subtotalPaisa` (used in validatedItems) vs Prisma expects `totalPricePaisa` in SovereignOrderItem. This is a naming drift fixed by mapping in A. Not runtime after the fix.

2) Presence of `vendorId` in validatedItems but not stored in SovereignOrderItem model. This is type drift: code collected vendorId for internal use (audit, eventing) but the Prisma model intentionally omits vendorId on order item. This does not cause runtime failure but requires attention for reconciliation (deferred).

C. DEFERABLE (not blocking sovereign order creation)

1) Commission handling: commissionPaisa is computed but not persisted to SovereignOrderItem (schema has no commission column). This is an operational/design issue; defer to constitutional redesign.

2) Multi-vendor settlement metadata: SovereignOrder (header) has no vendor-level split fields; vendor linkage is available only via item->product->vendor relation. This is expected in current schema and can be monitored later.

Files referenced:
- server/services/order.engine.ts:71-130 (create flow) and 259-277 (createOrderAudit)
- prisma/schema.prisma: SovereignOrderItem model (lines ~575-589) and AuditLog model (lines ~810-829)

Status: A-class issues were surgically fixed in server/services/order.engine.ts. B/C items documented for review.
