// 📁 scripts/create-super-admin.ts
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../server/auth/password";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 BHARAT-OS: Creating Sovereign Super Admin...");

  const adminEmail = "lav@bharatos.com";
  const adminPassword = "Admin@Shahdol2026";

  // 1. Check District
  const district = await prisma.district.findUnique({ where: { id: 1 } });
  if (!district) throw new Error("❌ District ID 1 not found.");

  // 2. Hash Password
  const hashedPassword = await hashPassword(adminPassword);

  // 3. Create/Update User (Using ONLY schema-valid fields)
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: "SUPER_ADMIN",
      district: { connect: { id: 1 } }
    },
    create: {
      email: adminEmail,
      username: "lav_soni",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      isAdmin: true, // 🛡️ Set to true for UI logic
      district: { connect: { id: 1 } }
    }
  });

  console.log("--------------------------------------");
  console.log(`✅ Sovereign Success: Super Admin Created!`);
  console.log(`📧 Email: ${admin.email}`);
  console.log(`🏛️ Role: ${admin.role}`);
  console.log("--------------------------------------");
}

main()
  .catch((e) => {
    console.error("🚨 Admin Creation Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });