// ============================================
// 🚀 VERCEL SERVERLESS BRIDGE — BharatOS API
// ============================================
// This file is the Vercel serverless entry point.
// It imports the fully-configured Express app from
// server/index.ts (full middleware: CORS, helmet,
// rate-limit, session, tenantResolver, auth, etc.)
// and re-exports it as the default handler.
//
// Routes are mounted at /api/* via registerSovereignRoutes()
// inside server/index.ts when process.env.VERCEL is set.
//
// DO NOT duplicate middleware here — let server/index.ts
// be the single source of backend truth.
// ============================================

import "dotenv/config";

console.log("🔵 [VERCEL BRIDGE] Loading BharatOS serverless handler...");
console.log("🔵 [VERCEL BRIDGE] DATABASE_URL present:", !!process.env.DATABASE_URL);
console.log("🔵 [VERCEL BRIDGE] NODE_ENV:", process.env.NODE_ENV);

let dbHost = "unknown";
try {
  const dbUrl = process.env.DATABASE_URL || "";
  dbHost = dbUrl ? new URL(dbUrl).hostname : "missing";
} catch {
  dbHost = "parse-error";
}
console.log("🔵 [VERCEL BRIDGE] DATABASE_URL host:", dbHost);

// Import the full sovereign Express app from the backend runtime.
// server/index.ts detects process.env.VERCEL and:
//   1. Registers all sovereign routes at import time (not inside startServer)
//   2. Skips httpServer.listen() and Socket.IO init
//   3. Exports the fully-configured app as default
import app from "../server/index";

// Vercel expects a default export compatible with (req, res)
export default app;
