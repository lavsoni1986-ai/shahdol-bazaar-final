import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import compression from "compression";
import { registerRoutes } from "./routes.js";
import { setupVite } from "./vite.js";
import { serveStatic } from "./static.js";
import { createServer } from "http";
import session from "express-session";
import { prisma, checkDatabaseConnection, isDatabaseConnected } from "./storage.js";
import { tenantResolver } from "./middleware/tenantResolver.js";
import { apiCacheMiddleware } from "../api-cache-headers.js";

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
// SECURITY: Trust Proxy Configuration
// ============================================
// Required for correct IP detection behind reverse proxies/load balancers
// Without this, x-forwarded-for headers can be spoofed by attackers

// Default to production mode if running on port 5001 (production port)
// This ensures CSP is enforced when server runs on production port
const port = process.env.PORT ? parseInt(process.env.PORT) : 5002;
const isProductionPort = port === 5002 || port === 443;

// Use explicit NODE_ENV or fallback to port-based detection
const effectiveIsProduction = process.env.NODE_ENV === 'production' || isProductionPort;

if (effectiveIsProduction) {
  console.log('🔒 [SECURITY] Production mode detected (NODE_ENV:', process.env.NODE_ENV, ', port:', port, ')');
  console.log('🔒 [SECURITY] Trust proxy enabled for production');
}

// Global exception handler - log why the process is dying
process.on("uncaughtException", (err, origin) => {
  console.error("❌ [FATAL] Uncaught Exception:", err.message);
  console.error("❌ [FATAL] Stack:", err.stack);
  console.error("❌ [FATAL] Origin:", origin);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ [FATAL] Unhandled Rejection at:", promise);
  console.error("❌ [FATAL] Reason:", reason);
});

// Validate required environment variables at startup
// In development: WARN only, don't crash the server
// In production: THROW error to enforce strict validation
function validateEnv() {
  // Core required variables (server won't start without these)
  const required = [
    'DATABASE_URL', 
    'JWT_SECRET', 
    'REFRESH_TOKEN_SECRET'
  ];
  
  // Feature-specific variables (optional in dev, required in prod)
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
  
  const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
  const missing: string[] = [];
  const missingOptional: string[] = [];
  
  // Check required variables
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  // Check optional variables
  for (const key of optional) {
    if (!process.env[key]) {
      missingOptional.push(key);
    }
  }
  
  if (missing.length > 0) {
    // Missing required - crash regardless of environment
    throw new Error(`Missing required env: ${missing.join(", ")}`);
  }
  
  // Log optional variable status
  if (missingOptional.length > 0) {
    console.warn("⚠️ [ENV] Missing optional env variables:", missingOptional.join(", "));
  } else {
    console.log("✅ All Env Variables Synced - Cashfree, Groq, Twilio all configured!");
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
    } else {
      console.error("❌ [DB] Database connection failed - server will run but API calls may fail");
    }
  } catch (err: any) {
    console.error("❌ [DB] Database connection failed:", err?.message);
    console.error("⚠️ [DB] The server will start, but API calls may fail if DB is unreachable");
  }
}

const app = express();

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

const allowedOrigins = [process.env.FRONTEND_URL, process.env.CLIENT_URL, "http://localhost:5174", "https://shahdolbazaar.com"].filter(Boolean) as string[];   // Removes empty values

// ============================================
// SECURITY: Strict CORS Origin Validation
// ============================================
// Strict origin matching function - prevents subdomain attacks
// Uses exact identity comparison instead of .includes() which is permissive
const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true; // Allow no-origin requests (mobile apps, curl)
  
  // Allow any localhost or local network IP for development
  if (origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
    return true;
  }
  
  // Allow any 192.168.x.x local network IP for mobile testing
  if (origin.match(/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+/)) {
    return true;
  }
  
  return allowedOrigins.some(allowed => allowed === origin);
};

