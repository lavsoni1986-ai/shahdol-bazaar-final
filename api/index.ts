import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { db } from "../server/db.js";
import { sql } from "drizzle-orm";

console.log("🔵 [FN BOOT] Vercel function starting...");
console.log("🔵 [FN BOOT] DATABASE_URL present:", !!process.env.DATABASE_URL);
console.log("🔵 [FN BOOT] NODE_ENV:", process.env.NODE_ENV);

// Lightweight Express handler for Vercel Serverless Functions.
const app = express();

app.use(cors({
  origin: "*", // tighten to your prod domains if needed
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// Inline health to avoid routes import failures blocking startup.
app.get("/api/health", async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    return res.json({ status: "ok" });
  } catch (err: any) {
    console.error("❌ /api/health failed:", err?.message || err);
    return res.status(500).json({ status: "error", message: "DB unavailable" });
  }
});

app.get("/api/health-fn", (_req, res) => res.json({ status: "ok", scope: "function" }));

let httpServer: ReturnType<typeof createServer> | null = null;

const loadRoutes = async () => {
  try {
    const { registerRoutes } = await import("../server/routes.js");
    httpServer = createServer(app);
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

