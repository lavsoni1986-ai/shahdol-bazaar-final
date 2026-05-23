/**
 * SOVEREIGN BACKFILL: Product.districtId
 *
 * Backfills Product.district_id from Vendor.district_id
 * for all products that have NULL district_id.
 *
 * Two-phase strategy:
 * 1. Copy district_id from associated Vendor (canonical source)
 * 2. Any remaining orphans get default district (Shahdol district_id=1)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("=== SOVEREIGN BACKFILL: Product.districtId ===");

    // Phase 1: Backfill from Vendor
    const phase1 = await prisma.$executeRawUnsafe(`
        UPDATE "Product" p
        SET "district_id" = v."district_id"
        FROM "Vendor" v
        WHERE p."vendorId" = v.id
          AND p."district_id" IS NULL
          AND v."district_id" IS NOT NULL;
    `);
    console.log(`Phase 1 (vendors → products): ${phase1} rows updated`);

    // Phase 2: Orphan fallback
    const phase2 = await prisma.$executeRawUnsafe(`
        UPDATE "Product" p
        SET "district_id" = (
          SELECT id FROM "District" WHERE "isDefault" = true LIMIT 1
        )
        WHERE p."district_id" IS NULL;
    `);
    console.log(`Phase 2 (orphan → default): ${phase2} rows updated`);

    // Verify
    const nulls = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `SELECT COUNT(*) as count FROM "Product" WHERE "district_id" IS NULL`
    );
    console.log(`\nRemaining NULL district_id: ${nulls[0]?.count ?? 0}`);

    // Show all products after fix
    const products = await prisma.product.findMany({
        select: {
            id: true,
            title: true,
            districtId: true,
            vendorId: true,
        },
    });
    console.log("\n=== ALL PRODUCTS AFTER BACKFILL ===");
    console.log(JSON.stringify(products, null, 2));

    await prisma.$disconnect();
}

main().catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
});
