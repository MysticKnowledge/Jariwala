-- ============================================
-- 🎯 CHECK YOUR EXISTING PRODUCTS
-- ============================================
-- Quick diagnostic for 4 lakh+ products
-- ============================================

-- 1️⃣ PRODUCT COUNTS
SELECT '1️⃣ PRODUCT COUNTS' as step;
SELECT 
  'Products' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active = true) as active,
  COUNT(*) FILTER (WHERE is_active = false OR is_active IS NULL) as inactive
FROM products
UNION ALL
SELECT 
  'Product Variants' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE is_active = true) as active,
  COUNT(*) FILTER (WHERE is_active = false OR is_active IS NULL) as inactive
FROM product_variants
UNION ALL
SELECT 
  'Event Ledger' as table_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE quantity > 0) as positive,
  COUNT(*) FILTER (WHERE quantity < 0) as negative
FROM event_ledger;

-- 2️⃣ STOCK SUMMARY
SELECT '2️⃣ STOCK SUMMARY' as step;
SELECT 
  COUNT(DISTINCT variant_id) as variants_with_stock,
  SUM(quantity) FILTER (WHERE quantity > 0) as total_inward,
  SUM(quantity) FILTER (WHERE quantity < 0) as total_outward,
  SUM(quantity) as net_stock
FROM event_ledger;

-- 3️⃣ SAMPLE PRODUCTS (First 5)
SELECT '3️⃣ SAMPLE OF YOUR PRODUCTS' as step;
SELECT 
  p.product_name,
  p.product_code,
  p.is_active as product_active
FROM products p
ORDER BY p.created_at DESC
LIMIT 5;

-- 4️⃣ SAMPLE VARIANTS WITH STOCK
SELECT '4️⃣ SAMPLE VARIANTS + STOCK' as step;
SELECT 
  p.product_name,
  p.product_code,
  pv.barcode,
  pv.size,
  pv.color,
  pv.selling_price,
  get_variant_stock(pv.id) as current_stock
FROM products p
JOIN product_variants pv ON pv.product_id = p.id
WHERE p.is_active = true
  AND pv.is_active = true
LIMIT 5;

-- 5️⃣ VARIANTS WITH STOCK (First 10)
SELECT '5️⃣ VARIANTS WITH STOCK' as step;
SELECT 
  p.product_code,
  p.product_name,
  pv.barcode,
  pv.size,
  pv.color,
  COALESCE(SUM(el.quantity), 0) as stock
FROM products p
JOIN product_variants pv ON pv.product_id = p.id
LEFT JOIN event_ledger el ON el.variant_id = pv.id
WHERE pv.is_active = true AND p.is_active = true
GROUP BY p.id, p.product_code, p.product_name, pv.id, pv.barcode, pv.size, pv.color
HAVING COALESCE(SUM(el.quantity), 0) > 0
ORDER BY stock DESC
LIMIT 10;

-- 6️⃣ TEST SEARCH QUERY
SELECT '6️⃣ TEST SEARCH (checking if search will work)' as step;
SELECT 
  p.product_name,
  p.product_code,
  pv.barcode,
  pv.size,
  pv.color
FROM products p
JOIN product_variants pv ON pv.product_id = p.id
WHERE p.is_active = true 
  AND pv.is_active = true
LIMIT 5;

-- 7️⃣ FUNCTION CHECK
SELECT '7️⃣ CHECKING STOCK FUNCTION' as step;
SELECT 
  routine_name as function_name,
  '✅ EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'get_variant_stock'
UNION ALL
SELECT 
  'get_variant_stock' as function_name,
  '❌ MISSING - RUN /🔥-FIX-EXISTING-PRODUCTS.sql' as status
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.routines
  WHERE routine_schema = 'public' 
    AND routine_name = 'get_variant_stock'
);

-- 8️⃣ FINAL STATUS
SELECT '
========================================
🎯 DIAGNOSIS COMPLETE!
========================================

WHAT TO CHECK:

✅ You should see 4+ lakh products
✅ Most should be is_active = true
✅ Event ledger should have stock entries
✅ get_variant_stock function should exist

IF FUNCTION IS MISSING:
→ Run /🔥-FIX-EXISTING-PRODUCTS.sql

IF PRODUCTS ARE INACTIVE:
→ Run /🔥-FIX-EXISTING-PRODUCTS.sql

THEN TEST SEARCH:
1. Copy a product_code from results above
2. Go to POS
3. Press F3
4. Type that product_code
5. Should see results!

========================================
' as diagnosis;