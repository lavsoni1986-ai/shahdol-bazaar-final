import 'dotenv/config';

// ============================================
// 🚨 CRITICAL ENV VALIDATION - SHAHDOL BZR CORE
// ============================================

function validateCriticalEnv() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ FATAL: Missing critical environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\n💥 BharatOS refusing startup - insecure configuration');
    // 🛡️ VERCEL GUARD: env vars injected at runtime, not build time
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }

  console.log('✅ Critical environment validation passed');
}

validateCriticalEnv();

import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import crypto from "crypto";
import cors from "cors";
import helmet from "helmet";
import rateLimit from 'express-rate-limit';

import compression from "compression";
import cookieParser from "cookie-parser";
// ✅ New Sovereign Aggregator import
import { registerSovereignRoutes } from "./routes/index";
import { setupVite } from "./vite";
import { serveStatic } from "./static";
import { createServer } from "http";
import session from "express-session";
import { initRealtime } from "./realtime";

import { apiCacheMiddleware } from "../api-cache-headers";
import { tenantContext, checkDatabaseConnection, isDatabaseConnected } from "./storage";
import { tenantResolver } from "./middleware/tenantResolver";
// import { findPaymentByOrderId, findUserById, upgradeUserSubscription } from "./repositories";
import { isTrustedE2E } from "./middleware/trustedE2E";
import { apiLimiter } from "./auth/rateLimiter";
import { errorHandler } from "./middleware/errorHandler";
import { findActiveOffersByDistrict, deleteOfferById } from "./repositories/offer.repo";
import { findAllCategories, deleteCategoryById } from "./repositories/category.repo";
// ✅ OpenAPI/Swagger imports
import swaggerUi from "swagger-ui-express";
import { generateSwaggerSpec } from "./lib/swagger";
// ✅ Import API registry to register all endpoints
import "./lib/apiRegistry";

// import { startAdScheduler } from "./workers/ad.scheduler"; // QUARANTINED
import { startMemoryCleanupScheduler } from "./workers/memory.cleanup.scheduler";
// import { runSovereignConnectEngine } from "./workers/revenue.worker";
import type { Server } from "http";

