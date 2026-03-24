/**
 * Bus Timetable Seed Script
 * Shahdol से जाने वाली बसों की समय सारणी
 * 
 * Destinations: रीवा (Rewa), उमरिया (Umaria), अनूपपुर (Anuppur), 
 * जबलपुर (Jabalpur), सतना (Satna), कटनी (Katni), बिलासपुर (Bilaspur)
 */

import { prisma } from "../server/storage.js";

type BusRouteData = {
  fromCity: string;
  toCity: string;
  firstBusTime: string;
  lastBusTime: string;
  fare: string;
  boardingPoint: string;
  busType: string;
  frequency: string;
};

// Bus routes data from Shahdol (शहडोल से जाने वाली बसें)
const busRoutes: BusRouteData[] = [
  // Shahdol to Rewa (शहडोल से रीवा)
  {
    fromCity: "शहडोल",
    toCity: "रीवा",
    firstBusTime: "05:30 AM",
    lastBusTime: "08:30 PM",
    fare: "₹180",
    boardingPoint: "शहडोल बस स्टैंड",
    busType: "साधारण",
    frequency: "रोज़ाना"
  },
  {
    fromCity: "शहडोल",
    toCity: "रीवा",
    firstBusTime: "07:00 AM",
    lastBusTime: "06:00 PM",
    fare: "₹250",
    boardingPoint: "शहडोल बस स्टैंड",
    busType: "एसी",
    frequency: "रोज़ाना"
  },
  
  // Shahdol to Umaria (शहडोल से उमरिया)
  {
    fromCity: "शहडोल",
    toCity: "उमरिया",
    firstBusTime: "06:00 AM",
    lastBusTime: "07:00 PM",
    fare: "₹120",
    boardingPoint: "शहडोल बस स्टैंड",
    busType: "साधारण",
    frequency: "रोज़ाना"
  },
  {
    fromCity: "शहडोल",
    toCity: "उमरिया",
    firstBusTime: "09:00 AM",
    lastBusTime: "04:00 PM",
    fare: "₹150",
    boardingPoint: "शहडोल बस स्टैंड",
    busType: "एसी",
    frequency: "रोज़ाना"
  },
  
  // Shahdol to Anuppur (शहडोल से अनूपपुर)
  {
    fromCity: "शहडोल",
    toCity: "अनूपपुर",
    firstBusTime: "05:00 AM",
    lastBusTime: "06:00 PM",
    fare: "₹100",
    boardingPoint: "शहडोल बस स्टैंड",
    busType: "साधारण",
    frequency: "रोज़ाना"
  },
  
  // Shahdol to Jabalpur (शहडोल से जबलपुर)
  {
    fromCity: "शहडोल",
    toCity: "जबलपुर",
    firstBusTime: "06:30 AM",
    lastBusTime: "05:00 PM",
    fare: "₹350",
    boardingPoint: "शहडोल बस स्टैंड",
    busType: "साधारण",
    frequency: "रोज़ाना"
  },
  {
    fromCity: "शहडोल",
    toCity: "जबलपुर",
    firstBusTime: "08:00 AM",
    lastBusTime: "02:00 PM",
    fare: "₹450",
    boardingPoint: "शहडोल बस स्टैंड",
    busType: "एसी",
    frequency: "रोज़ाना"
  },
  
  // Shahdol to Satna (शहडोल से सतना)
  {
    fromCity: "शहडोल",
    toCity: "सतना",
    firstBusTime: "05:30 AM",
    lastBusTime: "06:30 PM",
    fare: "₹200",
    boardingPoint: "शहडोल बस स्टैंड",
    busType: "साधारण",
    frequency: "रोज़ाना"
  },
  
  // Shahdol to Katni (शहडोल से कटनी)
  {
    fromCity: "शहडोल",
    toCity: "कटनी",
    firstBusTime: "06:00 AM",
    lastBusTime: "05:00 PM",
    fare: "₹280",
    boardingPoint: "शहडोल बस स्टैंड",
    busType: "साधारण",
    frequency: "रोज़ाना"
  },
  
  // Shahdol to Bilaspur (शहडोल से बिलासपुर)
  {
    fromCity: "शहडोल",
    toCity: "बिलासपुर",
    firstBusTime: "07:00 AM",
    lastBusTime: "04:00 PM",
    fare: "₹320",
    boardingPoint: "शहडोल बस स्टैंड",
    busType: "साधारण",
    frequency: "रोज़ाना"
  },
  {
    fromCity: "शहडोल",
    toCity: "बिलासपुर",
    firstBusTime: "09:00 AM",
    lastBusTime: "02:00 PM",
    fare: "₹400",
    boardingPoint: "शहडोल बस स्टैंड",
    busType: "एसी",
    frequency: "रोज़ाना"
  },
  
  // Shahdol to Shahdol (Local routes - शहडोल के भीतरी रूट)
  {
    fromCity: "शहडोल",
    toCity: "बोधगना",
    firstBusTime: "07:00 AM",
    lastBusTime: "06:00 PM",
    fare: "₹30",
    boardingPoint: "शहडोल बस स्टैंड",
    busType: "साधारण",
    frequency: "रोज़ाना"
  },
  {
    fromCity: "शहडोल",
    toCity: "बुढ़ार",
    firstBusTime: "08:00 AM",
    lastBusTime: "05:00 PM",
    fare: "₹40",
    boardingPoint: "शहडोल बस स्टैंड",
    busType: "साधारण",
    frequency: "रोज़ाना"
  },
  {
    fromCity: "शहडोल",
    toCity: "जैतपुर",
    firstBusTime: "06:30 AM",
    lastBusTime: "06:00 PM",
    fare: "₹35",
    boardingPoint: "शहडोल बस स्टैंड",
    busType: "साधारण",
    frequency: "रोज़ाना"
  },
  
  // Shahdol to Indore (शहडोल से इंदौर - लंबी यात्रा)
  {
    fromCity: "शहडोल",
    toCity: "इंदौर",
    firstBusTime: "04:00 PM",
    lastBusTime: "04:00 PM",
    fare: "₹700",
    boardingPoint: "शहडोल बस स्टैंड",
    busType: "स्लीपर",
    frequency: "सप्ताह में 3 बार"
  },
  
  // Shahdol to Bhopal (शहडोल से भोपाल)
  {
    fromCity: "शहडोल",
    toCity: "भोपाल",
    firstBusTime: "05:00 PM",
    lastBusTime: "05:00 PM",
    fare: "₹550",
    boardingPoint: "शहडोल बस स्टैंड",
    busType: "एसी",
    frequency: "रोज़ाना"
  },
];

