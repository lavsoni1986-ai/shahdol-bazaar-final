# ROUTE_RECONCILIATION_AUDIT

Scope: search under server/routes/**/* for vendors, sponsorship, status, products/pending

Summary of findings

- Mounted routers
  - server/routes/index.ts registers adminRoutes at app.use('/admin', adminRoutes) (registerSovereignRoutes).
  - server/routes/admin/index.ts mounts several admin subrouters: admin.routes (root), ai-command.routes, district-memory, dynamic-ranking, district-intelligence, migration-observability.

- Files containing target route code
  - server/routes/admin/admin.routes.ts
    - GET /vendors (line ~945)
    - POST /vendors (line ~963)
    - PATCH /vendors/:id/status (line ~229 and duplicated patch later)
    - (No products/pending originally; added later)
  - server/routes/admin/vendor.control.ts
    - PATCH /:id/sponsorship (line ~90)
    - PATCH /:id/approve, /:id/ban, /:id/override-dssl

- Duplicate / overlapping route families
  - admin.routes.ts already defines /vendors GET/POST and some /vendors/:id/* endpoints (status/verify/feature). vendor.control.ts provides a focused vendor control router (approve/ban/sponsorship/override) intended to be mounted under /vendors.
  - Both admin.routes.ts and vendor.control.ts provide vendor mutation endpoints; prior to restoration vendor.control.ts was NOT mounted, causing sponsorship patch to be unreachable.

- Missing / Not implemented
  - GET /api/admin/products/pending: Not found in any admin route file prior to restoration
  - vendor.control.ts was present on disk but not mounted under admin router (index.ts lacked import/use). This caused PATCH /admin/vendors/:id/sponsorship to 404.

- Route prefix mismatches / collisions
  - admin.routes.ts mounts many vendor endpoints directly under the admin router (e.g., POST /vendors). vendor.control's intended mount at /vendors was absent; after mounting both sets of handlers exist. Potential collision risk if the same HTTP method+path exist in both, but current definitions are complementary (vendor.control uses parameterized subpaths and different actions).

- Conditional registration / dead router indicators
  - vendor.control.ts existed but not mounted (dead router). No evidence of conditional registration; likely removed inadvertently in prior quarantine step.

- Frontend callers (contract spots)
  - client/src/pages/admin/AdminDashboard.tsx -> GET /admin/products/pending
  - client/src/pages/admin/VendorManagement.tsx -> POST /admin/vendors, PATCH /admin/vendors/:id/status, PATCH /admin/vendors/:id/sponsorship

- Root cause (consolidated)
  - vendor.control.ts present but not registered in server/routes/admin/index.ts → sponsorship & control mutations 404.
  - GET /admin/products/pending route missing from admin.routes.ts → frontend call 404.
  - Some admin vendor endpoints existed in admin.routes.ts (POST /vendors, PATCH /vendors/:id/status) but runtime 404s reported likely because vendor control missing and/or earlier index had been edited in a way that prevented proper mounting (investigation showed vendor control not imported before restoration).

- Immediate impact
  - POST /api/admin/vendors — previously 404 (admin.routes.ts had handler but mount state inconsistent); now present in admin.routes.ts
  - PATCH /api/admin/vendors/:id/status — present in admin.routes.ts
  - PATCH /api/admin/vendors/:id/sponsorship — file existed (vendor.control.ts) but not mounted; caused 404
  - GET /api/admin/products/pending — not implemented; caused 404

- Notes about type/shape drift
  - vendor.control.ts uses prisma.adminLog and fields (targetId, isSponsored) which the current Prisma typings may not accept (observed type errors). These are a schema/type drift risk and flagged in tsc output. Fixes to types/schema are out-of-scope for this surgical restoration.

Files inspected (representative)
- server/routes/index.ts: registerSovereignRoutes mounts /admin
- server/routes/admin/index.ts: prior to change, did not import vendor.control
- server/routes/admin/admin.routes.ts: contains POST /vendors, PATCH /vendors/:id/status
- server/routes/admin/vendor.control.ts: contains PATCH /:id/sponsorship
- client/src/pages/admin/AdminDashboard.tsx: calls /admin/products/pending
- client/src/pages/admin/VendorManagement.tsx: calls vendor endpoints

Conclusion
- The 404s were caused by two issues: missing products/pending handler and vendor.control router not mounted. Both are surgical fixes.