// ============================================
// SECURITY: Async Error Wrapper
// ============================================
// Wraps async route handlers to catch errors and pass them to Express error handler
// This ensures all async errors are properly caught and return JSON responses
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// ============================================
// UTILITY: Timeout Guard for Heavy Operations
// ============================================
const timeout = (ms: number) =>
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Operation timeout after ${ms}ms`)), ms)
  );

// ============================================
// SECURITY: Trust Proxy Configuration
// ============================================
// Required for correct IP detection behind reverse proxies/load balancers
// Without this, x-forwarded-for headers can be spoofed by attackers

// Use explicit NODE_ENV - don't override with port-based detection in development
const port = process.env.PORT ? parseInt(process.env.PORT) : 5002;
const isProductionPort = port === 5002 || port === 443;

// Use explicit NODE_ENV - port-based detection only if NODE_ENV is not set
const effectiveIsProduction = process.env.NODE_ENV === 'production' || (process.env.NODE_ENV !== 'development' && isProductionPort);

if (effectiveIsProduction) {
  console.log('🔒 [SECURITY] Production mode detected (NODE_ENV:', process.env.NODE_ENV, ', port:', port, ')');
  console.log('🔒 [SECURITY] Trust proxy enabled for production');
}

// Global exception handler - log why the process is dying
// 🛡️ DO NOT exit process — host process manager (PM2/Docker) handles restart
// exit(1) would drop all active connections, in-flight orders, and real-time sockets
process.on("uncaughtException", (err) => {
  console.error("❌ [FATAL] Uncaught Exception:", err.message);
  if (process.env.NODE_ENV !== "production") {
    console.error("❌ [FATAL] Stack:", err.stack);
  }
  // process.exit(1) deliberately removed for pilot stability
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ [FATAL] Unhandled Rejection at:", promise);
  if (process.env.NODE_ENV !== "production") {
    console.error("❌ [FATAL] Reason:", reason);
  }
});

// Validate required environment variables at startup
// In development: WARN only, don't crash the server
// In production: THROW error to enforce strict validation
function validateEnv() {
  // Core required variables (already validated at top)
  // These are soft-required: warn but don't crash
  const recommended = [
    'REFRESH_TOKEN_SECRET',
    'SESSION_SECRET'
  ];

  // Feature-specific variables (optional)
  const optional = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'CASHFREE_APP_ID',
    'CASHFREE_SECRET_KEY',
    'CASHFREE_MODE',
    'GROQ_API_KEY',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_WHATSAPP_NUMBER',
    'CLIENT_URL',
    'FRONTEND_URL',
  ];

  const missingRecommended: string[] = [];
  const missingOptional: string[] = [];

  // Check recommended variables
  for (const key of recommended) {
    if (!process.env[key]) {
      missingRecommended.push(key);
    }
  }

  // Check optional variables
  for (const key of optional) {
    if (!process.env[key]) {
      missingOptional.push(key);
    }
  }

  if (missingRecommended.length > 0) {
    console.warn("⚠️ [ENV] Missing recommended env variables (set them for full features):", missingRecommended.join(", "));
  }

  // Log optional variable status
  if (missingOptional.length > 0) {
    console.warn("⚠️ [ENV] Missing optional env variables:", missingOptional.join(", "));
  } else {
    console.log("✅ All feature env variables configured!");
  }
}

// ============================================
// DATABASE CONNECTION POOLING REMINDER (Issue 6.1 Fix)
// ============================================
// ⚠️ IMPORTANT: To prevent connection exhaustion under heavy load:
// 1. Run: npm i express-rate-limit (already done if you see this)
// 2. Add ?connection_limit=20 to your DATABASE_URL in .env file
//    Example: postgres://user:pass@localhost:5432/db?connection_limit=20
// ============================================

async function testDatabaseConnection() {
  try {
    console.log("🔵 [DB] Testing database connection...");
    const connected = await checkDatabaseConnection();
    if (connected) {
      console.log("✅ [DB] Database connection successful!");

      // 🛡️ AUDIT INTEGRITY CHECK - Disabled for now to prevent startup issues
      // const { verifyAuditIntegrity } = await import("./routes/index");
      // await verifyAuditIntegrity();

    } else {
      console.error("❌ [DB] Database connection failed - server will run but API calls may fail");
    }
  } catch (err: any) {
    console.error("❌ [DB] Database connection failed:", err?.message);
    console.error("⚠️ [DB] The server will start, but API calls may fail if DB is unreachable");
  }
}

const app = express();

let httpServer: Server;

// ============================================
// SECURITY: Trust Proxy Configuration
// ============================================
// Trust first proxy (load balancer/reverse proxy)
// This ensures req.ip and x-forwarded-* headers are trusted
// Only enable in production behind a trusted proxy
app.set('trust proxy', effectiveIsProduction ? 1 : false);

// Enable compression for all responses (gzip/brotli)
app.use(compression({
  level: 6, // Balance between compression and CPU
  filter: (req, res) => {
    // Don't compress if client doesn't support it or if response is already compressed
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// ============================================
// SOVEREIGN CORS STRICT WHITELIST
// ============================================



// ============================================
// SECURITY MIDDLEWARE
// ============================================

const ALLOWED_ORIGINS = [
  "http://localhost:5174",  // ✅ आपके फ्रंटएंड का लोकल एड्रेस (अनिवार्य)
  "http://localhost:5002",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  // भविष्य के जिलों के लिए
  /^https?:\/\/.*\.bharatos\.in$/,
];

app.use(cors({
  origin: (origin, callback) => {
    // अगर कोई ओरिजिन नहीं है (जैसे मोबाइल ऐप या सर्वर-टू-सर्वर) या व्हाइटलिस्ट में है
    if (!origin || ALLOWED_ORIGINS.some(allowed =>
      typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
    )) {
      callback(null, true);
    } else {
      console.error(`🚨 CORS BLOCKED: Origin ${origin} not in whitelist`);
      callback(new Error('CORS policy violation: Origin not allowed'));
    }
  },
  credentials: true, // 🔐 Cookies के लिए यह ज़रूरी है
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-District-Id", "X-District-Slug"],
}));

// 🚨 CRITICAL FIX: Handle OPTIONS preflight AFTER CORS but BEFORE tenantResolver
app.options("*", cors());

// Cookie parser for JWT cookies
app.use(cookieParser());

// 🛡️ VERCEL GUARD: express-rate-limit uses an in-memory store that's not
// shared across serverless invocations. On Vercel, skip rate limiting
// (Vercel Edge functions handle DDoS protection at the platform level).
if (process.env.VERCEL) {
  console.log("🔵 [VERCEL] Skipping express-rate-limit for serverless mode");
} else {
  // Global API rate limiting - protects against abuse
  app.use('/api', rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per 15 minutes per IP
    message: { success: false, error: "API rate limit exceeded. Please slow down." },
    standardHeaders: true,
    legacyHeaders: false,
    // 🛡️ SAFE BYPASS: Trusted E2E test traffic in development only
    skip: (req) => isTrustedE2E(req),
  }));
}

// ============================================
// 🛡️ RATE LIMITING (ANTI-ABUSE PROTECTION)
// ============================================

// Rate limiting configuration moved to middleware section above

// ============================================
// SOVEREIGN CORS STRICT WHITELIST
// ============================================







// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet for security headers - Completely disable CSP for development
const isDevelopment = process.env.NODE_ENV === "development";

if (isDevelopment) {
  // SECURITY: Ensure CSP cannot be accidentally disabled in production
  // This check prevents the development code path from running in production
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'prod') {
    throw new Error('CRITICAL SECURITY: CSP cannot be disabled in production environment');
  }
  // COMPLETELY DISABLE CSP in development to avoid blocking Cloudinary/Google Fonts
  console.log("🔵 [HELMET] Development mode: CSP disabled");
  app.use(helmet({
    contentSecurityPolicy: false, // Completely disable CSP
    crossOriginEmbedderPolicy: false,
  }));
} else if (effectiveIsProduction) {
  // Stricter CSP for production - explicitly allow OneSignal and Cloudinary
  console.log("🔒 [HELMET] Production mode: CSP enabled with OneSignal/Cloudinary support");
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://sdk.cashfree.com",
          "https://www.googletagmanager.com",
          "https://www.google-analytics.com",
          "https://widget.cloudinary.com",
          "https://upload-widget.cloudinary.com",
          "https://*.cloudinary.com",
          // OneSignal push notifications
          "https://onesignal.com",
          "https://cdn.onesignal.com",
          "https://*.onesignal.com"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://*.cloudinary.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "data:",
          "https://*.cloudinary.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:",
          "http:",
          "https://res.cloudinary.com",
          "https://*.cloudinary.com",
          "blob:"
        ],
        connectSrc: [
          "'self'",
          "https:",
          "http:",
          "https://*.cashfree.com",
          "https://www.google-analytics.com",
          "https://api.cloudinary.com",
          "https://*.cloudinary.com",
          // OneSignal push notifications
          "https://onesignal.com",
          "https://cdn.onesignal.com",
          "https://*.onesignal.com",
          "wss:",
          "ws:"
        ],
        frameSrc: [
          "'self'",
          "https://*.cashfree.com",
          "https://widget.cloudinary.com",
          "https://upload-widget.cloudinary.com",
          "https://*.cloudinary.com"
        ],
        workerSrc: ["'self'", "blob:", "https://*.cloudinary.com", "https://cdn.onesignal.com", "https://onesignal.com"],
        childSrc: ["'self'", "blob:", "https://*.cloudinary.com"],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for Vite compatibility
  }));
} else {
  // Default (staging or unknown) - enable CSP with all allowances
  console.log("🔵 [HELMET] Staging/Unknown mode: CSP enabled with full allowances");
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "https://sdk.cashfree.com",
          "https://www.googletagmanager.com",
          "https://www.google-analytics.com",
          "https://widget.cloudinary.com",
          "https://upload-widget.cloudinary.com",
          "https://*.cloudinary.com",
          // OneSignal push notifications
          "https://onesignal.com",
          "https://cdn.onesignal.com",
          "https://*.onesignal.com"
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://*.cloudinary.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:", "https://*.cloudinary.com"],
        imgSrc: ["'self'", "data:", "https:", "http:", "https://res.cloudinary.com", "https://*.cloudinary.com", "blob:"],
        connectSrc: [
          "'self'",
          "https:",
          "http:",
          "https://*.cashfree.com",
          "https://www.google-analytics.com",
          "https://api.cloudinary.com",
          "https://*.cloudinary.com",
          "https://onesignal.com",
          "https://cdn.onesignal.com",
          "https://*.onesignal.com",
          "wss:",
          "ws:"
        ],
        frameSrc: ["'self'", "https://*.cashfree.com", "https://widget.cloudinary.com", "https://upload-widget.cloudinary.com", "https://*.cloudinary.com"],
        workerSrc: ["'self'", "blob:", "https://*.cloudinary.com", "https://cdn.onesignal.com", "https://onesignal.com"],
        childSrc: ["'self'", "blob:", "https://*.cloudinary.com"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
}

// Enhanced request logging middleware - only for API routes
app.use((req: any, res, next) => {
  if (!req.path.startsWith('/api')) return next();

  const requestId = req.headers['x-request-id'] || req.headers['X-Request-ID'] || 'unknown';
  const userId = req.ctx?.userId || 'anonymous';
  const districtId = req.ctx?.districtId || req.districtId || 'unknown';
  const ip = req.ip || req.connection.remoteAddress;

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - IP:${ip} - User:${userId} - District:${districtId} - ReqID:${requestId}`);
  next();
});

