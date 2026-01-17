import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "../shared/schema.js";
import { sql } from "drizzle-orm";

let rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  const msg = "DATABASE_URL missing. Add it in Vercel env (Neon connection string).";
  console.error(`❌ [DB] ${msg}`);
  throw new Error(msg);
}

// Strip channel_binding param if present (Neon serverless driver can choke on it)
try {
  const urlObj = new URL(rawUrl);
  const cb = urlObj.searchParams.get("channel_binding");
  if (cb) {
    urlObj.searchParams.delete("channel_binding");
    rawUrl = urlObj.toString();
    console.warn("⚠️ [DB] Removed channel_binding from DATABASE_URL for compatibility.");
  }
} catch {
  // if URL parse fails, proceed; connection will surface the error
}

// Warn if not using the Neon pooler host (recommended for serverless cold starts)
try {
  const host = new URL(rawUrl).hostname || "";
  const isPooler = host.includes("pooler") || host.includes("pool");
  if (!isPooler) {
    console.warn("⚠️ [DB] DATABASE_URL host does not look like a pooler host. Use the Neon pooler URL (port 5432 / -pooler).");
  }
} catch {
  // ignore parse errors; will fail later if invalid
}

const RETRY_DELAY_MS = 2_000;
const MAX_RETRIES = 2; // total attempts = MAX_RETRIES + 1
const DB_TIMEOUT_MS = 30_000;

// Neon serverless driver (HTTP) handles cold/idle states better than pooled pg/postgres
// Explicit initialization without pg/pooler drivers.
const client = neon(rawUrl);
export const db = drizzle(client, { schema });

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function verifyDbConnection() {
  let lastErr: any;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await db.execute(sql`select 1`);
      return;
    } catch (err: any) {
      lastErr = err;
      const msg = err?.message || err;
      if (attempt < MAX_RETRIES) {
        console.warn(`⚠️ [DB] Health check failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${msg}. Retrying in ${RETRY_DELAY_MS}ms...`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      console.error("❌ [DB] Health check failed after retries:", msg);
      throw err;
    }
  }
  throw lastErr;
}

// Proactively warm the connection during startup so first requests don't hit idle cold starts.
(async () => {
  try {
    await verifyDbConnection();
    console.log("✅ [DB] Startup health check OK");
  } catch (err: any) {
    console.error("❌ [DB] Startup health check failed:", err?.message || err);
  }
})();
