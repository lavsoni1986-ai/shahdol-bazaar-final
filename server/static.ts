import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // ✅ SAFE PATH FIX: Using process.cwd() instead of __dirname for Render/ESM compatibility
  const distPath = path.resolve(process.cwd(), "dist");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  // BUT skip API routes - they should be handled by routes.ts
  app.use("*", (req, res, next) => {
    // Skip API routes - they should be handled by routes.ts
    if (req.originalUrl.startsWith("/api/")) {
      console.log("⚠️ [STATIC] API route intercepted by static middleware:", req.originalUrl);
      return next(); // Let it fall through to API routes
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
