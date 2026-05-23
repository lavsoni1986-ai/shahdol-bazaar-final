import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function runQueries() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log("=== DistrictDemandMemory ===");
  const demand = await pool.query('SELECT * FROM "DistrictDemandMemory" ORDER BY id DESC LIMIT 5');
  console.log(demand.rows);

  console.log("\n=== DistrictSupplyGap ===");
  const supply = await pool.query('SELECT * FROM "DistrictSupplyGap" ORDER BY id DESC LIMIT 5');
  console.log(supply.rows);

  console.log("\n=== DistrictEconomicCluster ===");
  const cluster = await pool.query('SELECT * FROM "DistrictEconomicCluster" ORDER BY id DESC LIMIT 5');
  console.log(cluster.rows);

  console.log("\n=== SharedDistrictLearning ===");
  const learning = await pool.query('SELECT * FROM "SharedDistrictLearning" ORDER BY id DESC LIMIT 5');
  console.log(learning.rows);

  console.log("\n=== Vendors with phone ===");
  const vendors = await pool.query('SELECT id, name, phone, mobile, address FROM "Vendor" WHERE phone IS NOT NULL LIMIT 10');
  console.log(vendors.rows);

  console.log("\n=== City Hospital ===");
  const hospital = await pool.query('SELECT id, name, phone, mobile, address, "districtId", "searchText", "isAiIndexed", status FROM "Vendor" WHERE name ILIKE \'%hospital%\'');
  console.log(hospital.rows);

  // Update City Hospital with phone, address, searchText
  if (hospital.rows.length > 0) {
    await pool.query('UPDATE "Vendor" SET phone = \'07674212345\', mobile = \'919876543210\', address = \'Main Road, Shahdol\', "searchText" = \'City Hospital Shahdol hospital healthcare doctor medical emergency blood\' WHERE id = $1', [hospital.rows[0].id]);
    console.log("Updated City Hospital with contact info and searchText");
  }

  await pool.end();
}

runQueries().catch(console.error);