// debug-db.ts - Debug store location in database
// Run with: npx tsx debug-db.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStore() {
    console.log("🔍 [DEBUG] Searching for store: laxmi-electronics-shahdol...");
    
    // 1. बिना ज़िले के पाबन्दी के पूरी टेबल में ढूंढो
    const allMatchingSlugs = await prisma.vendor.findMany({
        where: { slug: "laxmi-electronics-shahdol" }
    });

    if (allMatchingSlugs.length === 0) {
        console.log("❌ [ERROR] इस स्लग की कोई दुकान डेटाबेस में नहीं मिली!");
    } else {
        console.log(`✅ [FOUND] ${allMatchingSlugs.length} दुकान(एँ) मिलीं!`);
        allMatchingSlugs.forEach(v => {
            console.log(`📍 Store Name: ${v.name} | District ID: ${v.districtId} | Slug: ${v.slug}`);
        });
    }
}

checkStore()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
