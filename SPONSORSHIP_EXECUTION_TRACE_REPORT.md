# SPONSORSHIP_EXECUTION_TRACE_REPORT

Scope
- Instrumentation and execution-path tracing for sponsorship handler at:
  server/routes/admin/vendor.control.ts
  Handler: router.patch("/ :id/sponsorship")

Changes made (instrumentation)
- Added numbered console logs at key execution points:
  - [HANDLER_ENTER] — logged immediately on handler entry with request path/method
  - [BODY_PARSED] — logs parsed req.body
  - [PRISMA_UPDATE_START] — before calling prisma.vendor.update
  - [PRISMA_UPDATE_SUCCESS] — on successful update, includes durationMs
  - [PRISMA_UPDATE_ERROR] — on prisma error or timeout
  - [AUDIT_START] — before adminLog.create
  - [AUDIT_SUCCESS] / [AUDIT_ERROR] — audit result logged
  - [REALTIME_START] / [REALTIME_SUCCESS] / [REALTIME_WARN] / [REALTIME_ERROR] — realtime emit lifecycle; emit is fire-and-forget and cannot block response
  - [RESPONSE_SENT] — before sending final JSON response
  - [HANDLER_ERROR] — top-level catch for unhandled errors

Async subsection wrapping
- Prisma update: wrapped in Promise.race with timeout (prismaTimeoutMs = 5000 ms). Errors/timeouts are caught and returned as 500 with [PRISMA_UPDATE_ERROR] log.
- Audit log: wrapped in try/catch; failures are logged as warnings (do not abort the response path).
- Realtime emit: isolated in nested try/catch; emit is not awaited; synchronous emit errors are logged as warnings—cannot block response.
- Response: built safeVendor DTO and returned via res.status(200).json(...) in all successful paths; all early error paths return a JSON error.

SafeVendor DTO
- Constructed explicitly to avoid returning raw Prisma object with relations or socket metadata:
  { id, name, slug, districtId, status, isVerified, boostedUntil, isSponsored, dsslScore, updatedAt }
- isSponsored is a derived boolean computed from boostedUntil > now to preserve frontend contract.

Timeout-protection
- Prisma update timed out after 5000ms and triggers PRISMA_UPDATE_ERROR. This protects against stuck DB calls causing the request to hang indefinitely.
- PRISMA_UPDATE_SUCCESS log includes durationMs to help diagnose slow DB.

Expected log sequence (successful flow)
1. [HANDLER_ENTER] { path, method }
2. [BODY_PARSED] { body }
3. [PRISMA_UPDATE_START] { id, boostedUntil }
4. [PRISMA_UPDATE_SUCCESS] { id, durationMs }
5. [AUDIT_START] { adminId, targetId }
6. [AUDIT_SUCCESS]
7. [REALTIME_START]
8. [REALTIME_SUCCESS]
9. [RESPONSE_SENT] { vendorId, isSponsored }

If realtime warn occurs, [REALTIME_WARN] appears between steps 7 and 9; response still sent.
If AUDIT write fails, [AUDIT_ERROR] shows; response still sent.
If PRISMA times out or errors, [PRISMA_UPDATE_ERROR] then [HANDLER_ERROR] and 500 returned.

Repro steps (admin token required)
1. Start server in dev mode (already running): npm run dev:backend
2. Obtain admin auth token or cookie as SUPER_ADMIN (login flow)
3. From a terminal (PowerShell example):

   $hdrs = @{
     "Content-Type" = "application/json";
     "Authorization" = "Bearer <ADMIN_TOKEN>"
   }
   Invoke-RestMethod -Uri "http://localhost:5002/api/admin/vendors/1/sponsorship" -Method PATCH -Headers $hdrs -Body '{"isSponsored":true,"durationDays":7}'

   Or curl (POSIX):
   curl -X PATCH "http://localhost:5002/api/admin/vendors/1/sponsorship" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <ADMIN_TOKEN>" \
     -d '{"isSponsored":true,"durationDays":7}'

4. Tail server logs and observe the numbered log sequence above. Logs are printed to server stdout.

Investigation guidance: interpreting logs
- If you see [HANDLER_ENTER] but not [BODY_PARSED], the body parser middleware may not be applied or request has no body.
- If you see [PRISMA_UPDATE_START] but not [PRISMA_UPDATE_SUCCESS] or [PRISMA_UPDATE_ERROR] within ~5s, check DB-level locks or long-running transactions. The timeout will force a PRISMA_UPDATE_ERROR after 5s.
- If PRISMA_UPDATE_SUCCESS appears but no [RESPONSE_SENT], inspect audit and realtime logs: audit is awaited — if audit write blocks indefinitely (rare) it could delay response; but audit is wrapped in try/catch and will not prevent response on failure. We log [AUDIT_START] and [AUDIT_SUCCESS]/[AUDIT_ERROR].
- If [REALTIME_START] appears but no subsequent logs, the emit code is guarded; synchronous emit failures are caught and logged. No blocking should occur.

Likely root causes for frontend retry loop (diagnostic checklist)
- Missing or invalid auth causing middleware to retry (but middleware would return 401; check logs for auth middleware logs).
- Client not receiving response due to network/proxy dropping connections — check server [RESPONSE_SENT] log absence.
- Long-running prisma update (DB slowness) causing request to hang until timeout — look for absence of [PRISMA_UPDATE_SUCCESS/ERROR]. Increase prismaTimeoutMs temporarily to observe.
- Unhandled exception before response serialization — will log [HANDLER_ERROR].

What I changed (single file)
- server/routes/admin/vendor.control.ts — instrumentation, timeout, DTO, non-blocking realtime.

Next steps for you to run (I will not run them without instruction)
1. Trigger sponsorship API from admin client while tailing server logs.
2. Capture the exact log sequence for a failing request and paste it here.
3. If PRISMA_UPDATE_TIMEOUT occurs, run a quick DB query to check latency and any locks.

If logs show PRISMA_UPDATE_SUCCESS but frontend still retries, likely network/proxy or frontend expectations (e.g., it waits for specific JSON shape). Confirm safeVendor fields present.

Stop. Awaiting logs from your environment to pinpoint the stall point. 
