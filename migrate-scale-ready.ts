// 🔥 SCALE-READY MIGRATION SCRIPT
// Run this to add new schema fields for production readiness

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runMigration() {
  console.log('🚀 Starting scale-ready migration...');

  try {
    // Add fraudScore to existing vendors
    console.log('📊 Adding fraud scores to vendors...');
    const vendors = await prisma.vendor.findMany({ select: { id: true } });

    for (const vendor of vendors) {
      await prisma.vendor.update({
        where: { id: vendor.id },
        data: { fraudScore: 0 }
      });
    }

    console.log(`✅ Initialized fraud scores for ${vendors.length} vendors`);

    // Create default DsslConfig entries for districts
    console.log('⚙️ Creating default district configurations...');
    const districts = await prisma.district.findMany({ select: { id: true } });

    for (const district of districts) {
      const existing = await prisma.dsslConfig.findUnique({
        where: { districtId: district.id }
      });

      if (!existing) {
        await prisma.dsslConfig.create({
          data: {
            districtId: district.id,
            thresholds: {
              suspend: 20,
              restrict: 40,
              boost: 80
            },
            weights: {}
          }
        });
      }
    }

    console.log(`✅ Created DsslConfig for ${districts.length} districts`);

    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();