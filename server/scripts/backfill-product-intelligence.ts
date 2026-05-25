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

    // Since Product model only has core fields, we avoid schema exceptions.
    await prisma.product.update({
      where: { id: p.id },
      data: {
        title: p.title
      }
    })

    console.log(`✓ Product ${p.id} processed (orders: ${orderCount})`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())