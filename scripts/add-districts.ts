import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addMissingDistricts() {
  console.log('Checking existing districts...')

  const existingDistricts = await prisma.district.findMany({
    select: { name: true, slug: true }
  })

  console.log('Existing districts:', existingDistricts.map(d => d.name))

  const requiredDistricts = [
    { name: 'Umaria', slug: 'umaria' },
    { name: 'Anuppur', slug: 'anuppur' },
    { name: 'Rewa', slug: 'rewa' },
    { name: 'Bilaspur', slug: 'bilaspur' },
    { name: 'Raigarh', slug: 'raigarh' },
    { name: 'Shahdol', slug: 'shahdol' } // Already exists
  ]

  const existingSlugs = existingDistricts.map(d => d.slug)
  const missingDistricts = requiredDistricts.filter(d => !existingSlugs.includes(d.slug))

  console.log(`Found ${existingDistricts.length} districts, ${missingDistricts.length} missing`)

  if (missingDistricts.length === 0) {
    console.log('All districts already exist!')
    return
  }

  console.log('Creating missing districts:', missingDistricts.map(d => d.name))

  for (const district of missingDistricts) {
    await prisma.district.create({
      data: {
        name: district.name,
        slug: district.slug,
        state: 'Madhya Pradesh',
        isActive: true,
        primaryColor: '#f97316',
        secondaryColor: '#22c55e'
      }
    })
    console.log(`✅ Created district: ${district.name}`)
  }

  const finalCount = await prisma.district.count()
  console.log(`Total districts now: ${finalCount}`)
}

addMissingDistricts()
  .catch(e => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())