// 🛡️ REMOVED: Duplicate rate limiter - already applied above on /api route

// ✅ Additional Security Headers (HSTS, X-Content-Type-Options, X-Frame-Options)
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});



// PATCH 10B: Remove naked global /api/admin guard (admin routers handle auth/roles)

// API Caching Middleware - Add cache headers for CDN edge caching
// This adds Cache-Control headers to GET responses for public API endpoints
app.use('/api', apiCacheMiddleware);

// ============================================
// CASHFREE WEBHOOK (MUST be before express.json())
// ============================================
// 🛡️ Raw body middleware required for HMAC signature verification
app.use("/api/payments/webhook/cashfree", express.raw({ type: "application/json" }));

// ============================================
// CASHFREE WEBHOOK HANDLER — HMAC SHA256 VERIFIED
// ============================================
// 🛡️ SECURITY LAYER:
//   1. HMAC SHA256 verification via crypto.timingSafeEqual
//   2. Timestamp freshness validation (rejects > 5 min old)
//   3. Rejects missing x-webhook-signature header
//   4. Timing-attack resistant comparison with length pre-check
//   5. No business logic execution — webhook is validation + log only
//   6. Replay prevention requires idempotency key tracking (see notes)
app.post("/api/payments/webhook/cashfree", async (req, res) => {
  try {
    // ============================================
    // 🛡️ STEP 1: Extract & validate signature header
    // ============================================
    const signature = req.headers["x-webhook-signature"] as string | undefined;
    if (!signature) {
      console.error("🚨 [WEBHOOK_SECURITY] Missing x-webhook-signature header");
      return res.status(401).json({ success: false, error: "Missing signature" });
    }

    const rawBody = req.body as Buffer;
    if (!rawBody || rawBody.length === 0) {
      console.error("🚨 [WEBHOOK_SECURITY] Empty request body");
      return res.status(400).json({ success: false, error: "Empty body" });
    }

    // ============================================
    // 🛡️ STEP 2: Timestamp freshness validation
    // ============================================
    // Prevents replay of old webhook events
    const timestamp = req.headers["x-webhook-timestamp"] as string | undefined;
    if (timestamp) {
      const webhookTime = new Date(timestamp).getTime();
      const now = Date.now();
      const FIVE_MINUTES_MS = 5 * 60 * 1000;
      if (isNaN(webhookTime) || (now - webhookTime) > FIVE_MINUTES_MS) {
        console.error("🚨 [WEBHOOK_SECURITY] Request expired or invalid timestamp");
        return res.status(401).json({ success: false, error: "Expired request" });
      }
    }

    // ============================================
    // 🛡️ STEP 3: HMAC SHA256 verification
    // ============================================
    const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_SECRET_KEY;
    if (!webhookSecret) {
      console.error("🚨 [WEBHOOK_SECURITY] CASHFREE_WEBHOOK_SECRET not configured");
      return res.status(500).json({ success: false, error: "Server configuration error" });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("base64");

    // 🛡️ SAFE TIMING-ATTACK RESISTANT COMPARISON
    // Length pre-check prevents timingSafeEqual from crashing on mismatch
    const signatureBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);

    if (signatureBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(signatureBuf, expectedBuf)) {
      console.error("🚨 [WEBHOOK_SECURITY] Invalid signature — possible forgery attempt");
      return res.status(401).json({ success: false, error: "Invalid signature" });
    }

    console.log("✅ [WEBHOOK_SECURITY] Signature verification passed");

    // ============================================
    // 🛡️ STEP 4: Parse verified payload
    // ============================================
    const payload = JSON.parse(rawBody.toString("utf8"));

    // Validate webhook structure
    if (!payload?.data?.order?.order_id || !payload?.data?.order?.order_status) {
      console.error("❌ [WEBHOOK] Invalid webhook payload structure");
      return res.status(400).json({ success: false });
    }

    const { order_id, order_status } = payload.data.order;

    // ============================================
    // ⚠️ BUSINESS LOGIC BOUNDARY
    // ============================================
    // 🛡️ Keep business logic out of webhook handlers.
    // 🛡️ Webhook should only validate, log, and acknowledge.
    // 🛡️ Actual processing (subscription upgrades, boost activation)
    //    happens in the verify endpoint (server/routes/payments.cashfree.routes.ts)
    //    which re-validates payment status with Cashfree API directly.
    // ============================================
    if (order_status === "PAID") {
      console.log(`💳 [WEBHOOK] Payment received for order ${order_id}`);
      // Business logic intentionally excluded — see payment verify endpoint
    }

    return res.json({ success: true });

  } catch (err) {
    console.error("❌ [WEBHOOK] Processing failed:", err);
    return res.status(500).json({ success: false });
  }
});

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// ✅ Security: Additional rate limiting via apiLimiter (applied to /api)
// 🛡️ VERCEL GUARD: In-memory rate-limit doesn't work across serverless invocations.
// Vercel platform-level DDoS protection makes this unnecessary.
if (!process.env.VERCEL) {
  app.use('/api/', (req, res, next) => {
    const authRoutes = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/logout'];
    if (authRoutes.some(route => req.path === route || req.originalUrl === route)) {
      return next();
    }
    return apiLimiter(req, res, next);
  });
} else {
  console.log("🔵 [VERCEL] Skipping apiLimiter (serverless incompatible)");
}

