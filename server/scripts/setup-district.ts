// 📁 server/scripts/setup-district.ts
// Rapid District Onboarding Script - Creates a new district with settings and admin in one command

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

interface DistrictConfig {
  name: string;
  slug: string;
  state: string;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function setupDistrict(config: DistrictConfig) {
  console.log(`🚀 Setting up district: ${config.name}...`);
  
  // Step 1: Create District
  console.log("📍 Step 1: Creating district...");
  const district = await prisma.district.upsert({
    where: { slug: config.slug },
    update: {},
    create: {
      name: config.name,
      slug: config.slug,
      state: config.state,
      primaryColor: "#f97316",
      secondaryColor: "#ea580c",
      isActive: true,
      isDefault: false,
      metaTitle: `${config.name} - Local Marketplace | BharatOS`,
      metaDescription: `Discover local businesses in ${config.name}. Shop online with verified vendors.`,
    }
  });
  console.log(`✅ District created: ${district.name} (ID: ${district.id})`);

  // Step 2: Create Admin User
  console.log("👤 Step 2: Creating admin user...");
  const hashedPassword = await hashPassword(config.adminPassword);
  
  const admin = await prisma.user.upsert({
    where: { email: config.adminEmail },
    update: {},
    create: {
      email: config.adminEmail,
      username: config.adminName.toLowerCase().replace(/\s+/g, "_"),
      password: hashedPassword,
      role: "CITY_ADMIN",
      districtId: district.id,
      isAdmin: true,
      tokenVersion: 1,
    }
  });
  console.log(`✅ Admin created: ${admin.email} (ID: ${admin.id})`);

  console.log(`
╔════════════════════════════════════════════════════════════╗
║           DISTRICT SETUP COMPLETE! 🎉                       ║
╠════════════════════════════════════════════════════════════╣
║  District: ${config.name}
║  Slug: ${config.slug}
║  State: ${config.state}
║  Admin Email: ${config.adminEmail}
║  Admin Password: [HIDDEN]
╠════════════════════════════════════════════════════════════╣
║  Next Steps:                                                ║
║  1. Run 'npm run dev:server' to start the server            ║
║  2. Login at /auth with admin credentials                    ║
║  3. Start adding vendors and products                       ║
╚════════════════════════════════════════════════════════════╝
  `);
}

// CLI Interface
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
📋 BharatOS District Onboarding

Usage: npx tsx server/scripts/setup-district.ts <name> <slug> <state> <admin-email> <admin-password> <admin-name>

Example:
  npx tsx server/scripts/setup-district.ts "Jabalpur" "jabalpur" "Madhya Pradesh" "admin@jabalpur.com" "SecurePass123" "Admin User"
  `);
  process.exit(1);
}

if (args.length < 6) {
  console.error("❌ Error: Not enough arguments. Need 6 parameters.");
  console.log("Required: name slug state admin-email admin-password admin-name");
  process.exit(1);
}

const [name, slug, state, adminEmail, adminPassword, adminName] = args;

setupDistrict({
  name,
  slug,
  state,
  adminEmail,
  adminPassword,
  adminName
})
  .catch(console.error)
  .finally(() => prisma.$disconnect());