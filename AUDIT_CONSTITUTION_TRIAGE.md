# AUDIT_CONSTITUTION_TRIAGE

Scope:
- Audit/logging callsites (auditLog and adminActionLog) across the codebase.
- Goal: identify shape/field mismatches, transaction-context inconsistencies, and required-field risks that can block runtime or build.

Findings (representative callsites):
- server/storage.ts:56-61 -> logAuditEntry uses prisma.auditLog.create with fields: action, userId, targetId, targetType, districtId, hash, prevHash. (server/storage.ts:56)
- server/services/order.engine.ts:261-279 -> tx.auditLog.create with fields: action, targetId, targetType, details (string), metadata (object), ipAddress, userAgent, districtId. (server/services/order.engine.ts:261)
- shared/discovery-gateway.ts:68,96,124 -> getStorage().prisma.auditLog.create({ ... }) called with different small shapes and sometimes voided. (shared/discovery-gateway.ts:68)
- server/repositories/common.repo.ts:38-43 -> createAuditLog uses prisma.auditLog.create({ data }). (server/repositories/common.repo.ts:38)
- server/services/auditLogger.ts:175-212 -> high-level logAudit API with CreateAuditLogData - commented TODO about AuditLog model. (server/services/auditLogger.ts:175)
- server/routes/admin/admin.routes.ts: hundreds of adminActionLog.create() calls using both flat fields (adminId, action, targetId, targetType, beforeValue/afterValue, decision, reason, districtId) and nested details/evidence JSON. (server/routes/admin/admin.routes.ts:~295, 351, 407, 519, etc.)
- quarantine and tests: many test/service callsites create auditLog entries with fields that may differ from schema (quarantine tests). (quarantine/*: multiple)

Inconsistencies observed:
1. Field shape divergence
   - Some callsites write top-level fields (e.g., adminId, action, targetId, targetType, decision, reason).
   - Other callsites use a single `details` JSON object (containing targetId, decision, reason, districtId, evidence, etc.).
   - Some callsites include `metadata` JSON, `evidence` JSON, `beforeValue`/`afterValue` fields.
2. Transaction context
   - Some audit calls are inside transactions using `tx.auditLog.create` (order.engine.ts) to keep audit atomic with writes.
   - Other places call global `prisma.auditLog.create` or `prisma.adminActionLog.create` outside transactions, causing potential gaps in atomicity.
3. Required/optional fields
   - Some callsites omit `adminId` or `userId` (e.g., System/engine-generated logs use userId undefined or districtId null) while others force adminId with non-null assertions (adminId: req.ctx?.userId!).
   - District can be null in some admin logs (kill-switch), but storage.ts logAuditEntry sets districtId || 0 when creating background audit entries.
4. JSON vs scalar typing
   - Many callsites write nested objects (details/evidence/metadata) — Prisma schema must have JSON-typed columns for these. If not, these calls will fail.

Severity classification (initial):
- A (High): adminActionLog / auditLog schema mismatch on required fields or JSON vs scalar columns. A single mismatched required field will cause runtime errors for many admin mutating endpoints (server/routes/admin/*). Example: adminActionLog.create calls that provide `details` object vs schema expecting flat `reason` string.
- A (High): Transaction mismatch where audit is created outside the same tx as the mutation. For financial flows (order.engine.ts) this can cause missing audit entries if transaction rolls back or partial visibility.
- B (Medium): Missing adminId or userId in logs — causes incomplete trails; not always fatal but reduces auditability.
- B (Medium): Different naming (beforeValue/afterValue vs details) reduces ability to query/aggregate audit logs reliably but can be deferred.
- C (Low): Some test/quarantine callsites use different shapes — fixable in tests.

Minimal non-invasive checks to perform next (NO FIXES):
1. Inspect Prisma schema models for `AuditLog` and `AdminActionLog` (prisma/schema.prisma) and verify field names and JSON-typed columns (e.g., details Json?, evidence Json?, metadata Json?).
2. For each high-volume admin route in server/routes/admin/*, build a mapping of callsite -> shape used (flat vs details vs metadata) and flag those that violate schema (missing required or writing non-JSON into non-JSON fields).
3. Identify transactional flows that rely on tx.* (order.engine.ts) and verify they write audit entries inside tx where intended (order.engine uses tx.auditLog.create which is correct; verify Prisma supports nested tx model operations for auditLog).
4. Produce a short list of representative failing callsites (if tsc/runtime errors appear) to present for decision.

Files to review next (priority):
- prisma/schema.prisma (verify AuditLog/AdminActionLog)  <-- REQUIRED CHECK
- server/routes/admin/admin.routes.ts  (mutation-heavy)  <-- Already scanned
- server/services/order.engine.ts (tx.auditLog.create)  <-- Already scanned
- shared/discovery-gateway.ts (getStorage().prisma.auditLog.create)
- server/services/auditLogger.ts (high-level wrapper)

Notes:
- NO automatic fixes will be applied. This triage documents mismatches and classifies severity so you can decide which are deploy-blockers.
- After your decision, I can produce PRs with minimal surgical fixes for the approved subset.
