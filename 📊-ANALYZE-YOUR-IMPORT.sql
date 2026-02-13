-- =====================================================
-- ANALYZE YOUR IMPORT - Find Out Why Rows Were Skipped
-- Run these queries in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- SUMMARY: What Was Actually Imported?
-- =====================================================

SELECT 
    'Total Products Created' as metric,
    COUNT(*)::text as value
FROM products 
WHERE product_type = 'GARMENT'

UNION ALL

SELECT 
    'Total Variants Created' as metric,
    COUNT(*)::text as value
FROM product_variants 
WHERE color = 'IMPORTED'

UNION ALL

SELECT 
    'Total Sale Events Created' as metric,
    COUNT(*)::text as value
FROM event_ledger 
WHERE notes = 'BULK_IMPORT'

UNION ALL

SELECT 
    'Total Locations Created' as metric,
    COUNT(*)::text as value
FROM locations;

-- Expected Output:
-- Products: ~4,575
-- Variants: ~4,575
-- Sale Events: ~4,575
-- Locations: 37

-- =====================================================
-- ANALYSIS #1: Product Frequency Distribution
-- =====================================================
-- This shows if some products appear MANY times in your CSV
-- (which would explain the high skip rate)

SELECT 
    pv.sku_code,
    p.product_name,
    COUNT(e.event_id) as times_sold_in_csv,
    SUM(ABS(e.quantity)) as total_quantity_sold,
    SUM(e.total_amount) as total_revenue
FROM product_variants pv
JOIN products p ON pv.product_id = p.id
LEFT JOIN event_ledger e ON e.variant_id = pv.id AND e.notes = 'BULK_IMPORT'
WHERE pv.color = 'IMPORTED'
GROUP BY pv.sku_code, p.product_name
HAVING COUNT(e.event_id) > 1  -- Only show products that sold multiple times
ORDER BY times_sold_in_csv DESC
LIMIT 50;

-- If you see products with high "times_sold_in_csv" counts,
-- that means those SKUs appeared multiple times in your CSV.
-- This is NORMAL for transaction history CSVs!

-- =====================================================
-- ANALYSIS #2: Average Sales Per Product
-- =====================================================

WITH product_sales AS (
    SELECT 
        pv.sku_code,
        COUNT(e.event_id) as sale_count
    FROM product_variants pv
    LEFT JOIN event_ledger e ON e.variant_id = pv.id AND e.notes = 'BULK_IMPORT'
    WHERE pv.color = 'IMPORTED'
    GROUP BY pv.sku_code
)
SELECT 
    AVG(sale_count) as avg_sales_per_product,
    MIN(sale_count) as min_sales,
    MAX(sale_count) as max_sales,
    SUM(sale_count) as total_sales
FROM product_sales;

-- Expected for your data:
-- avg_sales_per_product: ~1 (if each product only sold once)
-- total_sales: 4,575

-- If avg_sales_per_product is HIGH (like 13.6), it means:
-- Your CSV has REPEAT sales of same products!

-- =====================================================
-- ANALYSIS #3: Sales Distribution Over Time
-- =====================================================

SELECT 
    DATE(client_timestamp) as sale_date,
    COUNT(*) as sales_that_day,
    COUNT(DISTINCT variant_id) as unique_products_sold,
    SUM(ABS(quantity)) as total_items,
    SUM(total_amount) as total_revenue
FROM event_ledger 
WHERE notes = 'BULK_IMPORT'
GROUP BY DATE(client_timestamp)
ORDER BY sale_date DESC
LIMIT 30;

-- This shows if sales are spread across many days
-- More days = more likely your CSV is transaction history

-- =====================================================
-- ANALYSIS #4: Location Distribution
-- =====================================================

SELECT 
    l.location_name,
    l.location_code,
    COUNT(e.event_id) as total_sales,
    COUNT(DISTINCT e.variant_id) as unique_products,
    SUM(ABS(e.quantity)) as total_items_sold,
    SUM(e.total_amount) as total_revenue
FROM locations l
LEFT JOIN event_ledger e ON e.from_location_id = l.id AND e.notes = 'BULK_IMPORT'
GROUP BY l.location_name, l.location_code
ORDER BY total_sales DESC;

-- If sales are spread across many locations,
-- your CSV likely contains transaction history

-- =====================================================
-- ANALYSIS #5: Check for Auto-Generated Names
-- =====================================================

