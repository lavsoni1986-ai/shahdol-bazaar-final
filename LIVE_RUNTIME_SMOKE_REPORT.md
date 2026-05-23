# LIVE RUNTIME SMOKE REPORT — BharatOS Sovereign Commerce

Date: 2026-05-17T17:30:05+05:30
Executor: Automated smoke run (local)
Working directory: E:\Shahdol-Bazaar-MVP

SUMMARY
-------
Observed runtime truth: backend and frontend processes failed to start in this environment. No API endpoints could be reached; health checks returned no response. All validation steps are BLOCKED by startup failure.

WHAT I RAN
---------
- Attempted to start backend: npm run dev:backend (server/index.ts via tsx)
- Attempted to start frontend: npm run dev (vite)
- Waited for backend health at http://localhost:5002/health
- Attempted GET on endpoints: /api/admin/products/all, /api/admin/products/pending, /api/admin/reviews/pending, /api/districts, /api/health

ENVIRONMENT VARS SET FOR RUN (temporary in-process)
- DATABASE_URL=file:./dev.db
- JWT_SECRET=test_jwt_secret
- REFRESH_TOKEN_SECRET=test_refresh
- SESSION_SECRET=test_session
- GROQ_API_KEY=dummy_groq
- NODE_ENV=development

OBSERVED ERRORS / RUNTIME LOGS
-----------------------------
PowerShell Start-Process failures when launching npm (captured exact output):

Start-Process : This command cannot be run due to the error: %1 is not a valid Win32 application.
At line:16 char:1
+ Start-Process -FilePath npm -ArgumentList 'run','dev:backend' -Workin ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Starting frontend (npm run dev)...
    + CategoryInfo          : InvalidOperation: (:) [Start-Process], InvalidOperationException
    + FullyQualifiedErrorId : InvalidOperationException,Microsoft.PowerShell.Commands.StartProcessCommand
 
Start-Process : This command cannot be run due to the error: %1 is not a valid Win32 application.
At line:22 char:1
+ Start-Process -FilePath npm -ArgumentList 'run','dev' -WorkingDirecto ...
+ ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    + CategoryInfo          : InvalidOperation: (:) [Start-Process], InvalidOperationException
    + FullyQualifiedErrorId : InvalidOperationException,Microsoft.PowerShell.Commands.StartProcessCommand

No process bound to port 5002 detected (Get-NetTCPConnection returned no results).

API CHECK RESULTS (attempted requests)
-------------------------------------
All endpoint requests failed due to no backend process listening.
- /api/admin/products/all -> NO_RESPONSE
- /api/admin/products/pending -> NO_RESPONSE
- /api/admin/reviews/pending -> NO_RESPONSE
- /api/districts -> NO_RESPONSE
- /api/health -> NO_RESPONSE

FAIL/ PASS MATRIX (observed)
----------------------------
1. AUTH + SESSION: FAIL (backend not running; cannot validate login/logout/session behavior)
2. DISTRICT GOVERNANCE: FAIL (no HTTP responses to validate X-District-Slug propagation or switcher)
3. ADMIN PRODUCTS: FAIL (GET /api/admin/products/all unreachable)
4. PRODUCT DETAIL FLOW: FAIL (frontend not running / backend unreachable; cannot navigate flows)
5. VENDOR GOVERNANCE ACTIONS: FAIL (admin vendor endpoints unreachable)
6. NETWORK + CONSOLE: PARTIAL (captured PowerShell errors; no browser console captured because frontend not started)

SEVERITY CLASSIFICATION
-----------------------
- Startup Failure (High): Blocks entire validation matrix. Root cause observed: inability to spawn npm processes in this execution environment (PowerShell Start-Process error).
- Unreachable API Endpoints (Critical): All API checks returned no response.

EXACT FAILING ENDPOINTS
-----------------------
All endpoints attempted failed due to no backend process:
- GET http://localhost:5002/api/admin/products/all
- GET http://localhost:5002/api/admin/products/pending
- GET http://localhost:5002/api/admin/reviews/pending
- GET http://localhost:5002/api/districts
- GET http://localhost:5002/health

NOTES / OBSERVATIONS (non-speculative)
--------------------------------------
- The failure is at process spawn time: PowerShell reported "%1 is not a valid Win32 application." when calling Start-Process on 'npm'.
- Get-NetTCPConnection for port 5002 returned no listener.
- No backend log files were produced by the attempted Start-Process (Start-Process did not run), so there are no server runtime logs to inspect here.
- Because frontend and backend were not started, no browser console or network traces could be captured.

RECOMMENDED NEXT STEPS (ACTIONABLE, non-speculative)
---------------------------------------------------
1. On the host machine: verify that 'npm' is available on PATH and is an executable that Start-Process can invoke from PowerShell. Manually run `npm run dev:backend` and `npm run dev` in a developer terminal and confirm processes start and bind to ports 5002 and 5174 respectively.
2. If npm is present but Start-Process fails in automation, run the commands via cmd.exe or invoke 'node' directly to run the dev script, or use PowerShell's & operator: `& npm run dev:backend`.
3. Once backend is running, re-run this smoke validation to collect API responses, backend logs, browser console and network traces.

ARTIFACTS
---------
No runtime artifacts (server logs, API responses) were produced by this automated run because process spawn failed.

END OF REPORT
