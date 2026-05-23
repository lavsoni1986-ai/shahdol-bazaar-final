# ADMIN_GOVERNANCE_STABILIZATION_REPORT

Scope
- Stabilize admin governance mutation execution paths: vendor/product moderation, bans/approvals, sponsorships, fraud overrides and their audit linkage.
- Surgical-only changes. No schema changes, no broad refactors.

Summary of surgical work performed (A-class fixes only)

Files modified (exact)
- server/routes/admin/admin.routes.ts
  - Ensured transactional admin action invocation path uses a defined transactionOperations array when pushing prisma.adminActionLog.create calls and standardized adminActionLog payload into `details` JSON where appropriate.
  - Reason: prevent malformed/ambiguous mixed scalar vs JSON payloads in transactions; ensure tx builds valid operations array before prisma.$transaction.

- server/routes/index.ts
  - auditLog helper: ensured prisma.auditLog.create payload supplies required schema scalars entityType (String) and entityId (Int) derived from runtime truth; preserved targetType/targetId/details/metadata and strict district enforcement.
  - Reason: AuditLog model requires entityType/entityId; missing these caused runtime validation errors and transaction rollbacks.

- server/storage.ts
  - logAuditEntry background helper: when writing background audit entries supply entityType and entityId (mapped from targetType/targetId or districtId) to satisfy schema expectations.
  - Reason: background writes previously omitted required fields and could silently fail.

- server/services/order.engine.ts
  - Order audit: ensured tx.auditLog.create includes entityType: 'SOVEREIGN_ORDER' and entityId: order.id (authoritative values); also ensured nested SovereignOrderItem create uses totalPricePaisa (mapped from subtotalPaisa) to match Prisma model.
  - Reason: prevent transactional failures and preserve immutable order audit.

- shared/discovery-gateway.ts
  - Guarded hydration/audit callsites to only create audit entries when authoritative entityId is available (avoid entityId = 0); ensured audit create uses entityType/entityId when present.
  - Reason: avoid creating malformed audit rows and preserve traceability.

- server/services/event-delivery-verification.ts
  - Outbox / event audit writes: added entityType/entityId mapping for EVENT_OUTBOX, EVENT_RETRY, EVENT_RETRY_SUCCESS and EVENT_FAILED entries, deriving entityId from event orderId/productId where available.
  - Reason: Audit schema requires entityType/entityId; missing values caused Prisma validation errors and could block event flows that use audit as outbox proxy.

- server/services/reservation-cleanup-worker.ts
  - Reservation cleanup audit writes: added entityType/entityId for district-level cleanup entries and manual cleanup entries.
  - Reason: satisfy AuditLog schema and prevent write failures.

- shared/discovery-gateway.ts (getVendorDisplayName & related): added guard to avoid writing audit when vendor id missing.

What changed (exact fields corrected)
- Added entityType (String) and entityId (Int) to prisma.auditLog.create payloads where missing.
- Mapped targetId -> entityId when target is canonical entity (order/district/product/event) and ensured entityId is authoritative (order.id, district.id, product.id, or derived from event data).
- For admin transactional flows, ensured adminActionLog.create calls are pushed into a transactionOperations array that is defined prior to use; standardized usage of `details` JSON rather than mixing top-level scalar fields across callsites.

Runtime failures eliminated
- Prisma validation errors caused by missing AuditLog.entityType/entityId at time of create (would cause transaction aborts). Fixed for these active runtime callsites:
  - Sovereign order creation path (server/services/order.engine.ts)
  - Audit helper used by many routes (server/routes/index.ts)
  - Event outbox / retry flow (server/services/event-delivery-verification.ts)
  - Reservation cleanup worker (server/services/reservation-cleanup-worker.ts)
  - Discovery hydration thin-entity audits (shared/discovery-gateway.ts)
  - Storage background audit (server/storage.ts)
- Transaction rollback risk removed where audit create was inside tx (order engine) by supplying required fields.

Governance weaknesses remaining (B-class)
- adminActionLog vs AuditLog shape inconsistency
  - adminActionLog model is minimal (adminId, action, details). Some callsites previously used top-level scalar fields; we standardized many callsites to use a `details` JSON. This preserves runtime safety but leaves query ergonomics inconsistent. Recommend later canonicalization.
- Reliance on non-null assertion for admin identity (req.ctx?.userId!) across admin routes. Most routes do early auth/role checks, but this remains a single-point trust in middleware contract.
- Some automated system actions (fraud analysis) record adminId: null in adminActionLog. This is intentional (system actor) but reduces actor granularity. Consider adding explicit system actor id in future.

Deferred redesign / operational items (C-class)
- Formalize adminActionLog schema to include entityType/entityId scalars in addition to details JSON for easier querying (deferred - schema redesign).
- Standardize `details` shape and field names across admin routes for consistent querying and parsing (deferred).
- Strengthen middleware to guarantee req.ctx.userId and req.ctx.districtId presence for admin routes (deferred but recommended).
- Consider dedicated outbox table instead of overloading audit_log for event delivery (deferred).

Verification
- Ran TypeScript typecheck before and after surgical edits. A-class audit-related Prisma validation errors for targeted files were removed. Typecheck still reports numerous unrelated type errors across the repository (outside authorized scope). Those are documented in earlier triage artifacts.
- Confirmed no schema files were modified.
- Confirmed no tenant isolation changes or Prisma singleton changes were made.

Unresolved constitutional risks
- Queryability: adminActionLog storage of structured details JSON vs scalars may hamper forensic queries; treat as governance design task.
- System actor traceability: automated actions often use adminId: null — acceptable for now but reduces actor trace; consider canonical system actor id for immutable trace.

Next steps (proposal)
- If you approve, I will: (1) produce a compact patch/rfc to standardize adminActionLog details shape across admin routes (non-invasive), and (2) open a PR with the surgical fixes already applied for review.

Files changed (summary)
- server/routes/admin/admin.routes.ts
- server/routes/index.ts
- server/services/order.engine.ts
- server/services/event-delivery-verification.ts
- server/services/reservation-cleanup-worker.ts
- shared/discovery-gateway.ts
- server/storage.ts
- server/dto/entity.dto.ts (audit guard)

Status: Active governance mutations stabilized for runtime failures. Governance consistency items documented for decision.
