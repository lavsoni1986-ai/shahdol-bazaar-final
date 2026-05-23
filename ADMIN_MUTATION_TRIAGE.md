# ADMIN_MUTATION_TRIAGE

Scope:
- All admin mutation endpoints under server/routes/admin/* and high-impact services used by admin routes.
- Objective: identify mutation callsites, expected Prisma models touched, likely schema/typing mismatches, transaction usage, and severity classification. No changes will be made.

Method:
- Scanned server/routes/admin/admin.routes.ts and related admin route files for prisma.create/update/delete and prisma.$transaction usage.

High-impact mutation endpoints (representative):
1. Vendor status updates (PATCH /vendors/:id/status, /vendors/:id/ban, /vendors/:id/approve)
   - Callsites: prisma.vendor.update, prisma.adminActionLog.create
   - Risks: adminActionLog schema mismatch (details vs flat fields); vendor.update field names assumed (status, isShadowBanned) — verify vendor model fields exist and types. Transaction: vendor update and adminActionLog.create are separate calls (not in tx) except some places use transactionOperations array; race of audit vs update possible.
   - Severity: A (High) if adminActionLog.create fails due to schema mismatch — many admin actions will error.

2. Product moderation (PATCH /products/:id/approve, /reject, DELETE /products/:id)
   - Callsites: prisma.product.update/delete, prisma.adminActionLog.create
   - Risks: product.status and approved fields assumed; adminActionLog.create with nested details object in some endpoints.
   - Severity: A (High) for adminActionLog/create mismatches; B (Medium) if product fields differ.

3. Fraud alert resolution (PATCH /fraud-alerts/:id/resolve)
   - Callsites: prisma.vendor.update (conditional), prisma.adminActionLog.create, prisma.$transaction(transactionOperations)
   - Risks: transaction uses prisma.$transaction with operations array mixing vendor.update and adminActionLog.create — ensure adminActionLog.create fields align and transaction supports mixed statements. If adminActionLog.create expects non-null adminId/districtId, ensure present.
   - Severity: A (High) because it performs multi-op transactions affecting vendor status and audit trail.

4. Audit logs retrieval and admin actions (GET /audit-logs, many adminActionLog.create callsites)
   - Callsites: prisma.auditLog.findMany, prisma.adminActionLog.create
   - Risks: auditLog retrieval expects districtId filters; if auditLog model different, queries may throw.
   - Severity: B (Medium)

5. User management (PUT /users/:id/role, PATCH /users/:id/quarantine, POST /user-feedback)
   - Callsites: prisma.user.update, prisma.adminActionLog.create
   - Risks: role enum values must align with Prisma enum; adminActionLog shapes; districtId optionality
   - Severity: B (Medium)

6. Reviews moderation (DELETE /reviews/:id)
   - Callsites: prisma.review.delete, prisma.adminActionLog.create
   - Risks: nested includes for vendor/district checks are used; if relations missing, endpoint may fail prior to delete. adminActionLog.create shape again a risk.
   - Severity: B (Medium)

7. Emergency actions (POST /kill-switch, POST /vendors/:id/feature)
   - Callsites: prisma.adminActionLog.create and sometimes vendor.update
   - Risks: adminActionLog.create with details object and nullable districtId
   - Severity: B (Medium)

Cross-cutting observations:
- adminActionLog.create and auditLog.create are the most common potential single-point-of-failure across admin mutations. Confirm schema for AdminActionLog/AuditLog (fields, JSON columns, nullability).
- Many mutation paths do not wrap updates and adminActionLog.create in the same transaction, increasing risk of unsynchronized state. Some functions correctly use prisma.$transaction; identify and document those.
- Several endpoints use non-null assertions for adminId (req.ctx?.userId!) — if auth middleware fails to set ctx.userId this will result in runtime undefined being stored or TS errors; verify middleware contract.
- Some endpoints pass details as JSON object to adminActionLog.create while others use flat fields; ensure schema supports `details Json` or both field sets.

Next steps (no fixes):
1. Inspect prisma/schema.prisma for AdminActionLog and AuditLog models and record column names, types, nullability (JSON vs scalar). This is required to finalize severity.
2. Produce a short list of the top ~10 callsites that will likely fail if schema mismatch exists (to present for your decision).
3. Run typecheck to collect current tsc errors and surface concrete failures for the triage items.

Files referenced:
- server/routes/admin/admin.routes.ts (mutation-heavy): lines with prisma.adminActionLog.create and prisma.*mutations
- server/services/order.engine.ts (financial transaction uses tx.auditLog.create)
- server/services/reservation-cleanup-worker.ts (audit writes)
- server/services/vendor.service.ts (creates audit via createAuditLogInTx)
- server/repositories/transaction.repo.ts (createAuditLogInTx uses tx.auditLog.create)

Constraints maintained: NO automatic fixes, NO schema rewrites, NO mass Prisma edits, NO cleanup.
