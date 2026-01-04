import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { registerRoutes } from "../server/routes";

// Lightweight Express handler for Vercel Serverless Functions.
// We do NOT listen on a port here; Vercel invokes the handler per request.
const app = express();

app.use(cors({
  origin: "*", // tighten to your prod domains if needed
  credentials: true,
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

const httpServer = createServer(app);

// Register API routes (best-effort async init)
registerRoutes(httpServer, app).catch((err) => {
  console.error("❌ Failed to register routes in serverless handler:", err);
});

// Vercel Node functions expect a default export compatible with (req, res)
export default app;

