# MUTATION_TRIAGE_COMPLETE

Status: Completed (no code changes applied)

Primary A-blockers (deploy-blocking unless addressed):

1) AuditLog / AdminActionLog schema mismatches (High)
- Symptom: TypeScript errors show multiple prisma.auditLog.create / prisma.adminActionLog.create callsites are missing required properties `entityType` and `entityId` (AuditLogCreateInput) or using `details`/`evidence` JSON while schema expects different fields.
- Representative callsites:
  - server/services/event-delivery-verification.ts:85, 137, 199, 226
  - server/services/reservation-cleanup-worker.ts:171, 232
  - shared/discovery-gateway.ts:68, 96, 124
  - server/routes/admin/admin.routes.ts:295,351,407,519,581,641,744, etc.
- Impact: Any admin or system mutation that logs to audit/admin tables can throw at runtime and cause failed endpoints or transaction rollbacks.
- Minimal remediation (no automated edits): For each high-volume callsite, ensure the create payload includes required scalar fields the Prisma schema requires (entityType/entityId) or adapt the schema (decision needed). Prefer callsite patching for high-risk endpoints.

2) Sovereign order nested items mismatch (High)
- Symptom: SovereignOrderItem nested create missing required fields: `totalPricePaisa` and relation `product` (TS error in server/services/order.engine.ts:117).
- Representative callsite:
  - server/services/order.engine.ts:105-130 (tx.sovereignOrder.create with nested items.create)
- Impact: Order creation transaction will fail with Prisma validation errors.
- Minimal remediation: Add missing fields to nested create data to satisfy Prisma model, or alter schema to make fields optional (decision required). Keep changes surgical and localized to order engine.

3) Transaction atomicity & audit placement (High/Medium)
- Symptom: Some mutation flows create audit/admin logs outside the same transaction as the mutation; others do include them. Mixed usage observed (e.g., vendor update followed by adminActionLog.create without tx). See admin.routes and vendor/product flows.
- Impact: Partial failures lead to state drift between primary mutation and audit trail.
- Recommendation: For critical financial/authority mutations prefer writing audit within tx when possible (manual review to select where).

Secondary issues (Medium/Low):
- Non-null assertions for adminId/userId (req.ctx?.userId!) across many endpoints — if auth middleware contract breaks, logs will be malformed. (server/routes/admin/*.ts)
- Many Prisma typing mismatches across services (district-memory, user.intelligence, telemetry, signal engine). These are broader type drift issues; classify for later waves.

Artifacts generated:
- ORDER_MUTATION_TRIAGE.md (E:/Shahdol-Bazaar-MVP/ORDER_MUTATION_TRIAGE.md)
- AUDIT_CONSTITUTION_TRIAGE.md (E:/Shahdol-Bazaar-MVP/AUDIT_CONSTITUTION_TRIAGE.md)
- ADMIN_MUTATION_TRIAGE.md (E:/Shahdol-Bazaar-MVP/ADMIN_MUTATION_TRIAGE.md)
- MUTATION_TRIAGE_COMPLETE.md (this file)

Typecheck output (complete) saved to:
C:\Users\LAV\.local\share\kilo\tool-output\tool_e2fa28fe3001pzKvXZqZsl3enF

Next steps (per your plan):
- You decide which items are deploy-blockers vs deferrable. Report which to address first and I will prepare minimal surgical fixes and exact patches for approval.

Notes:
- No code changes were applied during triage. All findings are non-invasive and documented.
