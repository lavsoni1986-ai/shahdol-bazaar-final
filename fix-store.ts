// fix-store.ts - Move Laxmi Electronics to Shahdol district
// Run with: npx tsx fix-store.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function moveStoreToShahdol() {
    console.log("🚀 [MOVING] Moving 'Laxmi Electronics' to Shahdol (ID: 2)...");
    
    // Find the vendor first
    const vendor = await prisma.vendor.findFirst({
        where: { slug: "laxmi-electronics-shahdol" }
    });
    
    if (!vendor) {
        console.log("❌ [ERROR] Store not found with slug: laxmi-electronics-shahdol");
        return;
    }
    
    console.log(`📍 Found store: ${vendor.name} (ID: ${vendor.id}), current districtId: ${vendor.districtId}`);
    
    // Update the vendor's districtId to 2 (Shahdol)
    await prisma.vendor.update({
        where: { id: vendor.id },
        data: { districtId: 2 }
    });
    
    console.log("✅ [SUCCESS] दुकान अब शहडोल के बाज़ार में शिफ्ट हो गई है!");
}

moveStoreToShahdol()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
