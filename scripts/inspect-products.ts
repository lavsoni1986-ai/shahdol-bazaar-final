import "dotenv/config";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    const rows = await sql`
      select column_name, data_type
      from information_schema.columns
      where table_name = 'products'
      order by ordinal_position;
    `;
    console.log(rows);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

