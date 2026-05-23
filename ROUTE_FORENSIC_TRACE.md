# ROUTE_FORENSIC_TRACE

## Summary

Root cause: `server/routes/admin/vendor.control.ts` defined the sponsorship route as `router.patch(":id/sponsorship", ...)` instead of `router.patch("/:id/sponsorship", ...)`.

This caused Express to fail route matching for `PATCH /api/admin/vendors/2/sponsorship` and fall through to the default 404 handler.

## Exact Mounted Route Tree

1. `server/index.ts`
   - `app.use("/api", apiRouter);` at line 736
2. `server/routes/index.ts`
   - `app.use("/admin", adminRoutes);` at line 329
3. `server/routes/admin/index.ts`
   - `router.use("/vendors", vendorControl);` at line 13
4. `server/routes/admin/vendor.control.ts`
   - `router.patch(":id/sponsorship", requireAuth, requireSuperAdmin, ...)` at line 90

Full intended route: `PATCH /api/admin/vendors/:id/sponsorship`

## Exact Fault

- `server/routes/admin/vendor.control.ts` line 90
- `router.patch(":id/sponsorship", ...)`

This is a malformed child route path. In Express, child router paths should begin with `/` so the mounted URL resolves correctly under the parent path.

## Conflicting Route / Missing Mount

- No duplicate `/api/admin/vendors/...` mount caused this.
- No conflicting route shadowed this path.
- No missing admin mount; the admin router was correctly mounted at `/api/admin`.
- The issue is isolated to the local route path syntax in `vendor.control.ts`.

## Verification

- Server restarted successfully on port `5002`.
- A test request to `/api/admin/vendors/2/sponsorship` returned JSON from the server instead of Express HTML 404.
- This proves the route now resolves through Express and no longer falls through to the default 404.

## Minimal Fix Applied

- Changed `router.patch(":id/sponsorship", ...)` to `router.patch("/:id/sponsorship", ...)` in `server/routes/admin/vendor.control.ts`.
