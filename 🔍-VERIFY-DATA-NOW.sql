-- =====================================================
-- VERIFY BULK IMPORT SUCCESS
-- Run these queries in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. CHECK EVENTS IMPORTED
-- =====================================================
SELECT COUNT(*) as total_events
FROM event_ledger 
WHERE notes = 'BULK_IMPORT';
-- Expected: 4,575

-- =====================================================
-- 2. CHECK PRODUCTS CREATED
-- =====================================================
SELECT COUNT(*) as total_products
FROM products 
WHERE product_type = 'GARMENT';

-- =====================================================
-- 3. CHECK VARIANTS CREATED
-- =====================================================
SELECT COUNT(*) as total_variants
FROM product_variants 
WHERE color = 'IMPORTED';

-- =====================================================
-- 4. VIEW RECENT IMPORTED SALES
-- =====================================================
SELECT 
    e.event_id,
    e.event_type,
    e.quantity,
    e.unit_selling_price,
    e.total_amount,
    e.client_timestamp,
    e.from_location_id,
    p.name as product_name,
    p.product_code,
    pv.sku,
    pv.size
FROM event_ledger e
LEFT JOIN product_variants pv ON e.variant_id = pv.variant_id
LEFT JOIN products p ON pv.product_id = p.product_id
WHERE e.notes = 'BULK_IMPORT'
ORDER BY e.client_timestamp DESC
LIMIT 20;

-- =====================================================
-- 5. CHECK SALES SUMMARY VIEW
-- =====================================================
SELECT * FROM sales_summary_view 
ORDER BY sale_date DESC 
LIMIT 10;

-- =====================================================
-- 6. REFRESH AND CHECK STOCK VIEW
-- =====================================================
REFRESH MATERIALIZED VIEW current_stock_view;

SELECT 
    product_name,
    product_code,
    sku,
    size,
    total_stock,
    total_value
FROM current_stock_view 
WHERE total_stock > 0
ORDER BY total_stock DESC
LIMIT 20;

-- =====================================================
-- 7. CHECK IMPORTED PRODUCTS DETAILS
-- =====================================================
SELECT 
    p.product_id,
    p.product_code,
    p.name,
    p.product_type,
    p.brand,
    p.category,
    p.created_at,
    pv.variant_id,
    pv.sku,
    pv.color,
    pv.size
FROM products p
LEFT JOIN product_variants pv ON p.product_id = pv.product_id
WHERE p.product_type = 'GARMENT'
ORDER BY p.created_at DESC
LIMIT 50;

-- =====================================================
-- 8. CHECK LOCATIONS CREATED
-- =====================================================
SELECT 
    location_id,
    location_name,
    location_type,
    is_active,
    created_at
FROM locations
ORDER BY location_name;
-- Should show Location1 through Location37

-- =====================================================
-- 9. SALES BY LOCATION
-- =====================================================
SELECT 
    l.location_name,
    COUNT(*) as total_sales,
    SUM(e.quantity) as total_items_sold,
    SUM(e.total_amount) as total_revenue
FROM event_ledger e
JOIN locations l ON e.from_location_id = l.location_id
WHERE e.notes = 'BULK_IMPORT' AND e.event_type = 'SALE'
GROUP BY l.location_name
ORDER BY total_revenue DESC;

-- =====================================================
-- 10. SALES BY DATE
-- =====================================================
SELECT 
    DATE(e.client_timestamp) as sale_date,
    COUNT(*) as total_sales,
    SUM(e.quantity) as total_items_sold,
    SUM(e.total_amount) as total_revenue
FROM event_ledger e
WHERE e.notes = 'BULK_IMPORT' AND e.event_type = 'SALE'
GROUP BY DATE(e.client_timestamp)
ORDER BY sale_date DESC
LIMIT 30;

-- =====================================================
-- 11. TOP 20 PRODUCTS BY SALES
-- =====================================================
SELECT 
    p.product_code,
    p.name,
    COUNT(*) as times_sold,
    SUM(e.quantity) as total_quantity_sold,
    SUM(e.total_amount) as total_revenue
FROM event_ledger e
JOIN product_variants pv ON e.variant_id = pv.variant_id
JOIN products p ON pv.product_id = p.product_id
WHERE e.notes = 'BULK_IMPORT' AND e.event_type = 'SALE'
GROUP BY p.product_id, p.product_code, p.name
ORDER BY total_revenue DESC
LIMIT 20;

-- =====================================================
-- 12. CHECK FOR AUTO-GENERATED NAMES (NEEDS UPDATE)
-- =====================================================
SELECT COUNT(*) as products_with_auto_names
FROM products 
WHERE name LIKE 'AUTO_%';

-- If count > 0, you'll want to update product names:
-- UPDATE products SET name = 'Real Name' WHERE product_code = 'XXX';

-- =====================================================
-- 13. SUMMARY STATISTICS
-- =====================================================
SELECT 
    'Total Events' as metric,
    COUNT(*)::text as value
FROM event_ledger 
WHERE notes = 'BULK_IMPORT'

UNION ALL

SELECT 
    'Total Products' as metric,
    COUNT(*)::text as value
FROM products 
WHERE product_type = 'GARMENT'

UNION ALL

SELECT 
    'Total Variants' as metric,
    COUNT(*)::text as value
FROM product_variants 
WHERE color = 'IMPORTED'

UNION ALL

SELECT 
    'Total Locations' as metric,
    COUNT(*)::text as value
FROM locations

UNION ALL

SELECT 
    'Total Revenue' as metric,
    COALESCE(SUM(total_amount), 0)::text as value
FROM event_ledger 
WHERE notes = 'BULK_IMPORT' AND event_type = 'SALE'

UNION ALL

SELECT 
    'Total Items Sold' as metric,
    COALESCE(SUM(quantity), 0)::text as value
FROM event_ledger 
WHERE notes = 'BULK_IMPORT' AND event_type = 'SALE';

-- =====================================================
-- 14. DATE RANGE OF IMPORTED DATA
-- =====================================================
SELECT 
    MIN(client_timestamp) as earliest_sale,
    MAX(client_timestamp) as latest_sale,
    MAX(client_timestamp) - MIN(client_timestamp) as date_range
FROM event_ledger 
WHERE notes = 'BULK_IMPORT' AND event_type = 'SALE';

-- =====================================================
-- 15. AVERAGE SALE VALUES
-- =====================================================
SELECT 
    AVG(total_amount) as avg_sale_value,
    MIN(total_amount) as min_sale_value,
    MAX(total_amount) as max_sale_value,
    AVG(quantity) as avg_quantity_per_sale
FROM event_ledger 
WHERE notes = 'BULK_IMPORT' AND event_type = 'SALE';

-- =====================================================
-- SUCCESS INDICATORS
-- =====================================================
-- ✅ Query 1 should return 4,575
-- ✅ Query 2 should return ~4,575 products
-- ✅ Query 3 should return ~4,575 variants
-- ✅ Query 4 should show sales data
-- ✅ Query 5 should show daily summaries
-- ✅ Query 6 should show stock levels
-- ✅ Query 8 should show 37 locations
-- ✅ Query 13 should show all summary stats

-- =====================================================
-- NEXT: Update product names if needed
-- =====================================================
-- Example:
-- UPDATE products 
-- SET 
--     name = 'Cotton T-Shirt Blue',
--     description = 'Premium cotton t-shirt in navy blue',
--     brand = 'YourBrand',
--     category = 'Shirts'
-- WHERE product_code = 'ABC001';