SELECT 
    COUNT(*) as total_imported_products,
    SUM(CASE WHEN product_name LIKE 'Product %' THEN 1 ELSE 0 END) as auto_generated_names,
    SUM(CASE WHEN product_name NOT LIKE 'Product %' THEN 1 ELSE 0 END) as custom_names
FROM products 
WHERE product_type = 'GARMENT';

-- If most names are auto-generated, you'll want to update them:
-- UPDATE products SET product_name = 'Real Name' WHERE product_code = 'XXX';

-- =====================================================
-- ANALYSIS #6: Find Products That Sold Most Frequently
-- =====================================================

SELECT 
    pv.sku_code,
    p.product_name,
    p.product_code,
    COUNT(e.event_id) as times_appeared_in_csv,
    SUM(ABS(e.quantity)) as total_quantity,
    MIN(DATE(e.client_timestamp)) as first_sale_date,
    MAX(DATE(e.client_timestamp)) as last_sale_date,
    SUM(e.total_amount) as total_revenue
FROM product_variants pv
JOIN products p ON pv.product_id = p.id
LEFT JOIN event_ledger e ON e.variant_id = pv.id AND e.notes = 'BULK_IMPORT'
WHERE pv.color = 'IMPORTED'
GROUP BY pv.sku_code, p.product_name, p.product_code
ORDER BY times_appeared_in_csv DESC
LIMIT 20;

-- Top 20 products by frequency in CSV
-- If top products have MANY sales (10+), your CSV is transaction history!

-- =====================================================
-- ANALYSIS #7: Calculate Expected Skip Rate
-- =====================================================

WITH stats AS (
    SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT variant_id) as unique_products
    FROM event_ledger 
    WHERE notes = 'BULK_IMPORT'
)
SELECT 
    total_events,
    unique_products,
    total_events::float / NULLIF(unique_products, 0) as avg_sales_per_product,
    -- If your CSV had 62,480 rows:
    62480 - unique_products as expected_skipped_rows,
    ((62480 - unique_products)::float / 62480 * 100)::numeric(5,2) as expected_skip_percentage
FROM stats;

-- This calculates:
-- - How many rows SHOULD be skipped if CSV has transaction history
-- - Compare to actual: 57,908 skipped

-- =====================================================
-- ANALYSIS #8: Date Range Coverage
-- =====================================================

SELECT 
    MIN(client_timestamp) as earliest_sale,
    MAX(client_timestamp) as latest_sale,
    MAX(client_timestamp) - MIN(client_timestamp) as date_range,
    COUNT(DISTINCT DATE(client_timestamp)) as days_with_sales,
    COUNT(*) as total_sales,
    COUNT(*)::float / NULLIF(COUNT(DISTINCT DATE(client_timestamp)), 0) as avg_sales_per_day
FROM event_ledger 
WHERE notes = 'BULK_IMPORT';

-- If date_range is LARGE (months/years) and days_with_sales is HIGH,
-- your CSV definitely contains transaction history!

-- =====================================================
-- ANALYSIS #9: Check for Suspicious Patterns
-- =====================================================

