import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function normalizeCategory(p: any) {
  return (p.categoryName || 'general').toLowerCase().trim()
}

function buildSearchText(p: any) {
  return [
    p.title,
    p.description,
    p.categoryName,
    p.vendor?.name
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

async function main() {
  const products = await prisma.product.findMany({
    include: {
      vendor: true,
      orders: true
    }
  })

  console.log(`Found ${products.length} products`)

  for (const p of products) {
    const orderCount = p.orders.length
    const viewCount = Math.max(orderCount * 3, 0)
    const conversionScore = viewCount > 0 ? orderCount / viewCount : 0

    await prisma.product.update({
      where: { id: p.id },
      data: {
        canonicalTitle: p.title?.trim(),
        normalizedCategory: normalizeCategory(p),
        legacyTitle: p.title,
        legacyPriceRaw: p.price ? String(p.price) : null,
        searchText: buildSearchText(p),
        orderCount,
        viewCount,
        conversionScore: Number(conversionScore.toFixed(2)),
        aiRankScore: Number((orderCount * 1.5 + (p.isTrending ? 10 : 0)).toFixed(2)),
        isAiIndexed: true,
        identityVersion: 1
      }
    })

    console.log(`✓ Product ${p.id} seeded`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())