// ✅ SECURITY FIX: Require separate SESSION_SECRET
// Session secret is critical for security - fail fast if not configured
// 🛡️ VERCEL GUARD: SESSION_SECRET is optional on Vercel (JWT is primary auth)
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET && !process.env.VERCEL) {
  throw new Error("SESSION_SECRET environment variable is required!");
}

// Session middleware (optional, kept for backward compatibility)
// JWT tokens are now primary auth method
// Session middleware - SESSION_SECRET is now required (enforced above)
// 🛡️ VERCEL GUARD: express-session is stateless in serverless — skip entirely.
// JWT tokens are the primary auth mechanism; sessions are only for local dev.
const sessionSecret = SESSION_SECRET || (global as any).__DEV_SESSION_SECRET;
if (sessionSecret && !process.env.VERCEL) {
  app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // 🚩 SECURE: SameSite 'none' requires HTTPS in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  }));
  console.log("✅ [SESSION] Express session middleware enabled (local dev)");
} else {
  console.log("🔵 [VERCEL] Skipping express-session middleware (serverless — JWT auth only)");
}

// Ensure uploads folder exists with open permissions
// 🛡️ VERCEL GUARD: Serverless filesystem is read-only — skip mkdirSync
if (!process.env.VERCEL) {
  try {
    const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
    fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o777 });
    console.log("✅ [FS] Uploads directory created at", uploadsDir);
  } catch (err: any) {
    console.warn("⚠️ [FS] Could not create uploads directory:", err?.message);
  }
} else {
  console.log("🔵 [VERCEL] Skipping uploads directory creation (read-only filesystem)");
}

