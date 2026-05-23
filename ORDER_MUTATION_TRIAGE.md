# ORDER_MUTATION_TRIAGE

Summary:
- Focus: sovereign order creation path and related mutation callsites that live inside tx boundaries.
- Goal: identify potential Prisma schema/DTO mismatches and missing required fields that could block tsc/build or runtime.

Critical locations (inspect these):
- server/services/order.engine.ts:71-130 (tx.sovereignOrder.create + include items)
  - Ensure sovereignOrder model fields: districtId, userId?, totalAmountPaisa, totalItems, paymentMethod, customerName, customerPhone, customerAddress, idempotencyKey, status, and relation items.create with productId, vendorId, quantity, unitPricePaisa, subtotalPaisa, commissionPaisa.
- server/services/order.engine.ts:261-279 (tx.auditLog.create in createOrderAudit)
  - Ensure auditLog model accepts action, targetId, targetType, details, metadata (JSON), ipAddress, userAgent, districtId.
- server/services/order.engine.ts:219-240 (tx.product.update reservedStock increment)
  - Verify product fields availableStock/reservedStock and increment semantics exist in schema.

Severity classification (initial):
- A (High) - tx.sovereignOrder.create: schema mismatch on nested items.create fields or missing required fields on sovereignOrder will block order creation.
- A (High) - tx.auditLog.create: missing required audit fields or JSON/metadata type mismatch will break transaction and can cause rollback.
- B (Medium) - idempotencyKey uniqueness: ensure Prisma unique index exists or idempotency logic amended.
- B (Medium) - reservedStock increment: schema field name mismatch or wrong types will cause update failure.

Recommended minimal stabilization steps (no codemods):
1. For each file above, open the Prisma schema for sovereignOrder, sovereignOrderItem (or equivalent), product, and auditLog and verify field names and types.
2. If a required field is missing at callsite, add the minimal data before creating (e.g., include districtId, userId or set nullable in schema if intended).
3. If nested create fields differ, map fields explicitly at callsite to match schema (avoid renaming models or major refactors).
4. Add a short smoke test that calls createOrder with a minimal valid payload to validate the transaction path.

Files reviewed: server/services/order.engine.ts:71-130, 219-240, 261-279

Next action: run targeted tsc on server files after verifying Prisma schema or produce a failing example payload for maintainers.
