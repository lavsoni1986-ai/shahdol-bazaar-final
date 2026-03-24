// Run with: npx tsx scripts/check-shahdol-district.ts
import "dotenv/config";
import { prisma } from "../server/storage.js";

async function checkShahdolDistrict() {
  console.log("=== CHECKING DISTRICT TABLE ===\n");
  
  // Get all districts
  const districts = await prisma.district.findMany();
  console.log("All districts:", JSON.stringify(districts, null, 2));
  
  // Check for shahdol (lowercase)
  const shahdol = await prisma.district.findUnique({
    where: { slug: "shahdol" }
  });
  
  console.log("\n=== SHAHDOL DISTRICT CHECK ===");
  if (shahdol) {
    console.log("✅ Shahdol district found:", JSON.stringify(shahdol, null, 2));
  } else {
    console.log("❌ Shahdol district NOT found!");
    console.log("\nAttempting to create shahdol district...");
    
    try {
      const created = await prisma.district.create({
        data: {
          name: "Shahdol",
          slug: "shahdol",
          state: "Madhya Pradesh"
        }
      });
      console.log("✅ Created shahdol district:", JSON.stringify(created, null, 2));
    } catch (e: any) {
      console.error("❌ Failed to create shahdol district:", e.message);
    }
  }
}

checkShahdolDistrict()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
