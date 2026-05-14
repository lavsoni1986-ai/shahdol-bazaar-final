import { prisma } from "../server/storage.js";
import { generateEmbedding } from "../server/routes/ai.js";

/**
 * BharatOS Embedding Job - Background Script
 * Generates AI embeddings for all products in batches
 * Run this script to populate the embedding field for semantic search
 */

async function generateProductEmbeddings() {
  console.log("🚀 [EMBEDDING JOB] Starting BharatOS Product Embedding Generation...");

  try {
    // Get total count for progress tracking
    const totalProducts = await prisma.product.count({
      where: { approved: true }
    });

    console.log(`📊 [EMBEDDING JOB] Processing ${totalProducts} approved products...`);

    const batchSize = 10; // Process in small batches to avoid rate limits
    let processed = 0;
    let successCount = 0;
    let errorCount = 0;

    for (let offset = 0; offset < totalProducts; offset += batchSize) {
      const products = await prisma.product.findMany({
        where: { approved: true },
        select: {
          id: true,
          title: true,
          description: true,
          categoryName: true,
          embedding: true // Check if already has embedding
        },
        skip: offset,
        take: batchSize,
        orderBy: { id: 'asc' }
      });

      for (const product of products) {
        try {
          // Skip if already has embedding
          if (product.embedding && product.embedding.length > 0) {
            console.log(`⏭️ [EMBEDDING JOB] Skipping Product ${product.id} - already has embedding`);
            processed++;
            continue;
          }

          // Generate embedding from combined text
          const textToEmbed = `${product.title} ${product.description || ''} ${product.categoryName || ''}`.trim();
          if (!textToEmbed || textToEmbed.length < 10) {
            console.warn(`⚠️ [EMBEDDING JOB] Skipping Product ${product.id} - insufficient text`);
            processed++;
            continue;
          }

          console.log(`🧠 [EMBEDDING JOB] Generating embedding for Product ${product.id}: "${product.title}"`);

          const embedding = await generateEmbedding(textToEmbed);

          // Update product with embedding
          await prisma.product.update({
            where: { id: product.id },
            data: { embedding: embedding }
          });

          successCount++;
          console.log(`✅ [EMBEDDING JOB] Saved embedding for Product ${product.id}`);

        } catch (error) {
          errorCount++;
          console.error(`❌ [EMBEDDING JOB] Failed for Product ${product.id}:`, error);
        }

        processed++;

        // Progress update
        if (processed % 50 === 0) {
          console.log(`📈 [EMBEDDING JOB] Progress: ${processed}/${totalProducts} (${Math.round((processed/totalProducts)*100)}%)`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`🎉 [EMBEDDING JOB] COMPLETED!`);
    console.log(`📊 [EMBEDDING JOB] Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log(`   ⏭️ Skipped: ${processed - successCount - errorCount}`);
    console.log(`   📈 Total Processed: ${processed}`);

  } catch (error) {
    console.error("💥 [EMBEDDING JOB] Fatal error:", error);
    process.exit(1);
  }
}

// Run the job
generateProductEmbeddings()
  .then(() => {
    console.log("🏁 [EMBEDDING JOB] Script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 [EMBEDDING JOB] Script failed:", error);
    process.exit(1);
  });