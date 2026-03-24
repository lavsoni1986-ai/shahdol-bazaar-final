/**
 * Clean and Seed - Creates 5 shops with 3 products each
 * Run with: npx tsx scripts/clean-and-seed.ts
 */

import "dotenv/config";
import { prisma } from "../server/storage.js";

const WHATSAPP_NUMBER = "9753239303";

async function cleanAndSeed() {
  console.log("🧹 Shahdol Bazaar - Clean and Seed...\n");

  try {
    // Delete existing products
    console.log("1. Deleting existing products...");
    await prisma.$executeRaw`DELETE FROM "Product"`;

    // Delete existing duplicate shops (keep original ones with id <= 18)
    console.log("2. Cleaning up shops...");
    await prisma.$executeRaw`DELETE FROM "Shop" WHERE id > 18`;

    // Also clean up duplicate vendors (keep original 3)
    console.log("3. Cleaning up vendors...");
    await prisma.$executeRaw`DELETE FROM "Vendor" WHERE id > 24`;

    console.log("4. Creating 5 new vendors...\n");

    // Create vendors for each shop (use only available columns)
    const vendors = [
      { name: "Raj Mobile", slug: "raj-mobile", desc: "Best mobile phones and accessories", address: "Main Market, Shahdol" },
      { name: "Soni Electronics", slug: "soni-electronics", desc: "LED TVs, home appliances and gadgets", address: "Station Road, Shahdol" },
      { name: "Bombay Dresses", slug: "bombay-dresses", desc: "Trendy fashion for all ages", address: "Mahavir Ward, Shahdol" },
      { name: "Shahdol Kirana", slug: "shahdol-kirana", desc: "All grocery items at wholesale prices", address: "Near Bus Stand, Shahdol" },
      { name: "Modern Furniture", slug: "modern-furniture", desc: "Quality furniture for home and office", address: "Industrial Area, Shahdol" }
    ];

    const vendorIds: number[] = [];
    for (const v of vendors) {
      const result = await prisma.$executeRaw`
        INSERT INTO "Vendor" (name, slug, description, address, "isVerified", "safetyScore", "createdAt")
        VALUES (${v.name}, ${v.slug}, ${v.desc}, ${v.address}, true, 5, NOW())
        RETURNING id
      `;
      // @ts-ignore - raw SQL result handling
      vendorIds.push(Number(result));
      console.log(`   ✓ Vendor: ${v.name}`);
    }

    console.log("\n5. Creating 5 shops...\n");

    // Create shops
    const shops = [
      { name: "Raj Mobile", category: "Electronics", desc: "Best mobile phones and accessories", address: "Main Market, Shahdol", phone: "9753239301", vendorId: vendorIds[0] },
      { name: "Soni Electronics", category: "Electronics", desc: "LED TVs, home appliances and gadgets", address: "Station Road, Shahdol", phone: "9753239302", vendorId: vendorIds[1] },
      { name: "Bombay Dresses", category: "Fashion", desc: "Trendy fashion for all ages", address: "Mahavir Ward, Shahdol", phone: "9753239303", vendorId: vendorIds[2] },
      { name: "Shahdol Kirana", category: "Grocery", desc: "All grocery items at wholesale prices", address: "Near Bus Stand, Shahdol", phone: "9753239304", vendorId: vendorIds[3] },
      { name: "Modern Furniture", category: "Furniture", desc: "Quality furniture for home and office", address: "Industrial Area, Shahdol", phone: "9753239305", vendorId: vendorIds[4] }
    ];

    const shopIds: number[] = [];
    for (const shop of shops) {
      const isFeatured = shop.category === "Electronics" || shop.category === "Fashion" || shop.category === "Furniture";
      await prisma.$executeRaw`
        INSERT INTO "Shop" ("ownerId", "districtId", name, slug, category, description, address, phone, mobile, "contactNumber", image, rating, "reviewCount", "avgRating", "isFeatured", approved, "isVerified", "createdAt", "updatedAt")
        VALUES (1, NULL, ${shop.name}, NULL, ${shop.category}, ${shop.desc}, ${shop.address}, ${shop.phone}, ${shop.phone}, NULL, NULL, 4.5, 0, 4.5, ${isFeatured}, true, false, NOW(), NOW())
      `;
      console.log(`   ✓ Shop: ${shop.name}`);
    }

    console.log("\n6. Creating 15 products (3 per shop)...\n");

    const products = [
      // Raj Mobile
      { vendorId: vendorIds[0], name: "iPhone 15 Pro", desc: "256GB, Titanium finish, A17 Pro chip", price: 129900, catName: "Electronics" },
      { vendorId: vendorIds[0], name: "Samsung Galaxy S24", desc: "256GB, AI features, 50MP camera", price: 79999, catName: "Electronics" },
      { vendorId: vendorIds[0], name: "OnePlus 12", desc: "512GB, 100W charging, Hasselblad camera", price: 64999, catName: "Electronics" },
      // Soni Electronics
      { vendorId: vendorIds[1], name: "55 inch LED Smart TV", desc: "4K UHD, Android TV, Dolby Vision", price: 45000, catName: "Electronics" },
      { vendorId: vendorIds[1], name: "Samsung Refrigerator", desc: "543L, Double door, Smart inverter", price: 32000, catName: "Electronics" },
      { vendorId: vendorIds[1], name: "Washing Machine", desc: "8kg, Front load, AI wash", price: 28000, catName: "Electronics" },
      // Bombay Dresses
      { vendorId: vendorIds[2], name: "Silk Saree", desc: "Pure Banarasi silk, handwoven", price: 2499, catName: "Fashion" },
      { vendorId: vendorIds[2], name: "Men's Sherwani", desc: "Wedding special, premium fabric", price: 8999, catName: "Fashion" },
      { vendorId: vendorIds[2], name: "Women's Kurti Set", desc: "Cotton, hand block print", price: 1299, catName: "Fashion" },
      // Shahdol Kirana
      { vendorId: vendorIds[3], name: "Basmati Rice 1kg", desc: "Premium aged basmati", price: 180, catName: "Grocery" },
      { vendorId: vendorIds[3], name: "Sunflower Oil 1L", desc: "Refined, pure", price: 150, catName: "Grocery" },
      { vendorId: vendorIds[3], name: "Premium Dal Pack", desc: "500g mix dal", price: 120, catName: "Grocery" },
      // Modern Furniture
      { vendorId: vendorIds[4], name: "3 Seater Sofa", desc: "Fabric, comfortable, modern design", price: 35000, catName: "Furniture" },
      { vendorId: vendorIds[4], name: "Dining Table Set", desc: "6 chairs, Sheesham wood", price: 28000, catName: "Furniture" },
      { vendorId: vendorIds[4], name: "Office Desk", desc: "With drawer, cable management", price: 12000, catName: "Furniture" }
    ];

    for (const p of products) {
      await prisma.$executeRaw`
        INSERT INTO "Product" (name, description, price, "vendorId", approved, "createdAt", "categoryName")
        VALUES (${p.name}, ${p.desc}, ${p.price}, ${p.vendorId}, true, NOW(), ${p.catName})
      `;
      console.log(`   ✓ Product: ${p.name} - ₹${p.price}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Seeding completed successfully!");
    console.log("=".repeat(60));
    console.log(`📦 Vendors: 5`);
    console.log(`📦 Shops: 5`);
    console.log(`📦 Products: 15`);
    console.log(`📱 WhatsApp for orders: ${WHATSAPP_NUMBER}`);
    console.log("=".repeat(60));
    console.log("\n🛒 Orders will go to WhatsApp: https://wa.me/91" + WHATSAPP_NUMBER);

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

cleanAndSeed().catch(console.error);
