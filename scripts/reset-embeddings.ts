import { prisma } from "../server/storage.js";

/**
 * Reset embeddings for first 13 products to force regeneration
 */
async function resetEmbeddings() {
  console.log("🔄 [RESET] Resetting embeddings for first 13 products...");

  try {
    const products = await prisma.product.findMany({
      select: { id: true, title: true },
      orderBy: { id: 'asc' },
      take: 13
    });

    console.log(`📊 [RESET] Found ${products.length} products to reset`);

    for (const product of products) {
      await prisma.product.update({
        where: { id: product.id },
        data: { embedding: [] }
      });
      console.log(`✅ [RESET] Reset embedding for Product ${product.id}: ${product.title}`);
    }

    console.log("🎉 [RESET] Successfully reset embeddings for regeneration");

  } catch (error) {
    console.error("💥 [RESET] Error resetting embeddings:", error);
    process.exit(1);
  }
}

resetEmbeddings();