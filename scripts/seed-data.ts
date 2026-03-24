/**
 * Shahdol Bazaar SaaS - Database Seed Script
 * Seeds: BusTimetable, Doctors, Hospitals
 * 
 * Run with: npx tsx scripts/seed-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BUS_ROUTES = [
  { fromCity: 'Shahdol', toCity: 'Rewa', firstBusTime: '05:00 AM', lastBusTime: '08:00 PM', fare: 150, boardingPoint: 'Shahdol Bus Stand', busType: 'Ordinary', frequency: 'Every 30 min' },
  { fromCity: 'Shahdol', toCity: 'Umaria', firstBusTime: '06:00 AM', lastBusTime: '06:00 PM', fare: 80, boardingPoint: 'Shahdol Bus Stand', busType: 'Ordinary', frequency: 'Every hour' },
  { fromCity: 'Shahdol', toCity: 'Jabalpur', firstBusTime: '04:30 AM', lastBusTime: '09:00 PM', fare: 250, boardingPoint: 'Shahdol Bus Stand', busType: 'Express', frequency: 'Every 45 min' },
  { fromCity: 'Shahdol', toCity: 'Anuppur', firstBusTime: '05:30 AM', lastBusTime: '07:00 PM', fare: 120, boardingPoint: 'Shahdol Bus Stand', busType: 'Ordinary', frequency: 'Every hour' },
  { fromCity: 'Shahdol', toCity: 'Bhopal', firstBusTime: '04:00 AM', lastBusTime: '08:00 PM', fare: 400, boardingPoint: 'Shahdol Bus Stand', busType: 'Volvo', frequency: 'Every 2 hours' },
  { fromCity: 'Shahdol', toCity: 'Indore', firstBusTime: '03:30 AM', lastBusTime: '06:00 PM', fare: 500, boardingPoint: 'Shahdol Bus Stand', busType: 'Volvo', frequency: 'Daily' },
  { fromCity: 'Shahdol', toCity: 'Satna', firstBusTime: '05:00 AM', lastBusTime: '05:00 PM', fare: 180, boardingPoint: 'Shahdol Bus Stand', busType: 'Express', frequency: 'Every 2 hours' },
  { fromCity: 'Shahdol', toCity: 'Dindori', firstBusTime: '06:00 AM', lastBusTime: '06:00 PM', fare: 60, boardingPoint: 'Shahdol Bus Stand', busType: 'Ordinary', frequency: 'Every hour' },
  { fromCity: 'Shahdol', toCity: 'Katni', firstBusTime: '05:30 AM', lastBusTime: '04:00 PM', fare: 200, boardingPoint: 'Shahdol Bus Stand', busType: 'Ordinary', frequency: 'Daily' },
  { fromCity: 'Shahdol', toCity: 'Kolar', firstBusTime: '06:00 AM', lastBusTime: '05:00 PM', fare: 100, boardingPoint: 'Shahdol Bus Stand', busType: 'Ordinary', frequency: 'Every 2 hours' },
];

const DOCTORS = [
  { name: 'Dr. Rajesh Kumar', qualification: 'MBBS, MD', specialization: 'General Medicine', experience: 15, consultationFee: 500 },
  { name: 'Dr. Priya Sharma', qualification: 'MBBS, MS', specialization: 'Gynecologist', experience: 12, consultationFee: 600 },
  { name: 'Dr. Anil Verma', qualification: 'MBBS, DM', specialization: 'Cardiologist', experience: 20, consultationFee: 800 },
  { name: 'Dr. Sunita Pandey', qualification: 'MBBS, MD', specialization: 'Pediatrician', experience: 10, consultationFee: 450 },
  { name: 'Dr. Vikram Singh', qualification: 'MBBS, MCh', specialization: 'Neurologist', experience: 18, consultationFee: 900 },
  { name: 'Dr. Meera Aggarwal', qualification: 'BDS', specialization: 'Dentist', experience: 8, consultationFee: 300 },
  { name: 'Dr. Kamlesh Verma', qualification: 'MBBS, MS', specialization: 'Orthopedic', experience: 14, consultationFee: 700 },
  { name: 'Dr. Rachna Gupta', qualification: 'MBBS, MD', specialization: 'Dermatologist', experience: 9, consultationFee: 550 },
  { name: 'Dr. Alok Mishra', qualification: 'MBBS, PhD', specialization: 'Psychiatrist', experience: 22, consultationFee: 1000 },
  { name: 'Dr. Neelam Soni', qualification: 'MBBS, DGO', specialization: 'Obstetrician', experience: 11, consultationFee: 650 },
];

async function seedBusRoutes() {
  console.log('🚌 Seeding Bus Routes...');
  let seeded = 0;
  
  for (const route of BUS_ROUTES) {
    try {
      await (prisma as any).busTimetable.create({
        data: {
          ...route,
          isActive: true,
        }
      });
      seeded++;
    } catch (err) {
      // Route might already exist
    }
  }
  console.log(`   ✅ ${seeded} bus routes seeded`);
}

async function seedHospitals() {
  console.log('🏥 Seeding Hospitals...');
  
  const hospitals = [
    {
      name: 'Aditya Hospital',
      slug: 'aditya-hospital-shahdol',
      address: 'Main Road, Shahdol, MP',
      contactNumber: '7489177624',
      email: 'contact@adityahospital.com',
      description: 'Premier multi-specialty hospital in Shahdol',
      specialties: ['Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics'],
      images: []
    },
    {
      name: 'Shri Ram Hospital',
      slug: 'shri-ram-hospital-shahdol',
      address: 'Station Road, Shahdol, MP',
      contactNumber: '9753000000',
      email: 'info@shriramhospital.com',
      description: 'Trusted healthcare provider since 1990',
      specialties: ['General Medicine', 'Gynecology', 'Surgery'],
      images: []
    },
    {
      name: 'City Medical Center',
      slug: 'city-medical-center-shahdol',
      address: 'Market Complex, Shahdol, MP',
      contactNumber: '9827000000',
      email: 'citymedical@gmail.com',
      description: 'Affordable healthcare for all',
      specialties: ['General Medicine', 'Pediatrics', 'Dermatology'],
      images: []
    }
  ];

  let seeded = 0;
  for (const hospital of hospitals) {
    try {
      await (prisma as any).hospital.create({ data: hospital });
      seeded++;
    } catch (err) {
      // Hospital might already exist
    }
  }
  console.log(`   ✅ ${seeded} hospitals seeded`);
}

async function seedDoctors() {
  console.log('👨‍⚕️ Seeding Doctors...');
  
  // First ensure hospitals exist
  let hospitals;
  try {
    hospitals = await (prisma as any).hospital.findMany();
  } catch {
    hospitals = [];
  }
  
  let seeded = 0;
  for (const doctor of DOCTORS) {
    try {
      const hospitalId = hospitals.length > 0 
        ? hospitals[Math.floor(Math.random() * hospitals.length)].id 
        : null;
      
      await (prisma as any).doctor.create({
        data: {
          ...doctor,
          hospitalId,
          availability: 'Mon-Sat, 10 AM - 5 PM',
          image: null
        }
      });
      seeded++;
    } catch (err) {
      // Doctor might already exist
    }
  }
  console.log(`   ✅ ${seeded} doctors seeded`);
}

async function main() {
  console.log('🚀 Starting Database Seed...\n');
  
  try {
    await seedBusRoutes();
    await seedHospitals();
    await seedDoctors();
    
    console.log('\n✅ Database seeding completed successfully!\n');
  } catch (error: any) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
