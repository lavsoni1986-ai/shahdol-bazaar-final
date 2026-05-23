import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const hospitals = await prisma.hospital.findMany()

  console.log(`Found ${hospitals.length} hospitals to migrate`)

  for (const h of hospitals) {
    await prisma.vendor.create({
      data: {
        name: h.name,
        slug: h.slug,
        category: "HOSPITAL",
        districtId: h.districtId,

        metaData: {
          beds: h.totalBeds,
          availableBeds: h.availableBeds,
          emergency: h.is24x7
        }
      }
    })
  }

  console.log("✅ Hospitals migrated to vendors")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())