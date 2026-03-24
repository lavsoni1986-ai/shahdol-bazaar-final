-- Script to add updatedAt column to existing tables before db push
-- Run this manually in your database (pgAdmin, psql, etc.)

-- Add updatedAt to Vendor table
ALTER TABLE "Vendor" ADD COLUMN "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to Doctor table (mapped to Doctors)
ALTER TABLE "Doctors" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to Hospital table (mapped to Hospitals)
ALTER TABLE "Hospitals" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to Inquiry table (if exists and missing)
ALTER TABLE "Inquiry" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to Offer table (if exists and missing)
ALTER TABLE "Offer" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to Product table (if exists and missing)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to Lead table (if exists and missing)
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to ShopAppointment table (if exists and missing)
ALTER TABLE "ShopAppointment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to Appointment table (mapped to ShopAppointment)
ALTER TABLE "ShopAppointment" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to Category table (if exists and missing)
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to Admin table (if exists and missing)
ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to User table (if exists and missing)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to Banner table (if exists and missing)
ALTER TABLE "Banner" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to ProductImage table (if exists and missing)
ALTER TABLE "ProductImage" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to SchoolInquiry table (if exists and missing)
ALTER TABLE "SchoolInquiry" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to BusTimetable table (if exists and missing)
ALTER TABLE "BusTimetable" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to Doctors table (legacy, if exists and missing)
ALTER TABLE "Doctors" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to Hospitals table (legacy, if exists and missing)
ALTER TABLE "Hospitals" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to Products table (legacy, if exists and missing)
ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to SchoolCourses table (legacy, if exists and missing)
ALTER TABLE "SchoolCourses" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to SchoolInquiries table (legacy, if exists and missing)
ALTER TABLE "SchoolInquiries" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to Schools table (legacy, if exists and missing)
ALTER TABLE "Schools" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Add updatedAt to Metric table (if exists and missing)
ALTER TABLE "Metric" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

SELECT 'updatedAt columns added successfully!' as status;

-- ============================================
-- ADDITIONAL TABLES FOR NEW MODELS
-- ============================================

-- Add HospitalAppointments table (for Appointment model)
-- This creates a new table if it doesn't exist
CREATE TABLE IF NOT EXISTS "HospitalAppointments" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    "patientName" TEXT NOT NULL,
    "patientPhone" TEXT NOT NULL,
    "patientEmail" TEXT,
    "appointmentDate" TIMESTAMP NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "hospitalId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
