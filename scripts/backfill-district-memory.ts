/**
 * DISTRICT MEMORY BACKFILL MIGRATION
 * 
 * Populates existing null rows in DistrictDemandMemory with inferred metadata:
 * - normalizedIntent (inferred from domain/entity)
 * - confidence (default 0.5)
 * - originalQuery (defaults to query if null)
 * 
 * Run: ts-node scripts/backfill-district-memory.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface IntentMap {
    [key: string]: {
        [key: string]: string;
    };
}

// Map domain/entity combinations to normalized intents
const INTENT_INFERENCE_MAP: IntentMap = {
    "product": {
        "electronics": "search_electronics",
        "grocery": "search_grocery",
        "fashion": "search_fashion",
        "default": "search_product"
    },
    "vendor": {
        "retail": "search_vendor_retail",
        "service": "search_vendor_service",
        "healthcare": "search_vendor_healthcare",
        "default": "search_vendor"
    },
    "service": {
        "plumbing": "search_service_plumbing",
        "electrical": "search_service_electrical",
        "default": "search_service"
    },
    "hospital": {
        "default": "search_hospital"
    },
    "school": {
        "default": "search_school"
    },
    "default": {
        "default": "search_general"
    }
};

function inferNormalizedIntent(domain?: string | null, entity?: string | null): string {
    const d = (domain || "default").toLowerCase();
    const e = (entity || "default").toLowerCase();

    const domainMap = INTENT_INFERENCE_MAP[d] || INTENT_INFERENCE_MAP["default"];
    return domainMap[e] || domainMap["default"] || "search_general";
}

async function backfillDistrictMemory() {
    console.log("🔄 Starting District Memory Backfill Migration...\n");

    try {
        // Find all rows with null metadata
        const rowsWithNullMetadata = await prisma.districtDemandMemory.findMany({
            where: {
                OR: [
                    { normalizedIntent: null },
                    { confidence: null },
                    { originalQuery: null }
                ]
            },
            orderBy: { id: "asc" }
        });

        console.log(`📊 Found ${rowsWithNullMetadata.length} rows with null metadata\n`);

        if (rowsWithNullMetadata.length === 0) {
            console.log("✅ All rows already have metadata. No backfill needed.");
            return;
        }

        let updated = 0;
        let failed = 0;

        for (const row of rowsWithNullMetadata) {
            try {
                const inferredIntent = inferNormalizedIntent(row.domain, row.entity);
                const originalQuery = row.originalQuery || row.query || null;
                const confidence = row.confidence ?? 0.5;

                const result = await prisma.districtDemandMemory.update({
                    where: { id: row.id },
                    data: {
                        normalizedIntent: inferredIntent,
                        confidence: confidence,
                        originalQuery: originalQuery
                    }
                });

                console.log(`✅ Row ${row.id}: Updated with inferred intent "${inferredIntent}"`);
                updated++;

            } catch (error) {
                console.error(`❌ Row ${row.id}: Failed to update - ${error.message}`);
                failed++;
            }
        }

        console.log(`\n📈 Backfill Complete:`);
        console.log(`   ✅ Updated: ${updated}`);
        console.log(`   ❌ Failed: ${failed}`);
        console.log(`   📊 Total Rows with Metadata: ${await prisma.districtDemandMemory.count()}`);

        // Verify the backfill
        const stillNull = await prisma.districtDemandMemory.count({
            where: {
                OR: [
                    { normalizedIntent: null },
                    { confidence: null }
                ]
            }
        });

        console.log(`\n🔍 Verification:`);
        console.log(`   Rows with null metadata remaining: ${stillNull}`);

        if (stillNull === 0) {
            console.log(`   ✅ All rows have been successfully backfilled!`);
        } else {
            console.log(`   ⚠️  ${stillNull} rows still have null metadata`);
        }

    } catch (error) {
        console.error("❌ Backfill failed:", error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the backfill
backfillDistrictMemory();
