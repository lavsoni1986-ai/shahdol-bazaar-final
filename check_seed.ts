import "dotenv/config";
import { db } from "./server/storage";
import { products, shops, users } from "./shared/schema";

async function checkSeed() {
  const productCount = await db.select().from(products);
  const shopCount = await db.select().from(shops);
  const vendorCount = await db.select().from(users);

  console.log(`\n✅ DATABASE VERIFICATION:\n`);
  console.log(`📦 Total Products: ${productCount.length}`);
  console.log(`🏪 Total Shops: ${shopCount.length}`);
  console.log(`👥 Total Users: ${vendorCount.length}\n`);

  console.log(`Sample Products:`);
  productCount.slice(0, 3).forEach((p: any) => {
    console.log(`  • ${p.name} - ₹${p.price}`);
  });

  console.log(`\nSample Shops:`);
  shopCount.slice(0, 3).forEach((s: any) => {
    console.log(`  • ${s.name}`);
  });

  process.exit(0);
}

checkSeed();
