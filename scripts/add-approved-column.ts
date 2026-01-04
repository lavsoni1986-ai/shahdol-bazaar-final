import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    await sql`alter table if exists products add column if not exists approved boolean default false`;
    await sql`update products set approved = true where approved is null`;
    console.log("✅ ensured products.approved column with defaults");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("Failed to ensure approved column", err);
  process.exit(1);
});

