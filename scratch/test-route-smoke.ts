import express from "express";
import cookieParser from "cookie-parser";
import { prisma, tenantContext } from "../server/storage";
import { centralizedCors } from "../server/config/cors";
import { tenantResolver } from "../server/middleware/tenantResolver";
import { registerSovereignRoutes } from "../server/routes/index";
import type { AddressInfo } from "net";

async function main() {
  console.log("🚀 INITIALIZING BHARATOS INTEGRATION ROUTE SMOKE TESTS\n");

  // 1. Build Production App Pipeline
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Global Context & Tracking
  app.use((req, res, next) => {
    const requestId = "smoke-req-" + Math.random().toString(36).substring(7);
    (req as any).requestId = requestId;
    tenantContext.run({ districtId: -1, requestId }, () => {
      next();
    });
  });

  // Global Centralized CORS
  app.use(centralizedCors);

  // Global Tenant Resolver
  app.use("/api", tenantResolver);

  // Mount Unified Router
  const apiRouter = express.Router();
  await registerSovereignRoutes(apiRouter);
  app.use("/api", apiRouter);

  // 2. Start Express server on ephemeral port (0 selects any free port)
  const server = app.listen(0, async () => {
    const info = server.address() as AddressInfo;
    const port = info.port;
    const baseUrl = `http://localhost:${port}`;
    console.log(`✅ Ephemeral local server listening on ${baseUrl}\n`);

    const tests = [
      {
        name: "1. POST /api/auth/login (Public Pre-Auth)",
        method: "POST",
        url: "/api/auth/login",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "nonexistent_smoke_user", password: "password" }),
        expectedStatus: 401, // Unauthorized for bad credentials, proving route matches
      },
      {
        name: "2. POST /api/auth/register (Public Pre-Auth)",
        method: "POST",
        url: "/api/auth/register",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "smoke_test_user", password: "password" }),
        expectedStatus: 400, // Validation/duplicate error, proving route matches
      },
      {
        name: "3. GET /api/marketplace/products (Guest Marketplace)",
        method: "GET",
        url: "/api/marketplace/products",
        headers: { "x-district-slug": "shahdol" },
        expectedStatus: 200,
      },
      {
        name: "4. GET /api/marketplace/stores (Guest Stores)",
        method: "GET",
        url: "/api/marketplace/stores",
        headers: { "x-district-slug": "shahdol" },
        expectedStatus: 200,
      },
      {
        name: "5. GET /api/orders (Protected orders - Unauthorized)",
        method: "GET",
        url: "/api/orders",
        headers: { "x-district-slug": "shahdol" },
        expectedStatus: 401, // Blocked without JWT
      },
      {
        name: "6. GET /api/admin/vendors (Protected admin - Unauthorized)",
        method: "GET",
        url: "/api/admin/vendors",
        headers: { "x-district-slug": "shahdol" },
        expectedStatus: 401, // Blocked without JWT
      },
    ];

    let allPassed = true;
    for (const t of tests) {
      console.log(`📡 Sending ${t.method} ${t.url}...`);
      try {
        const res = await fetch(`${baseUrl}${t.url}`, {
          method: t.method,
          headers: {
            origin: "http://localhost:5174",
            ...t.headers,
          },
          body: t.body,
        });

        const status = res.status;
        const pass = status === t.expectedStatus || (t.expectedStatus === 200 && status < 400);
        
        let errorMsg = "";
        try {
          const json: any = await res.json();
          if (json && json.error) {
            errorMsg = json.error;
          }
        } catch {}

        console.log(`   - Status: Received ${status} (Expected ${t.expectedStatus})`);
        console.log(`   - CORS Headers: Vary = ${res.headers.get("vary")}, OriginReflect = ${res.headers.get("access-control-allow-origin")}`);
        if (errorMsg) {
          console.log(`   - Response Error: "${errorMsg}"`);
        }
        console.log(`   - Verdict: ${pass ? "✅ PASS" : "❌ FAIL"}\n`);

        if (!pass) allPassed = false;
      } catch (err: any) {
        console.error(`   - ❌ Request failed with error:`, err?.message || err);
        allPassed = false;
      }
    }

    console.log("====================================================");
    if (allPassed) {
      console.log("🎉 ALL INTEGRATION ROUTE SMOKE TESTS PASSED");
    } else {
      console.error("❌ SOME INTEGRATION ROUTE SMOKE TESTS FAILED");
    }
    console.log("====================================================");

    // Shutdown server and exit
    server.close(() => {
      console.log("🧹 Local server shut down.");
      process.exit(allPassed ? 0 : 1);
    });
  });
}

main()
  .catch(console.error);
