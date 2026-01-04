import "dotenv/config";
import { db } from "../server/db";
import { users, shops, products } from "../shared/schema";
import { eq } from "drizzle-orm";

type DemoEntry = {
  username: string;
  password: string;
  shopName: string;
  category: string;
  productName: string;
  price: number;
  productCategory: string;
  imageUrl: string;
  description?: string;
};

const demos: DemoEntry[] = [
  {
    username: "seller_stylehub",
    password: "demo123",
    shopName: "Style Hub Shahdol",
    category: "Fashion",
    productName: "Cotton Kurti",
    price: 599,
    productCategory: "Women Fashion",
    imageUrl: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80",
    description: "Soft cotton kurti with elegant prints.",
  },
  {
    username: "seller_mobile",
    password: "demo123",
    shopName: "Mobile Solutions",
    category: "Electronics",
    productName: "Wireless Earbuds",
    price: 1299,
    productCategory: "Electronics",
    imageUrl: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=800&q=80",
    description: "Bluetooth 5.2, ANC, 24h playtime.",
  },
  {
    username: "seller_annapurna",
    password: "demo123",
    shopName: "Annapurna Bhandar",
    category: "Grocery",
    productName: "Premium Basmati Rice",
    price: 110,
    productCategory: "Grocery",
    imageUrl: "https://images.unsplash.com/photo-1604908177853-8a4d0d5ad981?auto=format&fit=crop&w=800&q=80",
    description: "Long-grain basmati, 1kg pack.",
  },
  {
    username: "seller_venus",
    password: "demo123",
    shopName: "Venus Skin Care",
    category: "Beauty",
    productName: "Sunscreen SPF 50",
    price: 350,
    productCategory: "Beauty",
    imageUrl: "https://images.unsplash.com/photo-1506617420156-8e4536971650?auto=format&fit=crop&w=800&q=80",
    description: "Lightweight, non-greasy, broad spectrum.",
  },
];

async function upsertUser(username: string, password: string) {
  const existing = await db.select().from(users).where(eq(users.username, username));
  if (existing.length > 0) return existing[0];
  const [inserted] = await db.insert(users).values({ username, password, role: "seller", isAdmin: false }).returning();
  return inserted;
}

async function upsertShop(ownerId: number, name: string, category: string) {
  const existing = await db.select().from(shops).where(eq(shops.name, name));
  if (existing.length > 0) return existing[0];
  const [inserted] = await db
    .insert(shops)
    .values({
      ownerId,
      name,
      category,
      description: `${name} - ${category}`,
      phone: "0000000000",
      mobile: "0000000000",
      approved: true,
      isVerified: true,
    })
    .returning();
  return inserted;
}

async function insertProduct(shopId: number, sellerId: number, demo: DemoEntry) {
  const [inserted] = await db
    .insert(products)
    .values({
      shopId,
      sellerId,
      name: demo.productName,
      price: String(demo.price),
      imageUrl: demo.imageUrl,
      category: demo.productCategory,
      description: demo.description ?? "",
      status: "approved",
      approved: true,
    })
    .returning();
  return inserted;
}

async function main() {
  for (const demo of demos) {
    const user = await upsertUser(demo.username, demo.password);
    const shop = await upsertShop(user.id, demo.shopName, demo.category);
    await insertProduct(shop.id, user.id, demo);
    console.log(`Seeded ${demo.shopName} -> ${demo.productName}`);
  }
  console.log("✅ Demo data seeded");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