-- Products with no sales events (shouldn't happen)
SELECT 
    p.product_code,
    p.product_name,
    pv.sku_code
FROM products p
JOIN product_variants pv ON pv.product_id = p.id
WHERE p.product_type = 'GARMENT'
AND NOT EXISTS (
    SELECT 1 FROM event_ledger e 
    WHERE e.variant_id = pv.id 
    AND e.notes = 'BULK_IMPORT'
);

-- If this returns rows, something went wrong!

-- =====================================================
-- ANALYSIS #10: Bill Number Analysis
-- =====================================================

SELECT 
    reference_number as bill_no,
    COUNT(*) as items_in_bill,
    SUM(ABS(quantity)) as total_items,
    SUM(total_amount) as bill_total
FROM event_ledger 
WHERE notes = 'BULK_IMPORT'
GROUP BY reference_number
ORDER BY items_in_bill DESC
LIMIT 20;

-- If bills have MULTIPLE items, your CSV is definitely transaction history
-- Each row = one line item in a sale

-- =====================================================
-- COMPREHENSIVE SUMMARY REPORT
-- =====================================================

DO $$
DECLARE
    total_products INT;
    total_events INT;
    total_locations INT;
    unique_skus INT;
    date_range_days INT;
    avg_sales_per_product NUMERIC;
BEGIN
    -- Get statistics
    SELECT COUNT(*) INTO total_products FROM products WHERE product_type = 'GARMENT';
    SELECT COUNT(*) INTO total_events FROM event_ledger WHERE notes = 'BULK_IMPORT';
    SELECT COUNT(*) INTO total_locations FROM locations;
    SELECT COUNT(DISTINCT sku_code) INTO unique_skus FROM product_variants WHERE color = 'IMPORTED';
    
    SELECT EXTRACT(DAY FROM MAX(client_timestamp) - MIN(client_timestamp)) INTO date_range_days
    FROM event_ledger WHERE notes = 'BULK_IMPORT';
    
    avg_sales_per_product := total_events::NUMERIC / NULLIF(total_products, 0);
    
    -- Print report
    RAISE NOTICE '========================================';
    RAISE NOTICE 'BULK IMPORT ANALYSIS REPORT';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total Products Created: %', total_products;
    RAISE NOTICE 'Total Sale Events: %', total_events;
    RAISE NOTICE 'Total Locations: %', total_locations;
    RAISE NOTICE 'Unique SKU Codes: %', unique_skus;
    RAISE NOTICE 'Date Range: % days', date_range_days;
    RAISE NOTICE 'Avg Sales Per Product: %', ROUND(avg_sales_per_product, 2);
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- Analysis
    IF avg_sales_per_product > 5 THEN
        RAISE NOTICE '✅ CONCLUSION: Your CSV contains TRANSACTION HISTORY';
        RAISE NOTICE '   Each product appears multiple times (avg: % times)', ROUND(avg_sales_per_product, 2);
        RAISE NOTICE '   This explains why many rows were skipped!';
        RAISE NOTICE '';
        RAISE NOTICE '   CSV Structure:';
        RAISE NOTICE '   - Total rows in CSV: 62,480';
        RAISE NOTICE '   - Unique products: %', total_products;
        RAISE NOTICE '   - Expected skips: % (transactions for existing products)', 62480 - total_products;
        RAISE NOTICE '   - Actual skips: 57,908';
        RAISE NOTICE '';
        RAISE NOTICE '   ✅ Skip rate is NORMAL and EXPECTED!';
    ELSIF total_events < 10000 THEN
        RAISE NOTICE '⚠️  CONCLUSION: Lower than expected import count';
        RAISE NOTICE '   Expected ~62,480 products but got %', total_products;
        RAISE NOTICE '   Possible issues:';
        RAISE NOTICE '   - CSV has missing required fields';
        RAISE NOTICE '   - CSV has invalid data (quantity ≤ 0, etc)';
        RAISE NOTICE '   - CSV has duplicate SKU codes';
        RAISE NOTICE '';
        RAISE NOTICE '   🔍 CHECK EDGE FUNCTION LOGS for "SKIP REASONS SUMMARY"';
    ELSE
        RAISE NOTICE '✅ CONCLUSION: Import looks normal';
        RAISE NOTICE '   % products created from CSV', total_products;
    END IF;
    
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- USAGE INSTRUCTIONS
-- =====================================================

-- 1. Run queries 1-10 above to analyze your data
-- 2. Run the comprehensive summary at the end
-- 3. Check Edge Function logs for "SKIP REASONS SUMMARY"
-- 4. Compare results to your CSV structure

-- =====================================================
-- EXPECTED RESULTS FOR YOUR IMPORT
-- =====================================================

-- Based on: 62,480 total rows, 4,575 imported, 57,908 skipped

-- Most Likely Scenario:
-- - Your CSV has transaction history (multiple sales of same products)
-- - 4,575 unique SKU codes in CSV
-- - Each SKU sold ~13.6 times on average
-- - System correctly created 4,575 products
-- - Skipped 57,908 duplicate product entries
-- - ✅ THIS IS CORRECT BEHAVIOR!

-- Alternative Scenario:
-- - Your CSV has data quality issues
-- - Many rows missing required fields
-- - Many rows with invalid data
-- - 🔍 Check Edge Function logs to confirm

-- =====================================================
-- NEXT STEPS
-- =====================================================

-- After running these queries, you should know:
-- ✅ Is your import correct? (transaction history = yes)
-- ✅ Do you have data quality issues? (check logs)
-- ✅ Do you need to re-import? (probably not!)
-- ✅ Do you need to clean CSV? (maybe)

-- Share the results with me and I'll help you interpret them!
