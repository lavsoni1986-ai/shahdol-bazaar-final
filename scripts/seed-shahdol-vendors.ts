/**
 * ============================================
 * SEED SHAHDOL PILOT VENDORS — BharatOS
 * ============================================
 * Idempotent seeder that injects 25 real Shahdol pilot merchants
 * into the database using the actual Prisma schema (District, User, Vendor, Product).
 *
 * Safe to run multiple times — uses upsert on (districtId, slug) unique constraints.
 *
 * Usage:
 *   npx tsx scripts/seed-shahdol-vendors.ts
 * ============================================
 */

import { PrismaClient, VendorStatus, BusinessType } from "@prisma/client";
import { baseSlug, appendSuffix } from "../server/utils/slug";

const prisma = new PrismaClient();

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface ProductSeed {
    name: string;
    price: number;
    type: "PRODUCT" | "SERVICE";
}

interface MerchantSeed {
    name: string;
    mobile: string;
    businessName: string;
    category: string;
    businessType: BusinessType;
    products: ProductSeed[];
}

// ─── 25 REAL SHAHDOL PILOT MERCHANTS ───────────────────────────────────────

const PILOT_MERCHANTS: MerchantSeed[] = [
    // 🏥 HEALTHCARE
    {
        name: "Sanjiveni Doctor",
        mobile: "9100000001",
        businessName: "Sanjeevani Dawakhana",
        category: "MEDICAL",
        businessType: BusinessType.HEALTHCARE,
        products: [
            { name: "Home Visit Service", price: 500, type: "SERVICE" },
            { name: "Online Consultation 24/7", price: 300, type: "SERVICE" },
            { name: "Blood Pressure Checkup", price: 100, type: "SERVICE" },
            { name: "General Medicine", price: 200, type: "PRODUCT" },
        ],
    },
    {
        name: "Jaiswal Medical Store",
        mobile: "9100000002",
        businessName: "Jaiswal Medical & Surgical",
        category: "MEDICAL",
        businessType: BusinessType.HEALTHCARE,
        products: [
            { name: "Paracetamol 500mg", price: 30, type: "PRODUCT" },
            { name: "Multivitamin Tablets", price: 150, type: "PRODUCT" },
            { name: "First Aid Kit", price: 250, type: "PRODUCT" },
            { name: "Surgical Mask (50 pcs)", price: 120, type: "PRODUCT" },
        ],
    },
    {
        name: "Vyas Medical Store",
        mobile: "9100000003",
        businessName: "Vyas Medical & General Store",
        category: "MEDICAL",
        businessType: BusinessType.HEALTHCARE,
        products: [
            { name: "Ayurvedic Medicine Pack", price: 180, type: "PRODUCT" },
            { name: "Baby Care Kit", price: 350, type: "PRODUCT" },
            { name: "Health Supplement", price: 400, type: "PRODUCT" },
        ],
    },

    // 📱 ELECTRONICS & MOBILE
    {
        name: "Rohit Mobile",
        mobile: "9100000004",
        businessName: "Rohit Mobile Electronics",
        category: "ELECTRONICS",
        businessType: BusinessType.RETAIL,
        products: [
            { name: "Motorola Mobile", price: 13000, type: "PRODUCT" },
            { name: "Tempered Glass Premium", price: 150, type: "PRODUCT" },
            { name: "Mobile Back Cover", price: 200, type: "PRODUCT" },
            { name: "USB Charging Cable", price: 100, type: "PRODUCT" },
        ],
    },
    {
        name: "Tiwari Electronics",
        mobile: "9100000005",
        businessName: "Tiwari Electronics & Repair",
        category: "ELECTRONICS",
        businessType: BusinessType.RETAIL,
        products: [
            { name: "LED Bulb 12W", price: 180, type: "PRODUCT" },
            { name: "Extension Board 6 Socket", price: 350, type: "PRODUCT" },
            { name: "TV Remote Universal", price: 250, type: "PRODUCT" },
            { name: "Home Wiring Service", price: 1500, type: "SERVICE" },
        ],
    },

    // 🛒 KIRANA & GENERAL STORES
    {
        name: "Shahdol Kirana",
        mobile: "9100000006",
        businessName: "Shahdol Kirana Store",
        category: "GROCERY",
        businessType: BusinessType.RETAIL,
        products: [
            { name: "Fortune Refined Oil 1L", price: 180, type: "PRODUCT" },
            { name: "Basmati Rice 5kg", price: 350, type: "PRODUCT" },
            { name: "Sugar 1kg", price: 45, type: "PRODUCT" },
            { name: "Wheat Flour 5kg (Aashirvaad)", price: 200, type: "PRODUCT" },
        ],
    },
    {
        name: "Gupta General Store",
        mobile: "9100000007",
        businessName: "Gupta Kirana & General Store",
        category: "GROCERY",
        businessType: BusinessType.RETAIL,
        products: [
            { name: "Toor Dal 1kg", price: 120, type: "PRODUCT" },
            { name: "Mustard Oil 1L", price: 220, type: "PRODUCT" },
            { name: "Spices Combo Pack", price: 300, type: "PRODUCT" },
            { name: "Biscuits Family Pack", price: 80, type: "PRODUCT" },
        ],
    },
    {
        name: "Saket Paints",
        mobile: "9100000008",
        businessName: "Saket Paints & Decor",
        category: "HARDWARE",
        businessType: BusinessType.RETAIL,
        products: [
            { name: "Asian Paint White 10L", price: 2200, type: "PRODUCT" },
            { name: "Wall Putty 5kg", price: 300, type: "PRODUCT" },
            { name: "Painting Service per sqft", price: 15, type: "SERVICE" },
            { name: "Color Shades Card", price: 0, type: "PRODUCT" },
        ],
    },
    {
        name: "Patel Hardware",
        mobile: "9100000009",
        businessName: "Patel Hardware & Sanitary",
        category: "HARDWARE",
        businessType: BusinessType.RETAIL,
        products: [
            { name: "PVC Pipe 1 inch 3m", price: 250, type: "PRODUCT" },
            { name: "Door Lock Set Premium", price: 450, type: "PRODUCT" },
            { name: "Tap Mixer Chrome", price: 600, type: "PRODUCT" },
            { name: "Water Tank 1000L", price: 3500, type: "PRODUCT" },
        ],
    },

    // 👔 CLOTHING & TAILOR
    {
        name: "Agrawal Cloth Store",
        mobile: "9100000010",
        businessName: "Agrawal Cloth Store",
        category: "CLOTHING",
        businessType: BusinessType.RETAIL,
        products: [
            { name: "Cotton Kurta Men", price: 600, type: "PRODUCT" },
            { name: "Silk Saree", price: 1500, type: "PRODUCT" },
            { name: "Kids Wear Set", price: 450, type: "PRODUCT" },
        ],
    },
    {
        name: "Sheikh Tailor",
        mobile: "9100000011",
        businessName: "Sheikh Tailoring & Alteration",
        category: "CLOTHING",
        businessType: BusinessType.SERVICE,
        products: [
            { name: "Pant Stitching", price: 350, type: "SERVICE" },
            { name: "Shirt Stitching", price: 300, type: "SERVICE" },
            { name: "Alteration Service", price: 100, type: "SERVICE" },
            { name: "Boutique Design Service", price: 2000, type: "SERVICE" },
        ],
    },
    {
        name: "Sharma Jewelers",
        mobile: "9100000012",
        businessName: "Sharma Jewelers",
        category: "JEWELRY",
        businessType: BusinessType.RETAIL,
        products: [
            { name: "Silver Earrings", price: 800, type: "PRODUCT" },
            { name: "Gold Plated Necklace", price: 2500, type: "PRODUCT" },
            { name: "Jewelry Polishing Service", price: 200, type: "SERVICE" },
        ],
    },

    // 📚 STATIONERY & EDUCATION
    {
        name: "Pandit Stationery",
        mobile: "9100000013",
        businessName: "Pandit Stationery & Books",
        category: "STATIONERY",
        businessType: BusinessType.RETAIL,
        products: [
            { name: "Notebook 200 Pages", price: 60, type: "PRODUCT" },
            { name: "Geometry Box", price: 150, type: "PRODUCT" },
            { name: "Exam Bundle Pack", price: 300, type: "PRODUCT" },
        ],
    },
    {
        name: "Dubey Coaching",
        mobile: "9100000014",
        businessName: "Dubey Coaching Center",
        category: "EDUCATION",
        businessType: BusinessType.EDUCATION,
        products: [
            { name: "Math Tuition Monthly", price: 1000, type: "SERVICE" },
            { name: "Science Tuition Monthly", price: 1000, type: "SERVICE" },
            { name: "English Speaking Course", price: 2000, type: "SERVICE" },
        ],
    },
    {
        name: "Jain Book Depot",
        mobile: "9100000015",
        businessName: "Jain Book Depot",
        category: "STATIONERY",
        businessType: BusinessType.RETAIL,
        products: [
            { name: "NCERT Book Set Class 10", price: 1200, type: "PRODUCT" },
            { name: "Competitive Exam Guide MP", price: 450, type: "PRODUCT" },
            { name: "Children Story Books Set", price: 350, type: "PRODUCT" },
        ],
    },

    // 🍞 FOOD & BAKERY
    {
        name: "Khan Bakery",
        mobile: "9100000016",
        businessName: "Khan Bakery & Confectionery",
        category: "FOOD",
        businessType: BusinessType.RETAIL,
        products: [
            { name: "Bread 400g", price: 35, type: "PRODUCT" },
            { name: "Cake 500g", price: 300, type: "PRODUCT" },
            { name: "Biscuits Assorted 1kg", price: 120, type: "PRODUCT" },
            { name: "Cake Custom Order", price: 500, type: "SERVICE" },
        ],
    },
    {
        name: "Yadav Dairy",
        mobile: "9100000017",
        businessName: "Yadav Dairy & Sweets",
        category: "FOOD",
        businessType: BusinessType.RETAIL,
        products: [
            { name: "Fresh Milk 1L", price: 60, type: "PRODUCT" },
            { name: "Curd 500g", price: 40, type: "PRODUCT" },
            { name: "Paneer 250g", price: 100, type: "PRODUCT" },
            { name: "Ghee 1L", price: 500, type: "PRODUCT" },
        ],
    },

    // 🔧 SERVICES (Electrician, Plumber, Transport, etc.)
    {
        name: "Verma Electric Works",
        mobile: "9100000018",
        businessName: "Verma Electric Works",
        category: "ELECTRICIAN",
        businessType: BusinessType.SERVICE,
        products: [
            { name: "House Wiring Service", price: 3000, type: "SERVICE" },
            { name: "Fan Installation", price: 200, type: "SERVICE" },
            { name: "AC Service & Repair", price: 500, type: "SERVICE" },
            { name: "Electrical Fault Check", price: 150, type: "SERVICE" },
        ],
    },
    {
        name: "Rajak Plumbing Works",
        mobile: "9100000019",
        businessName: "Rajak Plumbing Services",
        category: "PLUMBING",
        businessType: BusinessType.SERVICE,
        products: [
            { name: "Tap Repair Service", price: 200, type: "SERVICE" },
            { name: "Pipe Installation", price: 800, type: "SERVICE" },
            { name: "Water Tank Cleaning", price: 500, type: "SERVICE" },
            { name: "Full Plumbing Checkup", price: 300, type: "SERVICE" },
        ],
    },
    {
        name: "Singh Tent House",
        mobile: "9100000020",
        businessName: "Singh Tent House & Events",
        category: "EVENTS",
        businessType: BusinessType.SERVICE,
        products: [
            { name: "Tent 20x20 Setup", price: 5000, type: "SERVICE" },
            { name: "Chair Rental (50 pcs)", price: 1000, type: "SERVICE" },
            { name: "Sound System Rental", price: 3000, type: "SERVICE" },
            { name: "Decoration Service Basic", price: 2000, type: "SERVICE" },
        ],
    },
    {
        name: "Mishra Cyber Cafe",
        mobile: "9100000021",
        businessName: "Mishra Cyber Cafe & Printing",
        category: "SERVICES",
        businessType: BusinessType.SERVICE,
        products: [
            { name: "Printing B&W per page", price: 2, type: "SERVICE" },
            { name: "Photocopy per page", price: 2, type: "SERVICE" },
            { name: "Form Filling Service", price: 50, type: "SERVICE" },
            { name: "Internet Browsing per hour", price: 20, type: "SERVICE" },
        ],
    },
    {
        name: "Kushwaha Furniture",
        mobile: "9100000022",
        businessName: "Kushwaha Furniture House",
        category: "FURNITURE",
        businessType: BusinessType.RETAIL,
        products: [
            { name: "Wooden Chair", price: 1200, type: "PRODUCT" },
            { name: "Dining Table 6 Seater", price: 8000, type: "PRODUCT" },
            { name: "Cotton Sofa Set 3+1+1", price: 15000, type: "PRODUCT" },
            { name: "Furniture Polish Service", price: 500, type: "SERVICE" },
        ],
    },
    {
        name: "Prajapati Beauty Parlour",
        mobile: "9100000023",
        businessName: "Prajapati Beauty Parlour & Salon",
        category: "BEAUTY",
        businessType: BusinessType.SERVICE,
        products: [
            { name: "Haircut Men", price: 100, type: "SERVICE" },
            { name: "Haircut Women", price: 300, type: "SERVICE" },
            { name: "Facial Basic", price: 400, type: "SERVICE" },
            { name: "Bridal Makeup", price: 3000, type: "SERVICE" },
        ],
    },
    {
        name: "Sahu Transport",
        mobile: "9100000024",
        businessName: "Sahu Transport & Logistics",
        category: "TRANSPORT",
        businessType: BusinessType.SERVICE,
        products: [
            { name: "Local Goods Transport", price: 500, type: "SERVICE" },
            { name: "City-to-City Parcel", price: 200, type: "SERVICE" },
            { name: "Mini Truck Rental", price: 2500, type: "SERVICE" },
        ],
    },
    {
        name: "Lodhi Automobiles",
        mobile: "9100000025",
        businessName: "Lodhi Bike & Auto Repair",
        category: "AUTOMOBILE",
        businessType: BusinessType.SERVICE,
        products: [
            { name: "Bike Service Basic", price: 300, type: "SERVICE" },
            { name: "Tyre Puncture Repair", price: 80, type: "SERVICE" },
            { name: "Engine Oil Change", price: 400, type: "SERVICE" },
            { name: "Bike Spare Parts", price: 500, type: "PRODUCT" },
        ],
    },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Generate a unique slug for a vendor based on business name and district.
 * Follows the pattern used by the canonical resolver: lowercase, hyphens, district suffix.
 */
function generateVendorSlug(businessName: string, districtSlug: string): string {
    const base = businessName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    return `${base}-${districtSlug}`;
}

/**
 * Hash a password synchronously — simple fallback for pilot mode.
 * In production, replace with: import bcrypt from 'bcryptjs'; bcrypt.hashSync(password, 10);
 */
function hashPassword(password: string): string {
    // Simple string-based fallback (no Buffer dependency needed)
    let hash = "pilot_fallback_";
    for (let i = 0; i < password.length; i++) {
        hash += password.charCodeAt(i).toString(16).padStart(2, "0");
    }
    return hash.slice(0, 60);
}

/**
 * Generate a unique product slug for a vendor's product.
 * Uses the server's slug generation utilities where possible.
 */
function generateProductSlug(productName: string, vendorSlug: string): string {
    const base = baseSlug(productName);
    return appendSuffix(base, vendorSlug);
}

// ─── MAIN SEEDER ─────────────────────────────────────────────────────────────

async function main() {
    console.log("🏁 Starting Shahdol Pilot Vendor Seeding...");
    console.log(`📊 Target: ${PILOT_MERCHANTS.length} merchants\n`);

    // ── 1. Ensure District exists ──────────────────────────────────────────
    const district = await prisma.district.upsert({
        where: { slug: "shahdol" },
        update: {},
        create: {
            name: "Shahdol",
            slug: "shahdol",
            state: "Madhya Pradesh",
            primaryColor: "#f97316",
            secondaryColor: "#22c55e",
            isActive: true,
            isDefault: true,
        },
    });
    console.log(`✅ District: ${district.name} (ID: ${district.id})`);

    // ── 2. Seed each merchant ─────────────────────────────────────────────
    let created = 0;

    for (const merchant of PILOT_MERCHANTS) {
        const vendorSlug = generateVendorSlug(merchant.businessName, district.slug);

        // ── 2a. Create User (mobile as username, role=VENDOR) ─────────────
        const user = await prisma.user.upsert({
            where: { username: merchant.mobile },
            update: {
                shopName: merchant.businessName,
            },
            create: {
                username: merchant.mobile,
                password: hashPassword("pilot@123"),
                role: "VENDOR",
                isAdmin: false,
                districtId: district.id,
                shopName: merchant.businessName,
                shopAddress: "Shahdol, Madhya Pradesh",
            },
        });

        // ── 2b. Create Vendor (districtId_slug unique constraint) ─────────
        const vendor = await prisma.vendor.upsert({
            where: {
                districtId_slug: {
                    districtId: district.id,
                    slug: vendorSlug,
                },
            },
            update: {
                name: merchant.businessName,
                mobile: merchant.mobile,
                category: merchant.category,
                businessType: merchant.businessType,
                status: VendorStatus.APPROVED,
                isVerified: true,
                updatedAt: new Date(),
            },
            create: {
                name: merchant.businessName,
                slug: vendorSlug,
                mobile: merchant.mobile,
                category: merchant.category,
                businessType: merchant.businessType,
                status: VendorStatus.APPROVED,
                isVerified: true,
                districtId: district.id,
                userId: user.id,
            },
        });

        // ── 2c. Create Products ──────────────────────────────────────────
        let productCount = 0;
        for (const product of merchant.products) {
            const productSlug = generateProductSlug(product.name, vendorSlug);

            try {
                await prisma.product.upsert({
                    where: { slug: productSlug },
                    update: {
                        price: product.price,
                        description: `${product.name} — ${merchant.businessName}, Shahdol`,
                        status: "active",
                        approved: true,
                    },
                    create: {
                        title: product.name,
                        slug: productSlug,
                        price: product.price,
                        mrp: product.price,
                        description: `${product.name} — ${merchant.businessName}, Shahdol`,
                        status: "active",
                        approved: true,
                        stock: 100,
                        availableStock: 100,
                        vendorId: vendor.id,
                        districtId: district.id,
                        categoryName: merchant.category,
                    },
                });
                productCount++;
            } catch (err: any) {
                // Slug collision fallback: retry with unique timestamp suffix
                if (err.code === "P2002" && err.meta?.target?.includes("slug")) {
                    const fallbackSlug = appendSuffix(productSlug, Date.now());
                    await prisma.product.create({
                        data: {
                            title: product.name,
                            slug: fallbackSlug,
                            price: product.price,
                            mrp: product.price,
                            description: `${product.name} — ${merchant.businessName}, Shahdol`,
                            status: "active",
                            approved: true,
                            stock: 100,
                            availableStock: 100,
                            vendorId: vendor.id,
                            districtId: district.id,
                            categoryName: merchant.category,
                        },
                    });
                    productCount++;
                } else {
                    console.warn(`  ⚠️  Product "${product.name}" failed: ${err.message}`);
                }
            }
        }

        created++;
        console.log(`✅ ${String(created).padStart(2, " ")}. ${merchant.businessName.padEnd(32)} | ${productCount} products | slug: ${vendorSlug}`);
    }

    // ── 3. Summary ────────────────────────────────────────────────────────
    console.log("\n═══════════════════════════════════════════════");
    console.log(`🚀 Shahdol Pilot Seeding Complete!`);
    console.log(`   District:     ${district.name} (ID: ${district.id})`);
    console.log(`   Merchants:    ${created} created/verified`);
    console.log(`   Total Data:   ${PILOT_MERCHANTS.length} merchants × ~3.5 products avg`);
    console.log("═══════════════════════════════════════════════\n");
    console.log("🔑 Default login password for all pilots: pilot@123");
    console.log("   (Change immediately in production via admin panel)\n");
}

main()
    .catch((e) => {
        console.error("\n❌ Seeding Failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
