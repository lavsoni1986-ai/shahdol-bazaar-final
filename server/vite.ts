import type { Express } from "express";
import type { Server } from "http";
import path from "path";
import fs from "fs";

// ✅ SAFE PATH FIX: Works in both local (ESM) and production (CJS) on Render
const __dirname = path.resolve(process.cwd(), "server");

export async function setupVite(app: Express, server: Server) {
  // Dynamic import to avoid loading Vite in production
  const { createServer } = await import("vite");
  
  const vite = await createServer({
    server: {
      middlewareMode: true,
      hmr: { server },
    },
    appType: "custom",
  });

  // CRITICAL: Skip Vite middleware for API routes
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      console.log("⏭️ [VITE] Skipping Vite middleware for API route:", req.path);
      return next(); // Skip Vite, go to next middleware (API routes)
    }
    // For non-API routes, use Vite middleware
    vite.middlewares(req, res, next);
  });

  // IMPORTANT: Only serve HTML for non-API routes
  // API routes should be handled by routes.ts BEFORE this middleware
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    
    // Skip API routes - they should be handled by routes.ts
    if (url.startsWith("/api/")) {
      console.log("⚠️ [VITE] API route intercepted by Vite middleware:", url);
      return next(); // Let it fall through to API routes
    }
    
    try {
      // Ab ye line bina error ke chalegi
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "client",
        "index.html",
      );
      let template = fs.readFileSync(clientTemplate, "utf-8");

      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