// ✅ CORS FIX: Allow current production + preview + local
app.use(cors({
  origin: (origin, callback) => {
    // 1. Allow requests with no origin (like mobile apps or curl)
    // 2. Allow if origin is in our allowed list (strict identity check)
    if (isOriginAllowed(origin)) {
      return callback(null, origin);
    }
    
    console.warn(`🚨 [CORS BLOCK]: Origin ${origin} not in Sovereign List`);
    return callback(new Error("Not allowed by CORS - Sovereign Shield Active"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-District-Id", "X-District-Slug"]
}));

const httpServer = createServer(app);

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

// Cookie parser (must be before routes)
app.use(cookieParser());

// API Caching Middleware - Add cache headers for CDN edge caching
// This adds Cache-Control headers to GET responses for public API endpoints
app.use('/api', apiCacheMiddleware);

// ============================================
// CASHFREE WEBHOOK (MUST be before express.json())
// ============================================
app.use("/api/payments/webhook/cashfree", express.raw({ type: "application/json" }));

// ✅ SECURITY FIX: Re-enable rate limiting
import { apiLimiter } from "./auth/rateLimiter.js";

// Apply rate limiting to API routes (skip auth routes which have their own limiters)
app.use('/api/', (req, res, next) => {
  // Skip rate limiting for auth routes (they have their own limiters)
  const authRoutes = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh', '/api/auth/logout'];
  if (authRoutes.some(route => req.path === route || req.originalUrl === route)) {
    return next();
  }
  return apiLimiter(req, res, next);
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// ✅ MANIFEST FIX: Serve static files from both public and client/public directories

// ✅ Serve uploaded files from local uploads directory

  // ✅ SECURITY FIX: Require separate SESSION_SECRET
  // Session secret is critical for security - fail fast if not configured in production
  const SESSION_SECRET = process.env.SESSION_SECRET;
  const isDev = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
  
  if (!SESSION_SECRET) {
    if (isDev) {
      // Safe fallback for development only
      const fallbackSecret = "dev-only-insecure-secret-change-in-production";
      console.warn("⚠️ [DEV] Using insecure fallback SESSION_SECRET. Set SESSION_SECRET in .env for production!");
      console.warn("⚠️ [DEV] This is fine for local development but NEVER use in production.");
      // Use fallback - but log warning
      (global as any).__DEV_SESSION_SECRET = fallbackSecret;
    } else {
      // Fail fast in production - no secret means insecure sessions
      const errorMsg = "SESSION_SECRET environment variable is required in production!";
      console.error(`❌ [SECURITY] ${errorMsg} Server cannot start without it.`);
      throw new Error(errorMsg);
    }
  }

// Session middleware (optional, kept for backward compatibility)
// JWT tokens are now primary auth method
// Session middleware - SESSION_SECRET is now required (enforced above)
app.use(session({
  secret: SESSION_SECRET || (global as any).__DEV_SESSION_SECRET,
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

// Ensure uploads folder exists with open permissions
const uploadsDir = path.resolve(process.cwd(), "public", "uploads");
fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o777 });

// Request logging for APIs
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    console.log("🔵 [REQUEST] Incoming API request:", req.method, req.path, req.originalUrl);
  }
  next();
});

// ✅ SECURITY FIX: Smart tenant resolver with public route bypass
const PUBLIC_ROUTES = [
  '/health',
  '/auth/login',
  '/auth/register', 
  '/auth/refresh',
  '/auth/logout',
  '/ui/context',
  '/products',
  '/categories',
  '/banners',
  '/bus-timetable',
  '/shops',
];

app.use("/api", (req, res, next) => {
  // ✅ FIX: Strip /api prefix from path for matching against public routes
  // Because middleware is mounted at /api, req.path still contains /api prefix
  const pathToCheck = req.path.startsWith('/api') ? req.path.slice(4) : req.path;
  
  // ✅ FIX: Bypass tenant resolver for auth, admin, analytics, payments, webhooks, AI
  // These routes require proper auth anyway, so we don't set a default district
  const bypassPaths = ['/auth', '/admin', '/analytics', '/payments', '/webhooks', '/districts', '/marketplace', '/ai', '/vendors'];
  if (bypassPaths.some(path => pathToCheck.startsWith(path))) {
    // Let auth middleware handle district validation
    return next();
  }

  // Allow public routes without tenant context (public marketplace data)
  // These are read-only endpoints that don't contain sensitive data
  const PUBLIC_READ_ONLY = [
    '/health',
    '/ui/context',
    '/products',
    '/categories',
    '/banners',
    '/bus-timetable',
    '/shops',
    '/offers',
    '/orders',
    '/marketplace',
    '/reviews',
    '/vendors',
  ];
  
  const isPublicReadOnly = PUBLIC_READ_ONLY.some(route => 
    pathToCheck === route || 
    pathToCheck.startsWith(route + '/')
  );
  
  // Allow public read-only routes without district context
  if (req.method === 'GET' && isPublicReadOnly) {
    return next();
  }
  
  // Also allow district lookup routes
  if (pathToCheck.startsWith('/districts/') || pathToCheck === '/districts') {
    return next();
  }
  
  // Also allow vendor/shop public lookups - extract district from path/query
  if (pathToCheck.startsWith('/vendors/') || pathToCheck.startsWith('/shops/') || pathToCheck.startsWith('/marketplace/')) {
    // For public lookups, use district from query param or header, not default
    // If no district specified, these will show all (aggregate) data
    return tenantResolver(req, res, next);
  }
  
  // For protected routes (mutations, authenticated reads), use full tenant resolver
  return tenantResolver(req, res, next);
});

(async () => {
  // Validate required environment variables first
  validateEnv();
  
  // Test database connectivity first
  await testDatabaseConnection();
  
  // ✅ CRITICAL: Register API routes immediately after middleware setup (before Vite/static)
  console.log("🔵 [INDEX] ========================================");
  console.log("🔵 [INDEX] Step 1: Registering API routes FIRST...");
  await registerRoutes(httpServer, app);
  console.log("✅ [INDEX] API routes registered successfully");

  // Serve static files after API routes so /api/* is never intercepted by static middleware.
  app.use(express.static(path.resolve(process.cwd(), "public")));
  app.use(express.static(path.resolve(process.cwd(), "client", "public")));
  app.use('/uploads', express.static(path.resolve(process.cwd(), "uploads")));
  console.log("🔵 [INDEX] ========================================");

  // ============================================
  // FINAL ERROR HANDLER - Must be last app.use()
  // ============================================
  // Catches all errors including async errors and returns JSON
  // This middleware MUST be registered after all routes and static files
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // ============================================
    // MULTER ERROR HANDLING
    // ============================================
    // Handle file size limit errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: "File too large. Maximum size is 5MB." });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, message: "Too many files uploaded." });
    }
    // Handle invalid file type errors
    if (err.message && err.message.startsWith('INVALID_FILE_TYPE')) {
      return res.status(400).json({ success: false, message: "Invalid file type. Only JPEG, PNG and WebP images are allowed." });
    }
    if (err.message === 'Only image files are allowed') {
      return res.status(400).json({ success: false, message: "Invalid file type. Only image files are allowed." });
    }
    
    // ============================================
    // ZOD VALIDATION ERRORS
    // ============================================
    if (err.name === 'ZodError') {
      const errors = err.flatten?.()?.fieldErrors || {};
      return res.status(400).json({ 
        success: false, 
        message: "Validation failed",
        errors 
      });
    }
    
    // ============================================
    // DEFAULT ERROR HANDLER - Always returns JSON
    // ============================================
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Ensure we always return JSON, not HTML
    res.setHeader("Content-Type", "application/json");
    res.status(status).json({ 
      success: false,
      message: process.env.NODE_ENV === 'production' && status === 500 
        ? "Internal Server Error" // Don't leak error details in production
        : message 
    });
    
    // Log full error in development for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.error('🚨 [ERROR HANDLER]', err);
    }
  });

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 5002;
  
  // Start server immediately after API routes are registered
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server live on http://localhost:${PORT}`);
    console.log(`✅ API routes: http://localhost:${PORT}/api`);
    console.log(`🛡️  Sovereign Shield Origin: ${allowedOrigins.join(', ')}`);
  });

  // Now set up Vite/Static middleware (non-blocking)
  console.log("🔵 [INDEX] Step 2: Setting up Vite/Static middleware...");
  if (app.get("env") === "development") {
    try {
      await setupVite(app, httpServer);
      console.log("✅ [INDEX] Vite middleware setup complete");
    } catch (err) {
      console.error("⚠️ Vite setup failed:", err);
    }
  } else {
    serveStatic(app);
    console.log("✅ [INDEX] Static file serving setup complete");
  }
})();
