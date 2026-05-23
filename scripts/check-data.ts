import { prisma } from '../server/storage';

async function main() {
  // Show all districts
  const districts = await prisma.district.findMany({
    select: { id: true, name: true, slug: true, isActive: true },
    orderBy: { id: 'asc' }
  });
  console.log('All Districts:', JSON.stringify(districts, null, 2));
  
  // Check data counts for Shahdol (121)
  console.log('\nData for Shahdol (121):');
  console.log('- Vendors:', await prisma.vendor.count({ where: { districtId: 121 } }));
  console.log('- Products:', await prisma.product.count({ where: { districtId: 121 } }));
  console.log('- Service Workers:', await prisma.serviceWorker.count({ where: { districtId: 121 } }));
  console.log('- Bus Routes:', await prisma.busTimetable.count({ where: { districtId: 121 } }));
  console.log('- Categories:', await prisma.category.count({ where: { districtId: 121 } }));
}

main().catch(console.error).finally(() => process.exit(0));