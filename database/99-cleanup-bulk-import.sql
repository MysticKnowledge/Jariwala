-- =====================================================
-- CLEANUP BULK IMPORT DATA
-- Removes all data created during bulk import attempts
-- =====================================================

-- This script will DELETE:
-- 1. All sale events with notes = 'BULK_IMPORT'
-- 2. All product variants with color = 'IMPORTED'
-- 3. All products with product_type = 'GARMENT' (auto-created)
-- 4. All auto-created locations (optional - commented out by default)

-- ⚠️ WARNING: This will permanently delete data!
-- Only run this if you want to start fresh with bulk import.

BEGIN;

-- =====================================================
-- STEP 1: Delete Sale Events from Bulk Import
-- =====================================================

DELETE FROM event_ledger
WHERE notes = 'BULK_IMPORT';

-- Show count
SELECT 
    'Sale events deleted' AS action,
    COUNT(*) AS remaining_events
FROM event_ledger
WHERE event_type = 'SALE';

-- =====================================================
-- STEP 2: Delete Product Variants (Auto-Created)
-- =====================================================

DELETE FROM product_variants
WHERE color = 'IMPORTED';

-- Show count
SELECT 
    'Product variants deleted' AS action,
    COUNT(*) AS remaining_variants
FROM product_variants;

-- =====================================================
-- STEP 3: Delete Products (Auto-Created)
-- =====================================================

-- Delete products that have no variants left
-- (variants were cascade-deleted or manually deleted above)
DELETE FROM products
WHERE product_type = 'GARMENT'
AND id NOT IN (
    SELECT DISTINCT product_id 
    FROM product_variants
);

-- Show count
SELECT 
    'Products deleted' AS action,
    COUNT(*) AS remaining_products
FROM products;

-- =====================================================
-- STEP 4: Delete Auto-Created Locations (OPTIONAL)
-- =====================================================

-- ⚠️ UNCOMMENT ONLY if you want to delete auto-created locations
-- This will delete locations like "Location ABC", "Location XYZ", etc.

-- DELETE FROM locations
-- WHERE location_name LIKE 'Location %'
-- AND location_type = 'STORE'
-- AND id NOT IN (
--     -- Keep locations that have events referencing them
--     SELECT DISTINCT from_location_id FROM event_ledger WHERE from_location_id IS NOT NULL
--     UNION
--     SELECT DISTINCT to_location_id FROM event_ledger WHERE to_location_id IS NOT NULL
-- );

-- Show count
SELECT 
    'Locations (not deleted by default)' AS action,
    COUNT(*) AS remaining_locations
FROM locations;

-- =====================================================
-- STEP 5: Refresh Materialized Views
-- =====================================================

-- Refresh current stock view to reflect deletions
REFRESH MATERIALIZED VIEW current_stock_view;

SELECT 'Current stock view refreshed' AS action;

-- =====================================================
-- SUMMARY
-- =====================================================

SELECT 
    'CLEANUP COMPLETE' AS status,
    (SELECT COUNT(*) FROM event_ledger) AS total_events,
    (SELECT COUNT(*) FROM product_variants) AS total_variants,
    (SELECT COUNT(*) FROM products) AS total_products,
    (SELECT COUNT(*) FROM locations) AS total_locations;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if any bulk import data remains
SELECT 
    'Bulk import events remaining' AS check_type,
    COUNT(*) AS count
FROM event_ledger
WHERE notes = 'BULK_IMPORT';

SELECT 
    'Imported variants remaining' AS check_type,
    COUNT(*) AS count
FROM product_variants
WHERE color = 'IMPORTED';

SELECT 
    'Auto-created products remaining' AS check_type,
    COUNT(*) AS count
FROM products
WHERE product_type = 'GARMENT';

-- Should all return 0 after cleanup