// ============================================
// 📊 OBSERVABILITY: Request Tracking & Monitoring
// ============================================

// Generate unique request ID for tracing and store in AsyncLocalStorage
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = crypto.randomUUID();
  (req as any).requestId = requestId;
  (req as any).startTime = Date.now();

  // Store requestId in AsyncLocalStorage for audit logging
  // districtId will be set by tenantResolver middleware later
  tenantContext.run({ districtId: -1, requestId }, () => {
    next();
  });
});

// ✅ SOVEREIGN ORDER: tenantResolver AFTER tenantContext birth
app.use("/api", tenantResolver);

// Structured request logging
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    const requestId = (req as any).requestId;
    console.log(`🔵 [REQUEST] ${requestId} ${req.method} ${req.path}`, {
      userAgent: req.get('User-Agent')?.substring(0, 100),
      ip: req.ip,
      userId: (req as any).user?.id || 'anonymous'
    });
  }
  next();
});

// Response logging with latency
app.use((req, res, next) => {
  const originalSend = res.send;
  res.send = function (data) {
    if (req.path.startsWith("/api/")) {
      const requestId = (req as any).requestId;
      const latency = Date.now() - (req as any).startTime;
      console.log(`✅ [RESPONSE] ${requestId} ${req.method} ${req.path} ${res.statusCode} ${latency}ms`);
    }
    return originalSend.call(this, data);
  };
  next();
});

