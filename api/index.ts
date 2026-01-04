import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

console.log("🔵 [FN BOOT] Vercel function starting...");
console.log("🔵 [FN BOOT] DATABASE_URL present:", !!process.env.DATABASE_URL);

// Lightweight Express handler for Vercel Serverless Functions.
// We do NOT listen on a port here; Vercel invokes the handler per request.
// Touching this file forces a fresh Vercel build & re-bundle of server/shared code.
const app = express();

app.use(cors({
  origin: "*", // tighten to your prod domains if needed
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

const httpServer = createServer(app);

// Register API routes (best-effort async init)
try {
  registerRoutes(httpServer, app)
    .then(() => console.log("✅ [FN BOOT] Routes registered"))
    .catch((err) => {
      console.error("❌ Failed to register routes in serverless handler:", err);
    });
} catch (err) {
  console.error("❌ Exception while registering routes:", err);
}

// Simple health for the function itself (bypasses DB)
app.get("/api/health-fn", (_req, res) => {
  res.json({ status: "ok", scope: "function" });
});

// Vercel Node functions expect a default export compatible with (req, res)
export default app;

