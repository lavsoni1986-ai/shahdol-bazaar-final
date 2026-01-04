import 'dotenv/config';
import { db } from "../server/db";
import { offers, products, shops, users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database (Safe Mode)...");
  try {
    // 1. Get or Create seller user
    let sellerId: number;
    const [existingSeller] = await db.select().from(users).where(eq(users.username, "seller1"));
    
    if (existingSeller) {
      console.log("✅ User 'seller1' already exists.");
      sellerId = existingSeller.id;
      // Ensure admin status
      await db.update(users).set({ role: 'admin', isAdmin: true }).where(eq(users.id, sellerId));
    } else {
      const [newSeller] = await db.insert(users).values({
        username: "seller1",
        password: "password123",
        role: "admin",
        isAdmin: true,
      }).returning();
      sellerId = newSeller.id;
      console.log("✅ Created user 'seller1' as Admin.");
    }

    // 2. Create a shop if it doesn't exist
    let shopId: number;
    const [existingShop] = await db.select().from(shops).where(eq(shops.ownerId, sellerId));
    
    if (existingShop) {
      console.log("✅ Shop already exists for 'seller1'.");
      shopId = existingShop.id;
    } else {
      const [newShop] = await db.insert(shops).values({
        ownerId: sellerId,
        name: "Shahdol General Store",
        category: "Grocery",
        description: "Everything you need in one place",
        address: "Main Road, Shahdol",
        phone: "919999999999",
        mobile: "919999999999",
        approved: true,
        isVerified: true,
      }).returning();
      shopId = newShop.id;
      console.log("✅ Created sample shop.");
    }

    // 3. Create products if none exist
    const existingProducts = await db.select().from(products).where(eq(products.shopId, shopId));
    if (existingProducts.length === 0) {
      await db.insert(products).values([
        {
          shopId: shopId,
          sellerId: sellerId,
          name: "Fresh Apples",
          price: "150",
          category: "Grocery",
          description: "Kinnaur apples directly from farm",
        },
        {
          shopId: shopId,
          sellerId: sellerId,
          name: "Amul Butter 100g",
          price: "60",
          category: "Grocery",
          description: "Pure cow milk butter",
        }
      ]);
      console.log("✅ Seeded sample products.");
    }

    // 4. Create offers/news if none exist
    const existingOffers = await db.select().from(offers);
    if (existingOffers.length === 0) {
      await db.insert(offers).values([
        {
          content: "शहडोल में आज का मौसम: हल्की ठंड के साथ तापमान 17°C रहेगा।",
          isActive: true,
        },
        {
          content: "कल विराटेश्वर मंदिर में विशेष आरती और भंडारा दोपहर 12 बजे से।",
          isActive: true,
        },
        {
          content: "शहडोल बाज़ार में ताज़ा फल और सब्जियों की नई आवक शुरू - देखें किराना सेक्शन।",
          isActive: true,
        },
        {
          content: "नगर पालिका सूचना: बुढ़ार रोड पर पाइपलाइन मरम्मत के कारण आज जल आपूर्ति बाधित रह सकती है।",
          isActive: true,
        },
      ]);
      console.log("✅ Seeded news ticker items.");
    } else {
      console.log(`✅ ${existingOffers.length} offers already exist.`);
    }

    console.log("🚀 LIVE Database Sync Complete!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    process.exit();
  }
}

seed();
