// Run with: npx tsx scripts/get-db-info.ts
// This will print actual table names and column structures from your database

import "dotenv/config";
import { prisma } from "../server/storage.js";

async function getDatabaseInfo() {
  console.log("=== DATABASE TABLE NAMES ===\n");
  
  // Get all table names
  const tables = await prisma.$queryRaw`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `;
  
  (tables as any[]).forEach((row: any) => {
    console.log(`- ${row.table_name}`);
  });

  console.log("\n=== ROW COUNTS FOR KEY TABLES ===\n");
  
  const keyTables = ['Doctor', 'Doctors', 'Hospital', 'Hospitals', 'BusTimetable', 'ShopAppointment', 'Schools', 'Vendor'];
  
  for (const table of keyTables) {
    try {
      const result = await prisma.$queryRaw`SELECT COUNT(*) as count FROM ${prisma.$queryRaw(table as any)}`;
      console.log(`${table}: ${(result as any[])[0]?.count || 0} rows`);
    } catch (e) {
      console.log(`${table}: table not found`);
    }
  }

  console.log("\n=== COLUMN DETAILS FOR KEY TABLES ===\n");
  
  const tableColumns: Record<string, string[]> = {
    'Doctor': ['id', 'name', 'qualification', 'specialization', 'experience', 'consultationFee', 'timing', 'image', 'hospitalId', 'createdAt', 'updatedAt'],
    'Doctors': ['id', 'hospitalId', 'name', 'specialization', 'experience', 'timing', 'availableDays', 'createdAt'],
    'Hospital': ['id', 'name', 'slug', 'address', 'contactNumber', 'email', 'description', 'images', 'specialties', 'isVerified', 'createdAt', 'updatedAt'],
    'Hospitals': ['id', 'name', 'address', 'contact', 'specialty', 'type'],
    'BusTimetable': ['id', 'from_city', 'to_city', 'first_bus_time', 'last_bus_time', 'fare', 'boarding_point', 'public_note', 'created_at', 'is_active', 'bus_type', 'travel_time', 'operator_name', 'frequency', 'updated_at'],
  };

  for (const [table, columns] of Object.entries(tableColumns)) {
    console.log(`\n${table} columns:`);
    for (const col of columns) {
      try {
        const result = await prisma.$queryRaw`
          SELECT data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = ${table} AND column_name = ${col}
        `;
        const info = (result as any[])[0];
        console.log(`  ${col}: ${info?.data_type} ${info?.is_nullable === 'YES' ? '(nullable)' : '(required)'} ${info?.column_default ? '[default]' : ''}`);
      } catch (e) {
        console.log(`  ${col}: NOT FOUND`);
      }
    }
  }
}

getDatabaseInfo().catch(console.error);
