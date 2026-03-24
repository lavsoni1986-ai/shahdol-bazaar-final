import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    + '-' + Date.now().toString(36);
}

async function migrateSchoolsToVendors() {
  console.log('🔄 Starting Schools to Vendors migration...\n');

  try {
    // Get all schools from legacy table
    const schools = await prisma.schools.findMany();
    console.log(`📚 Found ${schools.length} schools in legacy table`);

    if (schools.length === 0) {
      console.log('No schools to migrate.');
      return;
    }

    let migrated = 0;
    let skipped = 0;

    for (const school of schools) {
      // Check if already migrated (by checking legacySchoolId)
      const existing = await prisma.vendor.findFirst({
        where: { legacySchoolId: school.id }
      });

      if (existing) {
        console.log(`⏭️  Skipping "${school.name}" - already migrated`);
        skipped++;
        continue;
      }

      // Generate unique slug
      let slug = generateSlug(school.name);
      
      // Ensure slug is unique
      const existingSlug = await prisma.vendor.findUnique({ where: { slug } });
      if (existingSlug) {
        slug = generateSlug(school.name);
      }

      // Create vendor entry
      await prisma.vendor.create({
        data: {
          name: school.name,
          slug: slug,
          address: school.address,
          mobile: school.contact || null,
          businessType: 'SCHOOL',
          status: 'APPROVED',
          isVerified: true,
          dsslScore: school.dsslScore || 70,
          safetyBadges: school.safetyBadges || ['verified'],
          legacySchoolId: school.id,
        }
      });

      console.log(`✅ Migrated: "${school.name}" → Vendor (slug: ${slug})`);
      migrated++;
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📚 Total: ${schools.length}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateSchoolsToVendors()
  .then(() => {
    console.log('\n🎉 Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
