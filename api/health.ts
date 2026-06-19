import { createBaseApp } from "./bootstrap";
import { type Request, type Response } from "express";

const app = createBaseApp();

// Health check endpoint (no DB checks for speed and low serverless cold starts)
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    serverless: true,
  });
});

export default app;
