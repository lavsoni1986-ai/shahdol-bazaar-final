// scripts/seed-bus-routes.ts
// Seeds 15 realistic Shahdol-region bus routes into BusTimetable

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const districtId = 1; // Shahdol

    // Check existing
    const existing = await prisma.busTimetable.count({ where: { districtId } });
    if (existing > 0) {
        console.log(`⏭️  ${existing} bus routes already exist — skipping seed`);
        return;
    }

    const routes = [
        { fromCity: "Shahdol", toCity: "Rewa", firstBusTime: "05:30 AM", lastBusTime: "08:30 PM", fare: "₹180", boardingPoint: "Shahdol Bus Stand", busType: "Ordinary", frequency: "Daily", operatorName: "MPRTC", districtId, isActive: true },
        { fromCity: "Shahdol", toCity: "Rewa", firstBusTime: "07:00 AM", lastBusTime: "06:00 PM", fare: "₹250", boardingPoint: "Shahdol Bus Stand", busType: "AC", frequency: "Daily", operatorName: "Private", districtId, isActive: true },
        { fromCity: "Shahdol", toCity: "Jabalpur", firstBusTime: "06:30 AM", lastBusTime: "05:00 PM", fare: "₹350", boardingPoint: "Shahdol Bus Stand", busType: "Ordinary", frequency: "Daily", operatorName: "MPRTC", districtId, isActive: true },
        { fromCity: "Shahdol", toCity: "Jabalpur", firstBusTime: "08:00 AM", lastBusTime: "02:00 PM", fare: "₹450", boardingPoint: "Shahdol Bus Stand", busType: "AC", frequency: "Daily", operatorName: "Private", districtId, isActive: true },
        { fromCity: "Shahdol", toCity: "Umaria", firstBusTime: "06:00 AM", lastBusTime: "07:00 PM", fare: "₹120", boardingPoint: "Shahdol Bus Stand", busType: "Ordinary", frequency: "Daily", operatorName: "MPRTC", districtId, isActive: true },
        { fromCity: "Shahdol", toCity: "Anuppur", firstBusTime: "05:00 AM", lastBusTime: "06:00 PM", fare: "₹100", boardingPoint: "Shahdol Bus Stand", busType: "Ordinary", frequency: "Daily", operatorName: "MPRTC", districtId, isActive: true },
        { fromCity: "Shahdol", toCity: "Satna", firstBusTime: "05:30 AM", lastBusTime: "06:30 PM", fare: "₹200", boardingPoint: "Shahdol Bus Stand", busType: "Express", frequency: "Daily", operatorName: "MPRTC", districtId, isActive: true },
        { fromCity: "Shahdol", toCity: "Katni", firstBusTime: "06:00 AM", lastBusTime: "05:00 PM", fare: "₹280", boardingPoint: "Shahdol Bus Stand", busType: "Ordinary", frequency: "Daily", operatorName: "MPRTC", districtId, isActive: true },
        { fromCity: "Shahdol", toCity: "Bilaspur", firstBusTime: "07:00 AM", lastBusTime: "04:00 PM", fare: "₹320", boardingPoint: "Shahdol Bus Stand", busType: "Ordinary", frequency: "Daily", operatorName: "MPRTC", districtId, isActive: true },
        { fromCity: "Shahdol", toCity: "Bhopal", firstBusTime: "05:00 PM", lastBusTime: "05:00 PM", fare: "₹550", boardingPoint: "Shahdol Bus Stand", busType: "AC Sleeper", frequency: "Daily", operatorName: "Private", districtId, isActive: true },
        { fromCity: "Shahdol", toCity: "Indore", firstBusTime: "04:00 AM", lastBusTime: "06:00 PM", fare: "₹700", boardingPoint: "Shahdol Bus Stand", busType: "Sleeper", frequency: "3 times/week", operatorName: "Private", districtId, isActive: true },
        { fromCity: "Shahdol", toCity: "Dindori", firstBusTime: "06:00 AM", lastBusTime: "06:00 PM", fare: "₹60", boardingPoint: "Shahdol Bus Stand", busType: "Ordinary", frequency: "Every hour", operatorName: "MPRTC", districtId, isActive: true },
        { fromCity: "Shahdol", toCity: "Bodhgada", firstBusTime: "07:00 AM", lastBusTime: "06:00 PM", fare: "₹30", boardingPoint: "Shahdol Bus Stand", busType: "Ordinary", frequency: "Daily", operatorName: "MPRTC", districtId, isActive: true },
        { fromCity: "Shahdol", toCity: "Budhar", firstBusTime: "08:00 AM", lastBusTime: "05:00 PM", fare: "₹40", boardingPoint: "Shahdol Bus Stand", busType: "Ordinary", frequency: "Daily", operatorName: "MPRTC", districtId, isActive: true },
        { fromCity: "Shahdol", toCity: "Jaitpur", firstBusTime: "06:30 AM", lastBusTime: "06:00 PM", fare: "₹35", boardingPoint: "Shahdol Bus Stand", busType: "Ordinary", frequency: "Daily", operatorName: "MPRTC", districtId, isActive: true },
    ];

    const result = await prisma.busTimetable.createMany({ data: routes, skipDuplicates: true });
    console.log(`✅ ${result.count} bus routes seeded for districtId=${districtId}`);

    const total = await prisma.busTimetable.count({ where: { districtId } });
    console.log(`📊 Total bus routes now: ${total}`);
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
