import "dotenv/config";
import { db } from "./server/storage";
import { Prisma } from "@prisma/client";

async function fillStock() {
    console.log("🚀 [STOCK UPDATE] Filling up the inventory for all products...");
    
    try {
        // Update all products to have stock of 100
        const result = await db.product.updateMany({
            data: {
                stock: 100
            }
        });

        console.log(`✅ [SUCCESS] Updated ${result.count} products to have stock = 100!`);
        console.log("🎉 दुकान पर रौनक लौट आई है। सारा सामान अब 'In Stock' है!");
    } catch (error) {
        console.error("❌ [ERROR] Failed to update stock:", error);
        process.exit(1);
    }
    
    process.exit(0);
}

fillStock();
