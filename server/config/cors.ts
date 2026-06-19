import type { Request, Response, NextFunction } from "express";
import cors from "cors";

// Declare global variable for telemetry monitoring
declare global {
  var __corsBlocks: number | undefined;
}

// Enterprise-hardened Whitelisted Regex patterns
const ALLOWED_ORIGIN_REGEXES = [
  /^https:\/\/shahdolbazaar\.com$/,
  /^https:\/\/www\.shahdolbazaar\.com$/,
  /^https:\/\/[a-z0-9-]+\.vercel\.app$/i,
  /^https?:\/\/localhost(:\d+)?$/
];

export const corsOptionsDelegate = (req: Request, callback: (err: Error | null, options?: cors.CorsOptions) => void) => {
  let origin = req.headers.origin as string | undefined;

  // 1. Origin Length Guard to prevent malformed header abuse
  if (origin && origin.length > 200) {
    globalThis.__corsBlocks = (globalThis.__corsBlocks || 0) + 1;
    console.warn("[CORS_BLOCK] Origin length exceeded safety threshold", {
      originLength: origin.length,
      path: req.path,
      method: req.method
    });
    return callback(null, { origin: false });
  }

  // Normalize origin: trim trailing slash and convert to lowercase
  if (origin) {
    origin = origin.trim().replace(/\/$/, "").toLowerCase();
  }

  let isAllowed = false;

  if (!origin) {
    // 2. Support undefined origin for server-to-server/cron/testing requests
    isAllowed = true;
  } else {
    isAllowed = ALLOWED_ORIGIN_REGEXES.some(regex => regex.test(origin!));
  }

  if (isAllowed) {
    callback(null, {
      origin: true, // Reflect the allowed origin back to client
      credentials: true, // Crucial for cookie/session validation
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // Explicit methods lockdown
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "x-csrf-token",
        "X-District-Id",
        "X-District-Slug"
      ], // Explicit headers allowlist
      maxAge: 86400 // Preflight cache optimization (24 hours)
    });
  } else {
    // 3. Increment production telemetry blocks counter
    globalThis.__corsBlocks = (globalThis.__corsBlocks || 0) + 1;
    
    // 4. Structured logging
    console.warn("[CORS_BLOCK]", {
      origin: req.headers.origin,
      path: req.path,
      method: req.method,
      totalBlocksCount: globalThis.__corsBlocks
    });
    
    // Disable CORS (browser blocks request) without crashing the Node.js server process
    callback(null, { origin: false });
  }
};

/**
 * Centrally configured CORS middleware wrapper.
 * Sets the "Vary: Origin" header on all requests to protect CDNs from cache poisoning.
 */
export const centralizedCors = (req: Request, res: Response, next: NextFunction) => {
  res.header("Vary", "Origin");
  return cors(corsOptionsDelegate)(req, res, next);
};
