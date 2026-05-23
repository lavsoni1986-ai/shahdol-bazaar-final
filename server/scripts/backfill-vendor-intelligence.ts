import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function makeSearchText(v: any) {
  return [
    v.name,
    v.category,
    v.businessType,
    v.type,
    v.description,
    v.address,
    v.mobile,
    v.phone
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

async function main() {
  const vendors = await prisma.vendor.findMany({
    include: {
      orders: true,
      products: true
    }
  })

  console.log(`Found ${vendors.length} vendors`)

  for (const v of vendors) {
    const totalOrders = v.orders.length
    const completedOrders = v.orders.filter(o => o.status === 'delivered').length
    const cancelledOrders = v.orders.filter(o => o.status === 'cancelled').length

    const completionRate = totalOrders > 0 ? completedOrders / totalOrders : 0
    const aiRankScore =
      (v.dsslScore || 0) * 0.35 +
      (v.rating || 0) * 10 * 0.20 +
      (totalOrders * 0.15) +
      (completionRate * 100 * 0.20) +
      ((v.isVerified ? 1 : 0) * 10)

    await prisma.vendor.update({
      where: { id: v.id },
      data: {
        searchText: makeSearchText(v),
        totalOrders,
        completedOrders,
        cancelledOrders,
        aiRankScore: Number(aiRankScore.toFixed(2)),
        isAiIndexed: true,
        identityVersion: 1
      }
    })

    console.log(`✓ Vendor ${v.id} seeded`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())