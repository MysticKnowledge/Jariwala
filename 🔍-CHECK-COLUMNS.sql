-- ============================================
-- 🔍 CHECK YOUR ACTUAL TABLE COLUMNS
-- ============================================

-- Check product_variants columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'product_variants'
ORDER BY ordinal_position;

-- Check products columns
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;
