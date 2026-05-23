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

    await prisma.order.update({
      where: { id: o.id },
      data: {
        vendorIdNormalized: o.vendorId || null,
        productIdNormalized: o.productId || null,
        districtSlug: null,
        locality: o.customerAddress || null,
        legacyShopId: o.shopId || null,
        legacyVendorId: o.vendorId || null,
        identityVersion: 1,
        orderSource: 'MARKETPLACE',
        aiInfluenced: false,
        repeatCustomerKey: makeRepeatKey(o),
        fulfillmentMinutes,
        fraudScore: 0,
        anomalyFlag: false
      }
    })

    console.log(`✓ Order ${o.id} seeded`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())