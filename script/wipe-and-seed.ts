#!/usr/bin/env tsx
import "dotenv/config";
import { db } from "../server/db";
import { products, shops, offers, banners } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("⚠️  Wiping products, shops, banners, offers...");
  await db.delete(products);
  await db.delete(shops);
  await db.delete(banners);
  await db.delete(offers);
  console.log("✅ Tables cleared");

  // Seed a shop for products
  const [shop] = await db
    .insert(shops)
    .values({
      ownerId: 1,
      name: "Shahdol Bazaar Flagship",
      category: "General",
      description: "Fresh demo shop after reset",
      address: "Shahdol, MP",
      phone: "9999999999",
      mobile: "9999999999",
      image: "",
      approved: true,
      isVerified: true,
    })
    .returning();

  const seedProducts = [
    {
      name: "Samsung Galaxy M35",
      price: "17999",
      category: "Electronics",
      description: "6.7\" sAMOLED 120Hz, 50MP OIS, 6000mAh",
      imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80",
    },
    {
      name: "Banarasi Silk Saree",
      price: "2499",
      category: "Fashion",
      description: "Handwoven Banarasi silk with zari work",
      imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
    },
    {
      name: "Herbal Ubtan Face Pack",
      price: "299",
      category: "Beauty",
      description: "Ayurvedic face pack with sandalwood and turmeric",
      imageUrl: "https://images.unsplash.com/photo-1522336572468-97b06e8ef143?auto=format&fit=crop&w=900&q=80",
    },
  ];

  for (const p of seedProducts) {
    await db.insert(products).values({
      ...p,
      shopId: shop.id,
      sellerId: 1,
      approved: true,
      status: "approved",
    });
  }
  console.log("✅ Seeded products:", seedProducts.length);
}

main()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });

