/**
 * Aditya Hospital & Bus Routes Data Injection Script
 * Run with: npx tsx prisma/seed-aditya-hospital.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('ðŸ¥ Starting Aditya Hospital data injection...');

  // 1. Create Vendor for Aditya Hospital
  console.log('Creating Aditya Hospital vendor...');
  
  const vendor = await prisma.vendor.upsert({
    where: { slug: 'aditya-hospital-shahdol' },
    update: {},
    create: {
      name: 'Aditya Hospital',
      slug: 'aditya-hospital-shahdol',
      description: 'Best multi-specialty hospital in Shahdol with advanced healthcare facilities',
      isVerified: true,
      safetyScore: 100,
      businessType: 'HEALTHCARE',
      isHospital: true,
    },
  });
  console.log(`âœ… Vendor created: ${vendor.name} (ID: ${vendor.id})`);

  // 2. Create Hospital Profile
  console.log('Creating Hospital profile...');
  
  const hospital = await prisma.hospital.upsert({
    where: { slug: 'aditya-hospital-shahdol' },
    update: {},
    create: {
      name: 'Aditya Hospital',
      slug: 'aditya-hospital-shahdol',
      address: 'Main Road, Shahdol, Madhya Pradesh',
      contactNumber: '+91 98765 43210',
      email: 'contact@adityahospital.com',
      description: 'Aditya Hospital is a premier multi-specialty healthcare facility in Shahdol, Madhya Pradesh. We provide comprehensive medical services including Cardiology, Orthopedics, Neurology, Pediatrics, and General Medicine. Our team of experienced doctors and modern infrastructure ensure the best healthcare for our patients.',
      images: [
        'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=800',
        'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800',
      ],
      specialties: [
        'Cardiology',
        'Orthopedics',
        'Neurology',
        'Pediatrics',
        'General Medicine',
        'Emergency Care',
        'ICU',
        'Pharmacy',
      ],
      isVerified: true,
      vendorId: vendor.id,
    },
  });
  console.log(`âœ… Hospital profile created: ${hospital.name}`);

  // 3. Create Sample Doctors
  console.log('Creating sample doctors...');
  
  const doctors = await Promise.all([
    prisma.doctor.create({
      data: {
        name: 'Dr. Rajesh Kumar',
        qualification: 'MBBS, MD (Medicine)',
        specialization: 'General Medicine',
        experience: 15,
        consultationFee: 500,
        timing: 'Mon-Sat, 9 AM - 5 PM',
        image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400',
        hospitalId: hospital.id,
      },
    }),
    prisma.doctor.create({
      data: {
        name: 'Dr. Priya Sharma',
        qualification: 'MBBS, MS (Ortho)',
        specialization: 'Orthopedics',
        experience: 12,
        consultationFee: 700,
        timing: 'Mon-Fri, 10 AM - 4 PM',
        image: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400',
        hospitalId: hospital.id,
      },
    }),
    prisma.doctor.create({
      data: {
        name: 'Dr. Amit Patel',
        qualification: 'MBBS, DM (Cardiology)',
        specialization: 'Cardiology',
        experience: 18,
        consultationFee: 1000,
        timing: 'Tue-Sat, 11 AM - 3 PM',
        image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400',
        hospitalId: hospital.id,
      },
    }),
  ]);
  console.log(`âœ… ${doctors.length} doctors created`);

  // 4. Create Bus Timetable Entries
  console.log('Creating bus timetable entries...');
  
  const busRoutes = [
    {
      fromCity: 'Shahdol',
      toCity: 'Rewa',
      firstBusTime: '6:00 AM',
      lastBusTime: '8:00 PM',
      fare: 'â‚¹150-200',
      boardingPoint: 'Shahdol Bus Stand',
      busType: 'Express',
      travelTime: '3 hours',
      operatorName: 'Madhya Pradesh Road Transport',
      frequency: 'Every 30 minutes',
      publicNote: 'Direct bus service to Rewa',
      isActive: true,
    },
    {
      fromCity: 'Shahdol',
      toCity: 'Jabalpur',
      firstBusTime: '5:00 AM',
      lastBusTime: '6:00 PM',
      fare: 'â‚¹250-350',
      boardingPoint: 'Shahdol Bus Stand',
      busType: 'Semi-Sleeper',
      travelTime: '5 hours',
      operatorName: 'Madhya Pradesh Road Transport',
      frequency: 'Every hour',
      publicNote: 'AC and Non-AC buses available',
      isActive: true,
    },
    {
      fromCity: 'Shahdol',
      toCity: 'Anuppur',
      firstBusTime: '6:30 AM',
      lastBusTime: '7:30 PM',
      fare: 'â‚¹80-120',
      boardingPoint: 'Shahdol Bus Stand',
      busType: 'Local',
      travelTime: '1.5 hours',
      operatorName: 'Madhya Pradesh Road Transport',
      frequency: 'Every 20 minutes',
      publicNote: 'Frequent local service',
      isActive: true,
    },
  ];

  for (const route of busRoutes) {
    const bus = await prisma.busTimetable.create({
      data: route,
    });
    console.log(`âœ… Bus route created: ${bus.fromCity} â†’ ${bus.toCity}`);
  }

  // 5. Create Offer for Aditya Hospital
  console.log('Creating hospital offer...');
  
  await prisma.offer.create({
    data: {
      content: 'ðŸ¥ Free health checkup camp this weekend! Get your blood pressure and sugar levels tested absolutely free.',
      vendorId: vendor.id,
    },
  });
  console.log('âœ… Offer created');

  console.log('\nðŸŽ‰ All data injection completed successfully!');
  console.log('\nðŸ“‹ Summary:');
  console.log(`   - Vendor: ${vendor.name}`);
  console.log(`   - Hospital: ${hospital.name}`);
  console.log(`   - Doctors: ${doctors.length}`);
  console.log(`   - Bus Routes: ${busRoutes.length}`);
  console.log(`   - Offers: 1`);
  
  console.log('\nðŸ”— Test URLs:');
  console.log(`   - /vendor/aditya-hospital-shahdol`);
  console.log(`   - /bus`);
}

main()
  .catch((e) => {
    console.error('âŒ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

