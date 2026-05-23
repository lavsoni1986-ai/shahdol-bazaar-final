// 📁 scripts/seed-districts.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 BHARAT-OS: Seeding Initial Districts...");

  const shahdol = await prisma.district.upsert({
    where: { slug: "shahdol" },
    update: {},
    create: {
      name: "Shahdol Bazaar",
      slug: "shahdol",
      state: "Madhya Pradesh",
      primaryColor: "#f97316", // Orange
      secondaryColor: "#22c55e", // Green
      isActive: true,
      isDefault: true,
      themeConfig: {
        glassEffect: true,
        nebulaGradient: true,
        accentColor: "orange"
      },
      config: {
        commission: 2,
        dsslWeights: {
          rating: 0.3,
          orders: 0.2,
          clicks: 0.2,
          freshness: 0.3
        }
      }
    },
  });

  console.log(`✅ Sovereign Success: District '${shahdol.name}' created/verified.`);
}

main()
  .catch((e) => {
    console.error("🚨 Seeding Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });