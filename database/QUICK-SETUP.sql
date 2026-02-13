-- =====================================================
-- 🚀 QUICK DATABASE SETUP - RUN THIS IN SUPABASE SQL EDITOR
-- =====================================================
-- Copy this entire file and run it in Supabase Dashboard → SQL Editor
-- This will create all tables, views, and seed data in one go!
-- =====================================================

-- STEP 1: Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PASTE CONTENTS OF /database/01-create-tables.sql HERE
-- =====================================================
-- Go to /database/01-create-tables.sql, copy entire file, paste here


-- =====================================================
-- PASTE CONTENTS OF /database/02-create-views.sql HERE
-- =====================================================
-- Go to /database/02-create-views.sql, copy entire file, paste here


-- =====================================================
-- PASTE CONTENTS OF /database/03-seed-data.sql HERE
-- =====================================================
-- Go to /database/03-seed-data.sql, copy entire file, paste here


-- =====================================================
-- ✅ VERIFICATION QUERIES
-- =====================================================

-- Check that all tables were created
SELECT 
    schemaname,
    tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check row counts in key tables
SELECT 
    'roles' as table_name, COUNT(*) as row_count FROM roles
UNION ALL
SELECT 'locations', COUNT(*) FROM locations
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'product_variants', COUNT(*) FROM product_variants
UNION ALL
SELECT 'event_ledger', COUNT(*) FROM event_ledger;

-- Expected output:
-- roles: 5 rows (OWNER, MANAGER, STORE_STAFF, GODOWN_STAFF, ACCOUNTANT)
-- locations: 2+ rows
-- products: 5+ rows
-- product_variants: 10+ rows
-- event_ledger: 0 rows (will populate after import)

-- =====================================================
-- 🎉 DATABASE SETUP COMPLETE!
-- =====================================================
-- Now go back to your Figma Make app and try the bulk import again!
-- =====================================================
