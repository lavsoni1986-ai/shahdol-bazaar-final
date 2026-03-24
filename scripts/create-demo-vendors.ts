import 'dotenv/config';
import { prisma } from "../server/storage.js";
import { hashPassword, generateSecurePassword } from "../server/auth/password";

async function createVendors() {
  console.log("🏪 Creating vendor shops with subcategory linking...\n");

  // Generate secure random passwords for demo vendors
  const adityaPassword = generateSecurePassword(12);
  const hatkeVadaPassword = generateSecurePassword(12);

  console.log("🔐 Generated secure passwords (save these if needed for testing):");
  console.log(`   - adityahospital: ${adityaPassword}`);
  console.log(`   - hatkevada: ${hatkeVadaPassword}\n");

  try {
    // Get the subcategories and main categories
    const hospitalsCategory = await prisma.category.findFirst({
      where: { slug: "hospitals" },
    });

    const fastFoodCategory = await prisma.category.findFirst({
      where: { slug: "fast-food" },
    });

    if (!hospitalsCategory || !fastFoodCategory) {
      console.error("❌ Required subcategories not found. Make sure to run seed_categories.ts first.");
      process.exit(1);
    }

    // Create Aditya Hospital vendor
    const adityaUser = await prisma.user.findFirst({
      where: { username: "adityahospital" },
    });

    let adityaShop;
    if (!adityaUser) {
      const newUser = await prisma.user.create({
        data: {
          username: "adityahospital",
          password: hashPassword(adityaPassword),
          role: "merchant",
          isAdmin: false,
          shopName: "Aditya Hospital",
          shopAddress: "Shahdol, MP",
          mapsLink: "https://maps.google.com",
        },
      });

      const shop = await prisma.shop.create({
        data: {
          ownerId: newUser.id,
          name: "Aditya Hospital",
          slug: "adityahospital",
          category: hospitalsCategory.name,
          description: "Leading hospital providing quality healthcare services",
          address: "Shahdol, Madhya Pradesh",
          phone: "+91-7622-123456",
          mobile: "+91-9876543210",
          contactNumber: "+91-9876543210",
          imageUrl: "/uploads/aditya-hospital.webp",
          isFeatured: true,
          approved: true,
          isVerified: true,
        },
      });

      adityaShop = shop;
      console.log(`✅ Created Aditya Hospital (Category: ${hospitalsCategory.name})`);
    } else {
      const existing = await prisma.shop.findFirst({
        where: { ownerId: adityaUser.id },
      });

      if (existing) {
        await prisma.shop.update({
          where: { id: existing.id },
          data: {
            category: hospitalsCategory.name,
            imageUrl: "/uploads/aditya-hospital.webp",
          },
        });

        adityaShop = existing;
        console.log(`✅ Updated Aditya Hospital (Category: ${hospitalsCategory.name})`);
      }
    }

    // Create Hat Ke Vada vendor
    const hatkevadaUser = await prisma.user.findFirst({
      where: { username: "hatkevada" },
    });

    let hatkevadaShop;
    if (!hatkevadaUser) {
      const newUser = await prisma.user.create({
        data: {
          username: "hatkevada",
          password: hashPassword(hatkeVadaPassword),
          role: "merchant",
          isAdmin: false,
          shopName: "Hat Ke Vada Paav",
          shopAddress: "Shahdol, MP",
          mapsLink: "https://maps.google.com",
        },
      });

      const shop = await prisma.shop.create({
        data: {
          ownerId: newUser.id,
          name: "Hat Ke Vada Paav",
          slug: "hatkevada",
          category: fastFoodCategory.name,
          description: "Authentic Vada Pav and Fast Food speciality",
          address: "Shahdol, Madhya Pradesh",
          phone: "+91-7622-987654",
          mobile: "+91-9123456789",
          contactNumber: "+91-9123456789",
          imageUrl: "/uploads/hat-ke-vada-paav.jpg",
          isFeatured: true,
          approved: true,
          isVerified: true,
        },
      });

      hatkevadaShop = shop;
      console.log(`✅ Created Hat Ke Vada Paav (Category: ${fastFoodCategory.name})`);
    } else {
      const existing = await prisma.shop.findFirst({
        where: { ownerId: hatkevadaUser.id },
      });

      if (existing) {
        await prisma.shop.update({
          where: { id: existing.id },
          data: {
            category: fastFoodCategory.name,
            imageUrl: "/uploads/hat-ke-vada-paav.jpg",
          },
        });

        hatkevadaShop = existing;
        console.log(`✅ Updated Hat Ke Vada Paav (Category: ${fastFoodCategory.name})`);
      }
    }

    console.log("\n✅ Vendor setup complete!");
  } catch (error) {
    console.error("❌ Operation failed:", error);
    throw error;
  } finally {
    process.exit();
  }
}

createVendors();
