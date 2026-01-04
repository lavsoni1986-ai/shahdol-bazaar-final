import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";

console.log("🔵 [FN BOOT] Vercel function starting...");
console.log("🔵 [FN BOOT] DATABASE_URL present:", !!process.env.DATABASE_URL);
console.log("🔵 [FN BOOT] NODE_ENV:", process.env.NODE_ENV);
try {
  const dbUrl = process.env.DATABASE_URL || "";
  const dbHost = dbUrl ? new URL(dbUrl).hostname : "";
  console.log("🔵 [FN BOOT] DATABASE_URL host:", dbHost || "missing");
} catch (err: any) {
  console.error("❌ [FN BOOT] Failed to parse DATABASE_URL:", err?.message || err);
}

// Lightweight Express handler for Vercel Serverless Functions.
const app = express();

app.use(cors({
  origin: "*", // tighten to your prod domains if needed
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// Inline health to avoid hard dependency on routes module
app.get("/api/health", async (_req, res) => {
  try {
    const { verifyDbConnection } = await import("../server/db.js");
    await verifyDbConnection();
    return res.json({ status: "ok" });
  } catch (err: any) {
    console.error("❌ /api/health failed:", err?.message || err);
    console.error(err?.stack || err);
    return res.status(500).json({ status: "error", message: "DB unavailable" });
  }
});

// Function-level health (no DB)
app.get("/api/health-fn", (_req, res) => res.json({ status: "ok", scope: "function" }));

// Lazy-load the heavier routes; failure won't crash health endpoints
const loadRoutes = async () => {
  try {
    console.log("🔵 [FN BOOT] Attempting to load routes module...");
    const { registerRoutes } = await import("../server/routes.js");
    const httpServer = createServer(app);
    await registerRoutes(httpServer, app);
    console.log("✅ [FN BOOT] Routes registered");
  } catch (err: any) {
    console.error("❌ Failed to register routes in serverless handler:", err?.message || err);
    console.error(err?.stack || err);
  }
};

loadRoutes();

// Vercel Node functions expect a default export compatible with (req, res)
export default app;

// Trigger redeploy: 2026-01-04T00:00:00Z

