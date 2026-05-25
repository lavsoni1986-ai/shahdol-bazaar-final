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

    const eventData = e.eventData as any;
    const vendorId = eventData?.vendorId || null;
    const productId = eventData?.productId || null;

    // Since UserEvent model only has core fields, we avoid schema exceptions.
    await prisma.userEvent.update({
      where: { id: e.id },
      data: {
        converted: e.converted ?? false,
        districtId: e.districtId
      }
    })

    console.log(`✓ Event ${e.id} processed (vendor: ${vendorId}, product: ${productId})`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())