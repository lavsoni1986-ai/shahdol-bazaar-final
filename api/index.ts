// ============================================
// 🚀 VERCEL SERVERLESS ENTRY POINT — BharatOS API
// ============================================
// SURGICAL FIX: This file is the self-contained Vercel serverless handler.
//
// ❌ DOES NOT import: ../server/index  (would pull in httpServer, Vite, fs, Socket.IO)
// ✅ DOES import:     registerSovereignRoutes  (pure route registration)
// ✅ DOES import:     required middleware only
// ✅ DOES export:     default app  (Vercel serverless handler contract)
//
// Routes mounted:  /api/*  (rewritten by vercel.json → /api/index)
// ============================================

import "dotenv/config";

import express, { type Request, type Response, type NextFunction } from "express";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import crypto from "crypto";

// ✅ Route registration — the only import from server/
import { registerSovereignRoutes } from "../server/routes/index";

// ✅ Middleware — serverless-safe imports only
import { apiCacheMiddleware } from "../api-cache-headers";
import { tenantContext } from "../server/storage";
import { tenantResolver } from "../server/middleware/tenantResolver";
import { errorHandler } from "../server/middleware/errorHandler";
import { centralizedCors } from "../server/config/cors";

// ============================================
// DIAGNOSTICS
// ============================================
console.log("🔵 [VERCEL] BharatOS serverless handler loading...");
console.log("🔵 [VERCEL] NODE_ENV:", process.env.NODE_ENV);
console.log("🔵 [VERCEL] DATABASE_URL present:", !!process.env.DATABASE_URL);

let dbHost = "unknown";
try {
  const dbUrl = process.env.DATABASE_URL || "";
  dbHost = dbUrl ? new URL(dbUrl).hostname : "missing";
} catch {
  dbHost = "parse-error";
}
console.log("🔵 [VERCEL] DATABASE_URL host:", dbHost);

// ============================================
// EXPRESS APP — Serverless-safe bootstrap
// ============================================
const app = express();

// Trust first proxy (Vercel sits behind a load balancer)
app.set("trust proxy", 1);

// ============================================
// COMPRESSION
// ============================================
app.use(
  compression({
    level: 6,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  })
);

app.use(centralizedCors);
app.options("*", centralizedCors);

// ============================================
// SECURITY HEADERS (Helmet — production CSP)
// ============================================
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://sdk.cashfree.com",
          "https://widget.cloudinary.com",
          "https://*.cloudinary.com",
          "https://onesignal.com",
          "https://cdn.onesignal.com",
          "https://*.onesignal.com",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
        connectSrc: ["'self'", "https:", "http:", "wss:", "ws:"],
        frameSrc: ["'self'", "https://*.cashfree.com", "https://*.cloudinary.com"],
        workerSrc: ["'self'", "blob:"],
        childSrc: ["'self'", "blob:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// Additional security headers
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// ============================================
// COOKIE PARSER
// ============================================
app.use(cookieParser());

// ============================================
// API CACHE HEADERS (CDN edge caching)
// ============================================
app.use("/api", apiCacheMiddleware);

// ============================================
// CASHFREE WEBHOOK — raw body BEFORE express.json()
// ============================================
app.use("/api/payments/webhook/cashfree", express.raw({ type: "application/json" }));

// Inline webhook handler (avoids importing the whole payments module just for this)
app.post("/api/payments/webhook/cashfree", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-webhook-signature"] as string | undefined;
    if (!signature) {
      return res.status(401).json({ success: false, error: "Missing signature" });
    }

    const rawBody = req.body as Buffer;
    if (!rawBody || rawBody.length === 0) {
      return res.status(400).json({ success: false, error: "Empty body" });
    }

    const timestamp = req.headers["x-webhook-timestamp"] as string | undefined;
    if (timestamp) {
      const webhookTime = new Date(timestamp).getTime();
      const FIVE_MINUTES_MS = 5 * 60 * 1000;
      if (isNaN(webhookTime) || Date.now() - webhookTime > FIVE_MINUTES_MS) {
        return res.status(401).json({ success: false, error: "Expired request" });
      }
    }

    const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_SECRET_KEY;
    if (!webhookSecret) {
      return res.status(500).json({ success: false, error: "Server configuration error" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("base64");

    const signatureBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);

    if (
      signatureBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(signatureBuf, expectedBuf)
    ) {
      return res.status(401).json({ success: false, error: "Invalid signature" });
    }

    const payload = JSON.parse(rawBody.toString("utf8"));
    if (!payload?.data?.order?.order_id || !payload?.data?.order?.order_status) {
      return res.status(400).json({ success: false });
    }

    const { order_id, order_status } = payload.data.order;
    if (order_status === "PAID") {
      console.log(`💳 [WEBHOOK] Payment received for order ${order_id}`);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ [WEBHOOK] Processing failed:", err);
    return res.status(500).json({ success: false });
  }
});

// ============================================
// BODY PARSERS
// ============================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// ============================================
// REQUEST TRACKING — AsyncLocalStorage tenant context
// ============================================
app.use((req: Request, _res: Response, next: NextFunction) => {
  const requestId = crypto.randomUUID();
  (req as any).requestId = requestId;
  (req as any).startTime = Date.now();

  tenantContext.run({ districtId: -1, requestId }, () => {
    next();
  });
});

// ============================================
// TENANT RESOLVER — district context injection
// ============================================
app.use("/api", tenantResolver);

// ============================================
// ROUTE FLAG INJECTION
// ============================================
app.use("/api", (req: Request, _res: Response, next: NextFunction) => {
  const url = req.originalUrl;
  (req as any).isAdminRoute = url.startsWith("/api/admin");
  (req as any).isPublicRoute =
    url.startsWith("/api/health") ||
    url.startsWith("/api/docs") ||
    url.startsWith("/api/public");
  (req as any).requiresAuth =
    !url.startsWith("/api/auth") && !(req as any).isPublicRoute;
  return next();
});

// ============================================
// HEALTH CHECK (no DB dependency — Vercel uptime probe)
// ============================================
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    serverless: true,
  });
});

// ============================================
// SOVEREIGN ROUTE REGISTRATION
// ============================================
// registerSovereignRoutes is async but contains only synchronous app.use() calls.
// We mount an intermediate router synchronously and register routes into it.
const apiRouter = express.Router();

registerSovereignRoutes(apiRouter).catch((err: any) => {
  console.error("❌ [VERCEL] Failed to register sovereign routes:", err?.message || err);
});

app.use("/api", apiRouter);

console.log("✅ [VERCEL] Sovereign routes registered on /api");

// ============================================
// 404 HANDLER (API scope only)
// ============================================
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: "API endpoint not found" });
});

// ============================================
// GLOBAL ERROR HANDLER
// ============================================
app.use(errorHandler);

// ============================================
// EXPORT — Vercel serverless handler contract
// ============================================
// DO NOT call app.listen() — Vercel handles the HTTP layer
export default app;
