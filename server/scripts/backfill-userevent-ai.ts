import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const events = await prisma.userEvent.findMany()

  console.log(`Found ${events.length} user events`)

  for (const e of events) {
    let parsedCategory = null
    let parsedIntent = null

    if (e.action) {
      const a = e.action.toLowerCase()

      if (a.includes('search')) parsedIntent = 'SEARCH'
      else if (a.includes('click')) parsedIntent = 'CLICK'
      else if (a.includes('order')) parsedIntent = 'ORDER'
      else parsedIntent = 'GENERAL'
    }

    await prisma.userEvent.update({
      where: { id: e.id },
      data: {
        districtId: null,
        queryText: null,
        parsedIntent,
        parsedCategory,
        aiResponseSummary: null,
        matchedVendorIds: e.vendorId ? [e.vendorId] : [],
        matchedProductIds: e.productId ? [e.productId] : [],
        converted: false,
        confidenceScore: 0
      }
    })

    console.log(`✓ Event ${e.id} seeded`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())