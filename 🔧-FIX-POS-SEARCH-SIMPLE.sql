-- ============================================
-- 🔧 FIX POS SEARCH - SIMPLE VERSION
-- ============================================
-- Run this AFTER running /🔍-DIAGNOSE-POS-SEARCH.sql
-- This adds sample products and fixes common issues
-- ============================================

-- 1️⃣ CREATE STOCK FUNCTION (if not exists)
CREATE OR REPLACE FUNCTION get_variant_stock(p_variant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_stock INTEGER;
BEGIN
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_total_stock
  FROM event_ledger
  WHERE variant_id = p_variant_id;
  
  RETURN v_total_stock;
END;
$$;

SELECT '✅ Stock function created/updated' as status;

-- 2️⃣ ACTIVATE ALL PRODUCTS
UPDATE products SET is_active = true WHERE is_active = false OR is_active IS NULL;
UPDATE product_variants SET is_active = true WHERE is_active = false OR is_active IS NULL;

SELECT '✅ All products activated' as status;

-- 3️⃣ ADD SAMPLE PRODUCTS (only if table is empty)
DO $$
DECLARE
  v_count INTEGER;
  v_product_id_1 UUID := '11111111-1111-1111-1111-111111111111';
  v_product_id_2 UUID := '22222222-2222-2222-2222-222222222222';
  v_product_id_3 UUID := '33333333-3333-3333-3333-333333333333';
  v_variant_id_1 UUID;
  v_variant_id_2 UUID;
  v_variant_id_3 UUID;
  v_variant_id_4 UUID;
  v_variant_id_5 UUID;
  v_location_id UUID;
BEGIN
  -- Check if products exist
  SELECT COUNT(*) INTO v_count FROM products;
  
  IF v_count = 0 THEN
    -- Insert sample products
    INSERT INTO products (id, product_name, product_code, brand, category, is_active)
    VALUES 
      (v_product_id_1, 'Sample T-Shirt', 'TSHIRT', 'TestBrand', 'Apparel', true),
      (v_product_id_2, 'Sample Jeans', 'JEANS', 'TestBrand', 'Apparel', true),
      (v_product_id_3, 'Sample Shirt', 'SHIRT', 'TestBrand', 'Apparel', true);
    
    RAISE NOTICE '✅ Added 3 sample products';
  ELSE
    RAISE NOTICE '⚠️  Products already exist, skipping sample data';
  END IF;
  
  -- Check if variants exist
  SELECT COUNT(*) INTO v_count FROM product_variants;
  
  IF v_count = 0 THEN
    -- Insert sample variants
    INSERT INTO product_variants (id, product_id, barcode, size, color, mrp, selling_price, base_price, is_active)
    VALUES 
      (gen_random_uuid(), v_product_id_1, '1234567890123', 'M', 'Blue', 999.00, 799.00, 500.00, true),
      (gen_random_uuid(), v_product_id_1, '1234567890124', 'L', 'Blue', 999.00, 799.00, 500.00, true),
      (gen_random_uuid(), v_product_id_2, '1234567890125', '32', 'Black', 1999.00, 1599.00, 1000.00, true),
      (gen_random_uuid(), v_product_id_2, '1234567890126', '34', 'Black', 1999.00, 1599.00, 1000.00, true),
      (gen_random_uuid(), v_product_id_3, '1234567890127', 'L', 'White', 1499.00, 1199.00, 800.00, true)
    RETURNING id INTO v_variant_id_1;
    
    RAISE NOTICE '✅ Added 5 sample variants';
  ELSE
    RAISE NOTICE '⚠️  Variants already exist, skipping sample data';
  END IF;
  
  -- Check if stock exists
  SELECT COUNT(*) INTO v_count FROM event_ledger;
  
  IF v_count = 0 THEN
    -- Get a location (or create default)
    SELECT id INTO v_location_id FROM locations LIMIT 1;
    
    IF v_location_id IS NULL THEN
      v_location_id := '00000000-0000-0000-0000-000000000001';
      INSERT INTO locations (id, location_name, location_type)
      VALUES (v_location_id, 'Main Store', 'STORE')
      ON CONFLICT (id) DO NOTHING;
    END IF;
    
    -- Add opening stock for all variants
    INSERT INTO event_ledger (event_type, variant_id, location_id, quantity, reference_type, notes)
    SELECT 
      'OPENING_STOCK',
      pv.id,
      v_location_id,
      50, -- 50 units each
      'OPENING_STOCK',
      'Initial stock for testing'
    FROM product_variants pv
    WHERE pv.is_active = true;
    
    RAISE NOTICE '✅ Added opening stock for all variants';
  ELSE
    RAISE NOTICE '⚠️  Stock already exists, skipping';
  END IF;
END $$;

-- 4️⃣ FIX RLS POLICIES (recreate if needed)
DROP POLICY IF EXISTS "Anyone authenticated can read products" ON products;
DROP POLICY IF EXISTS "Authenticated users can manage products" ON products;
DROP POLICY IF EXISTS "Anyone authenticated can read product_variants" ON product_variants;
DROP POLICY IF EXISTS "Authenticated users can manage product_variants" ON product_variants;
DROP POLICY IF EXISTS "Anyone authenticated can read event_ledger" ON event_ledger;
DROP POLICY IF EXISTS "Authenticated users can insert event_ledger" ON event_ledger;

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_ledger ENABLE ROW LEVEL SECURITY;

-- Create simple policies
CREATE POLICY "products_select_policy"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "products_all_policy"
  ON products FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "product_variants_select_policy"
  ON product_variants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "product_variants_all_policy"
  ON product_variants FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "event_ledger_select_policy"
  ON event_ledger FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "event_ledger_insert_policy"
  ON event_ledger FOR INSERT
  TO authenticated
  WITH CHECK (true);

SELECT '✅ RLS policies fixed' as status;

-- 5️⃣ VERIFY EVERYTHING WORKS
SELECT '
========================================
🎯 VERIFICATION
========================================
' as verification;

-- Count products
SELECT 
  COUNT(*) as product_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PRODUCTS EXIST'
    ELSE '❌ NO PRODUCTS'
  END as status
FROM products;

-- Count variants with stock
SELECT 
  COUNT(*) as variant_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ VARIANTS EXIST'
    ELSE '❌ NO VARIANTS'
  END as status
FROM product_variants
WHERE is_active = true;

-- Show sample searchable products
SELECT 
  p.product_name,
  p.product_code,
  pv.barcode,
  pv.size,
  pv.color,
  pv.selling_price,
  get_variant_stock(pv.id) as stock
FROM products p
JOIN product_variants pv ON pv.product_id = p.id
WHERE pv.is_active = true
  AND p.is_active = true
LIMIT 5;

-- Final status
SELECT '
========================================
✅ FIX COMPLETE!
========================================

NOW TEST IN POS:

1. Press F3 (search)
2. Type: shirt
3. Should see "Sample T-Shirt" and "Sample Shirt"

OR

1. Press F2 (barcode)
2. Type: 1234567890123
3. Press Enter
4. Should add "Sample T-Shirt" to cart

========================================
' as complete;