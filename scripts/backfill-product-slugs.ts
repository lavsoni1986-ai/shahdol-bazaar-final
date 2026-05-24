/**
 * ============================================
 * PRODUCT SLUG BACKFILL SCRIPT
 * ============================================
 * 
 * Safe, transactional, and deterministic script to backfill unique slugs 
 * for existing products.
 * 
 * Run options:
 * - Dry-run (default/explicit): npx tsx scripts/backfill-product-slugs.ts --dry-run
 * - Write mode:                 npx tsx scripts/backfill-product-slugs.ts --write
 */

import { PrismaClient } from "@prisma/client";
import { baseSlug, appendSuffix } from "../server/utils/slug";

const prisma = new PrismaClient();

async function run() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run") || !args.includes("--write");

  console.log(`🚀 Starting Product Slug Backfill...`);
  console.log(`Mode: ${isDryRun ? "🧪 DRY-RUN (No database writes)" : "💾 WRITE (Changes will be committed)"}`);
  console.log(`--------------------------------------------------`);

  try {
    // 1. Fetch all existing slugs to prevent collisions
    const existingProducts = await prisma.product.findMany({
      where: {
        slug: { not: null }
      },
      select: {
        slug: true
      }
    });

    const slugSet = new Set<string>();
    for (const p of existingProducts) {
      if (p.slug) slugSet.add(p.slug);
    }
    console.log(`ℹ️ Found ${slugSet.size} existing slugs in the database.`);

    // 2. Fetch all products missing a slug
    const productsToBackfill = await prisma.product.findMany({
      where: {
        OR: [
          { slug: null },
          { slug: "" }
        ]
      },
      select: {
        id: true,
        title: true,
        districtId: true
      },
      orderBy: {
        id: "asc"
      }
    });

    if (productsToBackfill.length === 0) {
      console.log(`🎉 No products require backfilling. All rows have slugs!`);
      return;
    }

    console.log(`📋 Found ${productsToBackfill.length} products to backfill.`);
    console.log(`--------------------------------------------------`);

    const updates: { id: number; title: string; slug: string }[] = [];

    // 3. Deterministically generate unique slugs
    for (const product of productsToBackfill) {
      const base = baseSlug(product.title);
      let slug = base;
      let counter = 1;

      while (slugSet.has(slug)) {
        counter++;
        slug = appendSuffix(base, counter);
      }

      // Add to set to prevent collision with other backfilled products in this run
      slugSet.add(slug);
      updates.push({
        id: product.id,
        title: product.title,
        slug
      });

      console.log(`  [Pending] ID: ${product.id.toString().padEnd(6)} | Title: "${product.title.slice(0, 20).padEnd(20)}" -> Slug: "${slug}"`);
    }

    console.log(`--------------------------------------------------`);

    // 4. Perform updates (if not dry-run)
    if (isDryRun) {
      console.log(`🧪 Dry-run complete. Would have updated ${updates.length} products.`);
      console.log(`To commit these changes, run with: npx tsx scripts/backfill-product-slugs.ts --write`);
    } else {
      console.log(`💾 Committing updates to the database in a transaction...`);
      
      const transactionOperations = updates.map(update => 
        prisma.product.update({
          where: { id: update.id },
          data: { slug: update.slug }
        })
      );

      await prisma.$transaction(transactionOperations);
      
      console.log(`✅ Transaction committed successfully! Updated ${updates.length} products.`);
    }

  } catch (error) {
    console.error(`❌ Error during product slug backfill:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
