import "dotenv/config";
import { prisma } from "../server/storage.js";

async function checkColumns() {
  const cols = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'Shop' ORDER BY ordinal_position`;
  console.log('Shop Columns:', JSON.stringify(cols, null, 2));
}

checkColumns().catch(console.error);