async function seedBusTimetable() {
  console.log("🚌 Seeding Bus Timetable...\n");
  
  try {
    // First, deactivate all existing routes
    await prisma.$executeRaw`UPDATE "BusTimetable" SET is_active = false`;
    console.log("✅ Deactivated existing routes");
    
    // Insert new routes
    let inserted = 0;
    for (const route of busRoutes) {
      await prisma.$executeRaw`
        INSERT INTO "BusTimetable" (from_city, to_city, first_bus_time, last_bus_time, fare, boarding_point, bus_type, frequency, is_active, created_at, updated_at)
        VALUES (${route.fromCity}, ${route.toCity}, ${route.firstBusTime}, ${route.lastBusTime}, ${route.fare}, ${route.boardingPoint}, ${route.busType}, ${route.frequency}, true, NOW(), NOW())
      `;
      inserted++;
      console.log(`   📍 ${route.fromCity} → ${route.toCity}: ${route.firstBusTime} - ${route.fare}`);
    }
    
    console.log(`\n✅ Successfully seeded ${inserted} bus routes!`);
    
    // Show summary using Prisma
    const activeRoutes = await prisma.busTimetable.findMany({
      where: { isActive: true }
    });
    console.log(`\n📊 Total active routes: ${activeRoutes.length}`);
    
    // Group by destination
    const byDestination: Record<string, number> = {};
    for (const route of activeRoutes) {
      const toCity = route.toCity as string;
      byDestination[toCity] = (byDestination[toCity] || 0) + 1;
    }
    
    console.log("\n🗺️ Routes by destination:");
    for (const [city, count] of Object.entries(byDestination)) {
      console.log(`   ${city}: ${count} routes`);
    }
    
  } catch (error) {
    console.error("❌ Error seeding bus timetable:", error);
    process.exit(1);
  }
}

seedBusTimetable();
