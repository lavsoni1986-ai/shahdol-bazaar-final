import "dotenv/config";
import { prisma } from "../server/storage.js";

async function checkVendors() {
  const vendors = await prisma.$queryRaw`SELECT id, name FROM "Vendor" LIMIT 10`;
  console.log('Vendors:', JSON.stringify(vendors, null, 2));
}

checkVendors().catch(console.error);