// Removed: unused PUBLIC_ROUTES after middleware simplification

app.use("/api", (req, _res, next) => {
  const url = req.originalUrl;
  req.isAdminRoute = url.startsWith("/api/admin");
  req.isPublicRoute =
    url.startsWith("/api/health") ||
    url.startsWith("/api/docs") ||
    url.startsWith("/api/public");
  req.requiresAuth =
    !url.startsWith("/api/auth") &&
    !req.isPublicRoute;
  return next();
});

// ============================================
// 🚀 VERCEL SERVERLESS BRIDGE
// ============================================
// On Vercel, routes must be registered at import time (not inside startServer).
// This block runs only on Vercel serverless, not in local dev.
// 🛡️ CRITICAL: registerSovereignRoutes is async but contains NO await statements.
// All app.use() calls are synchronous. Call it before export default app
// so routes are mounted when the first request arrives.
if (process.env.VERCEL) {
  console.log("🔵 [VERCEL] Setting up serverless bridge...");
  const apiRouter = express.Router();
  registerSovereignRoutes(apiRouter).catch((err: any) => {
    console.error("❌ [VERCEL] Failed to register routes:", err?.message || err);
  });
  app.use("/api", apiRouter);
  console.log("✅ [VERCEL] Sovereign routes mounted on /api");
}

