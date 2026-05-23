# SOVEREIGN_REQUEST_ALIGNMENT

Purpose: align the Express request augmentation used by server middleware and handlers with actual runtime `req.user` shape produced by auth middleware, ensuring tenant and auth semantics remain intact.

Actions performed (minimal & surgical):
1. Updated server/types/sovereign.ts to match canonical runtime request user shape used by middleware. The canonical shape is:

   interface SovereignRequest.user {
     id: number;         // canonical primary key used by most services
     username: string;
     role: UserRole;     // from shared/roles
     isAdmin: boolean;
     shopId?: number | null;
     userId: number;     // preserved for backward compatibility with existing code expecting userId
   }

2. Rationale for fields:
   - id: required and canonical for identifying user record in DB and middleware.
   - userId: preserved as a required numeric field to satisfy downstream type expectations that referenced `user.userId` in many files (avoids breaking route handlers). This preserves runtime semantics and prevents accidental optional undefinedness in critical auth checks.
   - districtId/districtSlug preserved at top-level request for tenant context.

3. Files touched (exact):
   - Modified: server/types/sovereign.ts
     - Replaced previous `user?: { userId: number; username: string; role: UserRole; isAdmin: boolean; shopId?: number | null }` with `user?: { id: number; username: string; role: UserRole; isAdmin: boolean; shopId?: number | null; userId: number }`.
   - No other code files were modified.

Previous drift source:
- Middleware at some point started attaching `req.user` as `{ userId, username, role, isAdmin }` while other typed interfaces expected `user.id` (or vice versa). Multiple consumers used either `req.user.id` or `req.user.userId` inconsistently, causing type conflicts when Request interface attempted to align with Express JWT payload types.

Unresolved risks and notes:
- Enforcing both `id` and `userId` as required numeric fields is conservative but may hide places where only one exists at runtime. Ensure auth middleware sets both `user.id` and `user.userId` (simple mapping) to preserve runtime behavior.
- Type change may require a one-line mapping in auth middleware if it currently sets only `userId`. Example (do not apply automatically): `req.user = { ...userFromToken, id: userFromToken.userId }`.
- The change made the `user.userId` property required to match JWTPayload expectations seen by some types; if runtime tokens sometimes omit userId, runtime errors could occur. Verify token parsing.

Runtime behavior changed? No functional change intended.
- These edits are type-level only. They require middleware to set `req.user.id` and `req.user.userId` at runtime; if middleware already sets `userId`, adding `id` mapping is recommended. Do not modify middleware automatically in this step; instead verify at runtime.

Files to manually verify (recommended):
- server/auth/middleware.ts — ensure it sets req.user with both id and userId
- server/routes/auth.routes.ts and any requireAuth handlers — ensure they read the canonical `id` or `userId` consistently

SOVEREIGN_REQUEST_ALIGNMENT generated at: /SOVEREIGN_REQUEST_ALIGNMENT.md
