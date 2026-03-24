-- Run this in pgAdmin or psql to get actual table and column names
-- Then use this info to fix schema.prisma

-- Get all table names
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Get columns for Doctor/Doctors table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'Doctor' OR table_name = 'Doctors'
ORDER BY column_name;

-- Get columns for Hospital/Hospitals table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'Hospital' OR table_name = 'Hospitals'
ORDER BY column_name;

-- Get columns for BusTimetable table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'BusTimetable'
ORDER BY column_name;

-- Get row counts for each table
SELECT 'Doctor' as table_name, COUNT(*) as row_count FROM "Doctor"
UNION ALL
SELECT 'Doctors', COUNT(*) FROM "Doctors"
UNION ALL
SELECT 'Hospital', COUNT(*) FROM "Hospital"
UNION ALL
SELECT 'Hospitals', COUNT(*) FROM "Hospitals"
UNION ALL
SELECT 'BusTimetable', COUNT(*) FROM "BusTimetable"
UNION ALL
SELECT 'ShopAppointment', COUNT(*) FROM "ShopAppointment"
UNION ALL
SELECT 'Schools', COUNT(*) FROM "Schools";
