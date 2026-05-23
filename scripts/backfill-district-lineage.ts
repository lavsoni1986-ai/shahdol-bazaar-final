// scripts/backfill-district-lineage.ts
// ============================================
// SAFE DISTRICT LINEAGE BACKFILL
// ============================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillReviewDistricts() {
  console.log('🔄 Backfilling districtId for Reviews...');

  // Get all reviews, filter in JS for null districtId
  const allReviews = await prisma.review.findMany({
    include: { product: true }
  });

  const reviewsWithoutDistrict = allReviews.filter(r => r.districtId === null);

  console.log(`Found ${reviewsWithoutDistrict.length} reviews to backfill`);

  let successCount = 0;
  let errorCount = 0;

  for (const review of reviewsWithoutDistrict) {
    try {
      if (review.product?.districtId) {
        await prisma.review.update({
          where: { id: review.id },
          data: { districtId: review.product.districtId }
        });
        successCount++;
      } else {
        console.warn(`⚠️ Review ${review.id} has no product districtId - skipping`);
        errorCount++;
      }
    } catch (err) {
      console.error(`❌ Failed to backfill review ${review.id}:`, err);
      errorCount++;
    }
  }

  console.log(`✅ Review backfill complete: ${successCount} success, ${errorCount} errors`);
}

async function backfillUserEventDistricts() {
  console.log('🔄 Backfilling districtId for UserEvents...');

  // Get all user events, filter in JS for null districtId
  const allEvents = await prisma.userEvent.findMany({
    include: {
      user: { select: { districtId: true } },
      product: { select: { districtId: true } }
    }
  });

  const eventsWithoutDistrict = allEvents.filter(e => e.districtId === null);

  console.log(`Found ${eventsWithoutDistrict.length} user events to backfill`);

  let successCount = 0;
  let errorCount = 0;

  for (const event of eventsWithoutDistrict) {
    try {
      // Priority: user.districtId > product.districtId
      const districtId = event.user?.districtId || event.product?.districtId;

      if (districtId) {
        await prisma.userEvent.update({
          where: { id: event.id },
          data: { districtId }
        });
        successCount++;
      } else {
        console.warn(`⚠️ UserEvent ${event.id} has no determinable districtId - skipping`);
        errorCount++;
      }
    } catch (err) {
      console.error(`❌ Failed to backfill userEvent ${event.id}:`, err);
      errorCount++;
    }
  }

  console.log(`✅ UserEvent backfill complete: ${successCount} success, ${errorCount} errors`);
}

async function main() {
  try {
    console.log('🚀 Starting district lineage backfill...');

    await backfillReviewDistricts();
    await backfillUserEventDistricts();

    console.log('✅ District lineage backfill completed successfully');

    console.log('✅ Backfill completed - all records processed');

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();