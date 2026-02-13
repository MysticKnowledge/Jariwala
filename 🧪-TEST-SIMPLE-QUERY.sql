-- ============================================
-- 🧪 SIMPLE TEST QUERY
-- ============================================
-- Tests the exact query that POS uses
-- ============================================

-- Test 1: Get one product variant with all columns
SELECT 
  pv.id,
  pv.size,
  pv.color,
  pv.barcode,
  pv.mrp,
  pv.selling_price,
  pv.cost_price,
  pv.is_active,
  p.id as product_id,
  p.product_code,
  p.product_name,
  p.is_active as product_active
FROM product_variants pv
JOIN products p ON p.id = pv.product_id
WHERE pv.is_active = true
  AND p.is_active = true
LIMIT 1;

-- Test 2: Check if cost_price column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'product_variants'
  AND column_name LIKE '%price%'
ORDER BY column_name;

-- Test 3: Try to find ANY variant
SELECT COUNT(*) as total_variants,
       COUNT(CASE WHEN is_active = true THEN 1 END) as active_variants
FROM product_variants;

-- Test 4: Try to find products with variants (like POS search does)
SELECT 
  p.id,
  p.product_code,
  p.product_name,
  COUNT(pv.id) as variant_count
FROM products p
LEFT JOIN product_variants pv ON pv.product_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.product_code, p.product_name
LIMIT 5;
