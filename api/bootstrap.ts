import "dotenv/config";
import express from "express";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import { apiCacheMiddleware } from "../api-cache-headers";
import { tenantContext } from "../server/storage";
import { tenantResolver } from "../server/middleware/tenantResolver";
import { errorHandler } from "../server/middleware/errorHandler";
import { centralizedCors } from "../server/config/cors";
import { telemetryMiddleware, routeTimeTracker } from "../server/lib/observability";

export function createBaseApp() {
  const app = express();
  
  // Trust first proxy (Vercel sits behind a load balancer)
  app.set("trust proxy", 1);

  // Runtime telemetry instrumentation
  app.use(telemetryMiddleware);

  // Helmet configuration (CSP rules)
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
  app.use((_req, res, next) => {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });

  // Centralized CORS middleware
  app.use(centralizedCors);
  app.options("*", centralizedCors);

  // Cookie Parser
  app.use(cookieParser());

  // Compression
  app.use(
    compression({
      level: 6,
      filter: (req, res) => {
        if (req.headers["x-no-compression"]) return false;
        return compression.filter(req, res);
      },
    })
  );

  // Webhook raw body parser (MUST run before express.json)
  app.use("/api/payments/webhook/cashfree", express.raw({ type: "application/json" }));

  // JSON Body parsers
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: false, limit: "10mb" }));

  // Request tracking & AsyncLocalStorage
  app.use((req, _res, next) => {
    const requestId = crypto.randomUUID();
    (req as any).requestId = requestId;
    (req as any).startTime = Date.now();

    tenantContext.run({ districtId: -1, requestId }, () => {
      next();
    });
  });

  // Tenant Resolution and Caching
  app.use("/api", tenantResolver);
  app.use("/api", apiCacheMiddleware);

  // Route Flag Injection
  app.use("/api", (req, _res, next) => {
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

  // Track the end of the global middleware stack right before route handling begins
  app.use(routeTimeTracker);

  return app;
}

export { errorHandler };
