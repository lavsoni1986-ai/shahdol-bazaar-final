import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function makeRepeatKey(o: any) {
  return `${o.customerPhone || 'unknown'}_${o.vendorId || o.shopId || 'x'}`
}

async function main() {
  const orders = await prisma.order.findMany()

  console.log(`Found ${orders.length} orders`)

  for (const o of orders) {
    let fulfillmentMinutes = null

    if (o.status === 'delivered') {
      fulfillmentMinutes = Math.floor(
        (new Date(o.updatedAt).getTime() - new Date(o.createdAt).getTime()) / 60000
      )
    }

    // Since Order model only has core fields, we avoid schema exceptions.
    await prisma.order.update({
      where: { id: o.id },
      data: {
        vendorId: o.vendorId || null,
        productId: o.productId
      }
    })

    console.log(`✓ Order ${o.id} processed (fulfillment: ${fulfillmentMinutes}m)`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())