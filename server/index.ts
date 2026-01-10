import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes.js";
import { setupVite } from "./vite.js";
import { serveStatic } from "./static.js";
import { createServer } from "http";
import session from "express-session";

const app = express();

const allowedOrigins = [
  "https://shahdol-bazaar-live.netlify.app",
  "https://shahdolbazaar.com",
  "https://www.shahdolbazaar.com",
  "https://shahdol-bazaar.vercel.app",
  "http://localhost:5173",
  "http://localhost:5000",
];

// ✅ CORS FIX: Allow current production + preview + local
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

const httpServer = createServer(app);

// ============================================
// SECURITY MIDDLEWARE
// ============================================

// Helmet for security headers - Completely disable CSP for development
const isDevelopment = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;

if (isDevelopment) {
  // COMPLETELY DISABLE CSP in development to avoid blocking Cloudinary/Google Fonts
  console.log("🔵 [HELMET] Development mode: CSP disabled");
  app.use(helmet({
    contentSecurityPolicy: false, // Completely disable CSP
    crossOriginEmbedderPolicy: false,
  }));
} else {
  // Stricter CSP for production
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'", 
          "'unsafe-inline'", 
          "'unsafe-eval'", 
          "https://www.googletagmanager.com", 
          "https://www.google-analytics.com", 
          "https://widget.cloudinary.com", 
          "https://upload-widget.cloudinary.com",
          "https://*.cloudinary.com"
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
          "https://www.google-analytics.com", 
          "https://api.cloudinary.com", 
          "https://*.cloudinary.com",
          "wss:",
          "ws:"
        ],
        frameSrc: [
          "'self'", 
          "https://widget.cloudinary.com", 
          "https://upload-widget.cloudinary.com",
          "https://*.cloudinary.com"
        ],
        workerSrc: ["'self'", "blob:", "https://*.cloudinary.com"],
        childSrc: ["'self'", "blob:", "https://*.cloudinary.com"],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for Vite compatibility
  }));
}

// Cookie parser (must be before routes)
app.use(cookieParser());

// Import rate limiters
import { apiLimiter } from "./auth/rateLimiter.js";

// Apply rate limiting to API routes (except login/refresh, which have their own limiters)
app.use('/api/', (req, res, next) => {
  if (req.path === '/login' || req.path === '/auth/refresh' || req.path === '/register') {
    return next(); // Skip general limiter for auth routes
  }
  return apiLimiter(req, res, next);
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// ✅ MANIFEST FIX: Serve static files from both public and client/public directories
app.use(express.static(path.resolve(process.cwd(), "public")));
app.use(express.static(path.resolve(process.cwd(), "client", "public")));

  // Session middleware (optional, kept for backward compatibility)
  // JWT tokens are now primary auth method
  app.use(session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || "shahdol-temp-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
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

(async () => {
  // ✅ CRITICAL: Register API routes immediately after middleware setup (before Vite/static)
  console.log("🔵 [INDEX] ========================================");
  console.log("🔵 [INDEX] Step 1: Registering API routes FIRST...");
  await registerRoutes(httpServer, app);
  console.log("✅ [INDEX] API routes registered successfully");
  console.log("🔵 [INDEX] ========================================");

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.setHeader("Content-Type", "application/json");
    res.status(status).json({ message });
    console.error(err);
  });

  // ✅ CORRECT ORDER: API routes registered, now add Vite/Static (which skip /api routes)
  console.log("🔵 [INDEX] Step 2: Setting up Vite/Static middleware...");
  if (app.get("env") === "development") {
    await setupVite(app, httpServer);
    console.log("✅ [INDEX] Vite middleware setup complete");
  } else {
    serveStatic(app);
    console.log("✅ [INDEX] Static file serving setup complete");
  }

  const PORT = 5000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ Test endpoint: http://localhost:${PORT}/api/test`);
    console.log(`✅ Products endpoint: http://localhost:${PORT}/api/products/all`);
    console.log(`✅ Debug endpoint: http://localhost:${PORT}/api/debug/products`);
  });
})();