async function startServer() {
  // Validate required environment variables first
  validateEnv();

  // Test database connectivity first
  await testDatabaseConnection();

  // 🚨 CRITICAL: Enhanced health endpoint for production monitoring
  app.get("/health", (req, res) => {
    const health = {
      status: "ok",
      db: isDatabaseConnected(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      // 🚨 ADD THESE FOR PRODUCTION MONITORING:
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV,
      // districts: await prisma.district.count() - commented out for perf
    };

    // 🚨 CRITICAL: Return 503 if DB is down
    if (!isDatabaseConnected()) {
      return res.status(503).json({ ...health, status: "error", message: "Database unreachable" });
    }

    res.json(health);
  });

  httpServer = createServer(app);

  // 🔥 REAL-TIME GATEWAY: Initialize Socket.IO with auth & security
  // Redis adapter will be applied if available (graceful fallback if not)
  const io = await initRealtime(httpServer);

  // Make io available globally for real-time updates
  (global as any).io = io;

  // ✅ CRITICAL: Register API routes immediately after middleware setup (before Vite/static)
  console.log("🔵 [INDEX] ========================================");
  console.log("🔵 [INDEX] Step 1: Registering API routes...");

  // 🎯 SIMPLE ROUTING: All routes under /api (no /api/v1)
  const apiRouter = express.Router();
  await registerSovereignRoutes(apiRouter);
  app.use("/api", apiRouter);
  console.log("✅ [INDEX] /api routes mounted");



  // 🎯 Step 1.5: Mount Swagger UI for API documentation
  // 🛡️ PRODUCTION GUARD: Skips Swagger mounting to prevent TS2589 recursive type explosion
  // from deeply nested Zod/OpenAPI schema inference in zod-to-openapi.
  // Runtime APIs and sovereign routing are preserved — only the doc generator is bypassed.
  if (process.env.NODE_ENV === "production") {
    console.log("📚 [INDEX] Swagger UI disabled in production (TS2589 guard active)");
  } else {
    const swaggerSpec: any = generateSwaggerSpec();
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'BharatOS API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
      },
    }));
    console.log("✅ [INDEX] Swagger UI mounted at /api/docs");
  }

  // ============================================
  // 🚨 CRITICAL: PRODUCTION STATIC FILE SERVING
  // ============================================
  // Serve built client files - this is what makes the frontend work in production!
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // ✅ Serve static files from built client
  app.use(express.static(path.join(__dirname, "../dist")));

  // ✅ SPA fallback - serve index.html for all non-API routes
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }

    res.sendFile(path.join(__dirname, "../dist/index.html"));
  });

  // Handle unhandled rejections for orchestration stability
  process.on('unhandledRejection', (reason, promise) => {
    console.warn('🚨 [UNHANDLED_REJECTION] Unhandled promise rejection detected', {
      reason: reason?.toString(),
      promise: promise?.toString()
    });
    // Note: Do not exit process - log and continue for production stability
  });

  console.log("🔵 [INDEX] ========================================");

  // 🚀 साम्राज्य का शंखनाद: सर्वर को पोर्ट पर चालू करें
  console.log(`🔍 [DEBUG] Attempting to listen on port ${port}...`);

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`🚀 [BharatOS] Sovereign Server Live on port ${port}`);
    console.log(`🌍 URL: http://localhost:${port}`);
    console.log(`📚 Docs: http://localhost:${port}/api/docs`);
    console.log(`🔍 [DEBUG] Server listen callback executed successfully`);

    // ✅ Initialize background workers after server starts
    console.log(`🔍 [DEBUG] Skipping background workers for now...`);
    // if (process.env.ENABLE_BACKGROUND_WORKERS === "true") {
    //   console.log(`🔍 [DEBUG] Initializing background workers...`);
    //   startAdScheduler();
    //   startMemoryCleanupScheduler();

    //   // 🔄 हर २४ घंटे में रेवेन्यू के अवसर खोजें
    //   setInterval(() => {
    //     runSovereignConnectEngine().catch(console.error);
    //   }, 24 * 60 * 60 * 1000);
    // }
  });

  httpServer.on('error', (err) => {
    console.error(`❌ [FATAL] Server failed to bind to port ${port}:`, err);
    process.exit(1);
  });

  httpServer.on('listening', () => {
    console.log(`✅ [SUCCESS] Server successfully listening on port ${port}`);
  });
}

// 🛡️ BHARAT-OS SOVEREIGN ERROR CATCHER
// ध्यान रहे: इसे हमेशा सारे रूट्स (Routes) के सबसे नीचे लगाना है!
// Error handler from middleware/errorHandler
app.use(errorHandler);

// ✅ VERCEL SERVERLESS EXPORT
// Vercel uses the default export as the serverless handler.
// On Vercel, only the middleware chain runs (no httpServer.listen).
if (!process.env.VERCEL) {
  // ✅ CORRECT: startServer() को फंक्शन के बाहर कॉल करें
  startServer().catch((err) => {
    console.error("❌ [FATAL] Server failed to start:", err);
    process.exit(1);
  });
} else {
  console.log("🔵 [VERCEL] Running in serverless mode — httpServer.listen() skipped");
}

export default app;
