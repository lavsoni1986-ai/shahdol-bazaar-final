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

async function migrateServiceWorkersToVendors() {
    console.log('🔄 Starting ServiceWorkers to Vendors migration...\n');

    try {
        // Get all service workers from legacy table
        const serviceWorkers = await prisma.serviceWorker.findMany();
        console.log(`👷 Found ${serviceWorkers.length} service workers in legacy table`);

        if (serviceWorkers.length === 0) {
            console.log('No service workers to migrate.');
            return;
        }

        let migrated = 0;
        let skipped = 0;

        for (const worker of serviceWorkers) {
            // Check if already migrated (by checking legacyServiceWorkerId)
            const existing = await prisma.vendor.findFirst({
                where: { legacyServiceWorkerId: worker.id }
            });

            if (existing) {
                console.log(`⏭️  Skipping "${worker.name}" - already migrated`);
                skipped++;
                continue;
            }

            // Generate unique slug if needed
            let slug = worker.slug;
            if (!slug) {
                slug = generateSlug(worker.name);
            }

            // Ensure slug is unique
            const existingSlug = await prisma.vendor.findUnique({ where: { slug } });
            if (existingSlug) {
                slug = generateSlug(worker.name);
            }

            // Create vendor entry
            await prisma.vendor.create({
                data: {
                    name: worker.name,
                    slug: slug,
                    description: worker.description,
                    logo: worker.image,
                    address: worker.address,
                    phone: worker.phone,
                    mobile: worker.phone, // Duplicate for compatibility
                    businessType: 'SERVICE',
                    category: worker.serviceType,
                    districtId: worker.districtId,
                    serviceArea: worker.serviceArea,
                    serviceHours: worker.serviceHours,
                    specialties: worker.skillTags,
                    experience: worker.experience,
                    rating: worker.rating ? parseFloat(worker.rating.toString()) : 0,
                    dsslScore: worker.dsslScore,
                    isVerified: worker.isVerified,
                    status: worker.isActive ? 'APPROVED' : 'PENDING',
                    userId: worker.userId,
                    createdAt: worker.createdAt,
                    updatedAt: worker.updatedAt,
                    // Store service-specific data
                    hospitalData: {
                        basePrice: worker.basePrice,
                        hourlyRate: worker.hourlyRate,
                        reviewCount: worker.reviewCount,
                        isAvailable: worker.isAvailable
                    },
                    legacyServiceWorkerId: worker.id
                }
            });

            console.log(`✅ Migrated: "${worker.name}" → Vendor (slug: ${slug})`);
            migrated++;
        }

        console.log(`\n📊 Migration Summary:`);
        console.log(`   ✅ Migrated: ${migrated}`);
        console.log(`   ⏭️  Skipped: ${skipped}`);
        console.log(`   👷 Total: ${serviceWorkers.length}`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the migration
migrateServiceWorkersToVendors()
    .then(() => {
        console.log('\n🎉 ServiceWorkers migration completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 ServiceWorkers migration failed:', error);
        process.exit(1);
    });