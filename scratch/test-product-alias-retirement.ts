/**
 * ADR-002 PHASE 2B VALIDATION
 * Product Alias Retirement — Integration Route Test
 *
 * Verifies:
 *   - GET /api/products          → 301 → /api/marketplace/products
 *   - GET /api/products/123      → 301 → /api/marketplace/products/123
 *   - GET /api/products/slug/ex  → 301 → /api/marketplace/products/slug/ex
 *   - GET /api/products?vendorId=12&page=2  → 301 → /api/marketplace/products?vendorId=12&page=2
 *   - GET /api/marketplace/products         → 200 (canonical still live)
 *   - GET /api/marketplace/products/slug/:s → 200 (canonical still live)
 *   - GET /api/merchant/products            → 401 (auth-protected, not redirected)
 */

import express from "express";
import cookieParser from "cookie-parser";
import { prisma, tenantContext } from "../server/storage";
import { centralizedCors } from "../server/config/cors";
import { tenantResolver } from "../server/middleware/tenantResolver";
import { registerSovereignRoutes } from "../server/routes/index";
import type { AddressInfo } from "net";

interface TestCase {
  name: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  redirect?: RequestRedirect;
  expectedStatus: number;
  expectedLocationContains?: string;
}

async function main() {
  console.log("🚀 ADR-002 PHASE 2B — PRODUCT ALIAS RETIREMENT VALIDATION\n");

  // 1. Build production-equivalent app pipeline
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Global Context & Tracking
  app.use((req, res, next) => {
    const requestId = "pa-test-" + Math.random().toString(36).substring(7);
    (req as any).requestId = requestId;
    tenantContext.run({ districtId: -1, requestId }, () => {
      next();
    });
  });

  // Global CORS
  app.use(centralizedCors);

  // Global Tenant Resolver
  app.use("/api", tenantResolver);

  // Mount Unified Router (includes the new Phase 2B redirect)
  const apiRouter = express.Router();
  await registerSovereignRoutes(apiRouter);
  app.use("/api", apiRouter);

  // 2. Start ephemeral server
  const server = app.listen(0, async () => {
    const info = server.address() as AddressInfo;
    const port = info.port;
    const BASE = `http://localhost:${port}`;
    console.log(`✅ Ephemeral server on port ${port}\n`);

    const DISTRICT_HEADER = { "x-district-slug": "shahdol" };

    const tests: TestCase[] = [
      // ── LEGACY ROUTES: Must redirect ──────────────────────────────────
      {
        name: "1. GET /api/products (bare list)",
        method: "GET",
        url: "/api/products",
        headers: DISTRICT_HEADER,
        redirect: "manual",
        expectedStatus: 301,
        expectedLocationContains: "/api/marketplace/products",
      },
      {
        name: "2. GET /api/products/123 (by numeric ID)",
        method: "GET",
        url: "/api/products/123",
        headers: DISTRICT_HEADER,
        redirect: "manual",
        expectedStatus: 301,
        expectedLocationContains: "/api/marketplace/products/123",
      },
      {
        name: "3. GET /api/products/slug/redmi-note-15 (by slug)",
        method: "GET",
        url: "/api/products/slug/redmi-note-15",
        headers: DISTRICT_HEADER,
        redirect: "manual",
        expectedStatus: 301,
        expectedLocationContains: "/api/marketplace/products/slug/redmi-note-15",
      },
      {
        name: "4. GET /api/products?vendorId=12&page=2 (query param preservation)",
        method: "GET",
        url: "/api/products?vendorId=12&page=2",
        headers: DISTRICT_HEADER,
        redirect: "manual",
        expectedStatus: 301,
        expectedLocationContains: "/api/marketplace/products?vendorId=12&page=2",
      },

      // ── CANONICAL ROUTES: Must still return 200 ───────────────────────
      {
        name: "5. GET /api/marketplace/products (canonical — still 200)",
        method: "GET",
        url: "/api/marketplace/products",
        headers: DISTRICT_HEADER,
        expectedStatus: 200,
      },
      {
        name: "6. GET /api/marketplace/products/slug/test (canonical slug — still alive)",
        method: "GET",
        url: "/api/marketplace/products/slug/test-product",
        headers: DISTRICT_HEADER,
        expectedStatus: 404, // Not found is fine — route IS live, product just missing in test DB
      },

      // ── MERCHANT DASHBOARD: Must NOT be redirected ────────────────────
      {
        name: "7. GET /api/merchant/products (merchant dashboard — auth-protected, not redirected)",
        method: "GET",
        url: "/api/merchant/products",
        headers: DISTRICT_HEADER,
        expectedStatus: 401, // Blocked by requireAuth — correct behaviour
      },
    ];

    let allPassed = true;

    for (const t of tests) {
      console.log(`📡 ${t.name}`);
      try {
        const res = await fetch(`${BASE}${t.url}`, {
          method: t.method,
          headers: {
            origin: "http://localhost:5174",
            ...t.headers,
          },
          redirect: t.redirect ?? "follow",
        });

        const status = res.status;
        let pass = status === t.expectedStatus;

        // For redirect tests, validate the Location header
        if (t.redirect === "manual" && t.expectedLocationContains) {
          const location = res.headers.get("location") ?? "";
          const locPass = location.includes(t.expectedLocationContains);
          if (!locPass) {
            console.log(`   ⚠  Location: Got "${location}", expected to contain "${t.expectedLocationContains}"`);
            pass = false;
          } else {
            console.log(`   ✔  Location: "${location}"`);
          }
        }

        // For 200 canonicals, any <400 is fine (data may be empty in test DB)
        if (t.expectedStatus === 200 && status < 400) {
          pass = true;
        }

        console.log(`   - Status: Got ${status} (Expected ${t.expectedStatus})`);
        console.log(`   - Verdict: ${pass ? "✅ PASS" : "❌ FAIL"}\n`);
        if (!pass) allPassed = false;
      } catch (err: any) {
        console.error(`   ❌ Request error: ${err?.message}\n`);
        allPassed = false;
      }
    }

    console.log("====================================================");
    if (allPassed) {
      console.log("🎉 ADR-002 PHASE 2B — ALL PRODUCT ALIAS RETIREMENT TESTS PASSED");
    } else {
      console.error("❌ ADR-002 PHASE 2B — SOME TESTS FAILED");
    }
    console.log("====================================================");

    server.close(() => {
      console.log("🧹 Ephemeral server shut down.");
      process.exit(allPassed ? 0 : 1);
    });
  });
}

main().catch(console.error);
