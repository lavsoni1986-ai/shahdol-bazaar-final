import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema.js";
import { sql } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  const msg = "DATABASE_URL missing. Add it in Vercel env (Neon connection string).";
  console.error(`❌ [DB] ${msg}`);
  throw new Error(msg);
}

// Tuned for Vercel/Neon: force TLS, short connect timeout, and a tiny pool
const client = postgres(DATABASE_URL, {
  ssl: "require",
  connect_timeout: 5,
  idle_timeout: 10,
  max_lifetime: 60,
  max: 1,
});

export const db = drizzle(client, { schema });

export async function verifyDbConnection() {
  // Lightweight health probe to surface connection issues in logs
  await db.execute(sql`select 1`);
}
