-- ============================================
-- 🔍 DIAGNOSE POS SEARCH ISSUES
-- ============================================
-- Run this to check why search isn't working
-- ============================================

-- 1️⃣ CHECK IF TABLES EXIST
SELECT '1️⃣ CHECKING TABLES...' as step;
SELECT table_name, 
       CASE 
         WHEN table_name IN ('products', 'product_variants', 'event_ledger') THEN '✅ EXISTS'
         ELSE '❌ MISSING'
       END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('products', 'product_variants', 'event_ledger');

-- 2️⃣ COUNT PRODUCTS
SELECT '2️⃣ COUNTING PRODUCTS...' as step;
SELECT 
  'products' as table_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ HAS DATA'
    ELSE '❌ EMPTY'
  END as status
FROM products
UNION ALL
SELECT 
  'product_variants' as table_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ HAS DATA'
    ELSE '❌ EMPTY'
  END as status
FROM product_variants
UNION ALL
SELECT 
  'event_ledger' as table_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ HAS DATA'
    ELSE '❌ EMPTY'
  END as status
FROM event_ledger;

-- 3️⃣ CHECK ACTIVE PRODUCTS
SELECT '3️⃣ CHECKING ACTIVE PRODUCTS...' as step;
SELECT 
  COUNT(*) as total_variants,
  COUNT(*) FILTER (WHERE is_active = true) as active_variants,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_variants
FROM product_variants;

-- 4️⃣ CHECK IF FUNCTION EXISTS
SELECT '4️⃣ CHECKING STOCK FUNCTION...' as step;
SELECT 
  routine_name,
  '✅ EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'get_variant_stock';

-- 5️⃣ SAMPLE PRODUCTS (First 5)
SELECT '5️⃣ SAMPLE PRODUCTS...' as step;
SELECT 
  p.product_name,
  p.product_code,
  pv.barcode,
  pv.size,
  pv.color,
  pv.selling_price,
  pv.is_active
FROM products p
JOIN product_variants pv ON pv.product_id = p.id
LIMIT 5;

-- 6️⃣ CHECK STOCK LEVELS
SELECT '6️⃣ CHECKING STOCK LEVELS...' as step;
SELECT 
  p.product_code,
  pv.barcode,
  COALESCE(SUM(el.quantity), 0) as stock
FROM products p
JOIN product_variants pv ON pv.product_id = p.id
LEFT JOIN event_ledger el ON el.variant_id = pv.id
GROUP BY p.id, p.product_code, pv.barcode
LIMIT 10;

-- 7️⃣ CHECK RLS POLICIES
SELECT '7️⃣ CHECKING RLS POLICIES...' as step;
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command,
  CASE 
    WHEN policyname IS NOT NULL THEN '✅ HAS POLICY'
    ELSE '❌ NO POLICY'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('products', 'product_variants', 'event_ledger')
ORDER BY tablename, policyname;

-- ============================================
-- 🎯 DIAGNOSIS COMPLETE!
-- ============================================
-- Check the results above to find the issue
-- ============================================

SELECT '
========================================
🎯 DIAGNOSIS COMPLETE!
========================================

WHAT TO CHECK:

1️⃣ All 3 tables should exist
2️⃣ All 3 tables should have data
3️⃣ product_variants should have is_active = true
4️⃣ get_variant_stock function should exist
5️⃣ Sample products should be listed
6️⃣ Stock levels should be > 0
7️⃣ RLS policies should exist for SELECT

========================================
' as diagnosis_complete;