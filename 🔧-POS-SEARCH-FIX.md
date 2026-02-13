# 🔧 **POS SEARCH FIX - Product Search Not Working**

## ❌ **Problem:**
When typing in the POS search box, no products appear.

---

## ✅ **Solution:**

The search requires the `products` and `product_variants` tables to exist. Here's how to fix it:

### **Step 1: Check if Tables Exist**

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('products', 'product_variants', 'event_ledger');
```

**Expected Result:** Should show all 3 tables

---

### **Step 2: If Tables Don't Exist, Create Them**

Run this SQL to create the product tables:

```sql
-- ============================================
-- PRODUCTS & INVENTORY TABLES
-- ============================================

-- 1. PRODUCTS TABLE (Master product list)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  subcategory TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_name ON products(product_name);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_category ON products(category);

-- 2. PRODUCT_VARIANTS TABLE (Size/Color variations)
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_code TEXT UNIQUE NOT NULL,
  barcode TEXT UNIQUE,
  size TEXT,
  color TEXT,
  mrp NUMERIC(10,2) NOT NULL,
  selling_price NUMERIC(10,2) NOT NULL,
  base_price NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_variants_product ON product_variants(product_id);
CREATE INDEX idx_product_variants_code ON product_variants(product_code);
CREATE INDEX idx_product_variants_barcode ON product_variants(barcode);
CREATE INDEX idx_product_variants_active ON product_variants(is_active);

-- 3. EVENT_LEDGER TABLE (Immutable transaction log)
CREATE TABLE IF NOT EXISTS event_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('PURCHASE', 'SALE', 'RETURN', 'TRANSFER', 'ADJUSTMENT', 'OPENING_STOCK')),
  variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_event_ledger_variant ON event_ledger(variant_id);
CREATE INDEX idx_event_ledger_location ON event_ledger(location_id);
CREATE INDEX idx_event_ledger_type ON event_ledger(event_type);
CREATE INDEX idx_event_ledger_created ON event_ledger(created_at DESC);

-- 4. CREATE STOCK CALCULATION FUNCTION
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

-- 5. ENABLE RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_ledger ENABLE ROW LEVEL SECURITY;

-- 6. CREATE RLS POLICIES (Simple - everyone authenticated can read)
CREATE POLICY "Anyone authenticated can read products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage products"
  ON products FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Anyone authenticated can read product_variants"
  ON product_variants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage product_variants"
  ON product_variants FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Anyone authenticated can read event_ledger"
  ON event_ledger FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert event_ledger"
  ON event_ledger FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 7. INSERT SAMPLE DATA (for testing)
INSERT INTO products (id, product_name, brand, category)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Sample T-Shirt', 'SampleBrand', 'Apparel'),
  ('22222222-2222-2222-2222-222222222222', 'Sample Jeans', 'SampleBrand', 'Apparel')
ON CONFLICT DO NOTHING;

INSERT INTO product_variants (product_id, product_code, barcode, size, color, mrp, selling_price, base_price)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'TSHIRT-001', '1234567890123', 'M', 'Blue', 999.00, 799.00, 500.00),
  ('11111111-1111-1111-1111-111111111111', 'TSHIRT-002', '1234567890124', 'L', 'Blue', 999.00, 799.00, 500.00),
  ('22222222-2222-2222-2222-222222222222', 'JEANS-001', '1234567890125', '32', 'Black', 1999.00, 1599.00, 1000.00)
ON CONFLICT DO NOTHING;

-- Add some opening stock
INSERT INTO event_ledger (event_type, variant_id, location_id, quantity, reference_type, notes)
SELECT 
  'OPENING_STOCK',
  pv.id,
  '00000000-0000-0000-0000-000000000001', -- Main Store
  50, -- 50 units
  'OPENING_STOCK',
  'Initial stock for testing'
FROM product_variants pv
WHERE pv.product_code IN ('TSHIRT-001', 'TSHIRT-002', 'JEANS-001');

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT '✅ Products, variants, and inventory tables created!' as status;
SELECT COUNT(*) as product_count FROM products;
SELECT COUNT(*) as variant_count FROM product_variants;
SELECT variant_id, SUM(quantity) as stock 
FROM event_ledger 
GROUP BY variant_id;
```

---

### **Step 3: Test the Search**

1. Go to POS screen
2. Press **F3** or click in search box
3. Type: **"shirt"** or **"jeans"** or **"TSHIRT"**
4. Should see products appear in dropdown!

---

## 🔍 **How Search Works:**

### **Search Query Logic:**
```javascript
1. User types in search box
2. Waits for 2+ characters
3. Searches in product_variants by:
   - product_code (e.g., "TSHIRT-001")
   - barcode (e.g., "1234567890123")
4. If no results, searches in products by:
   - product_name (e.g., "Sample T-Shirt")
5. Joins with product details
6. Gets current stock for each variant
7. Filters out items with 0 stock
8. Returns up to 20 results
```

### **What Gets Searched:**
- ✅ Product Code (e.g., `TSHIRT-001`)
- ✅ Barcode (e.g., `1234567890123`)
- ✅ Product Name (e.g., `Sample T-Shirt`)

### **What Gets Displayed:**
```
Product Name
Size • Color • Barcode
₹Selling Price    Stock: XX
```

---

## 🐛 **Troubleshooting:**

### **Problem: Still No Results**

**Check Browser Console (F12):**

Look for errors like:
```
Search products error: {...}
Alternative search error: {...}
```

**Common Errors:**

1. **"relation 'products' does not exist"**
   - Solution: Run Step 2 SQL above

2. **"relation 'product_variants' does not exist"**
   - Solution: Run Step 2 SQL above

3. **"function get_variant_stock does not exist"**
   - Solution: Run Step 2 SQL above

4. **"permission denied"**
   - Solution: Check RLS policies are created

5. **Empty array returned**
   - Solution: Add sample products (Step 2 includes samples)

---

### **Problem: Search Works But Shows 0 Stock**

**Check Event Ledger:**

```sql
-- See all stock events
SELECT * FROM event_ledger ORDER BY created_at DESC LIMIT 10;

-- Check stock for specific variant
SELECT get_variant_stock('variant_id_here');

-- See stock summary by variant
SELECT 
  pv.product_code,
  pv.size,
  pv.color,
  SUM(el.quantity) as total_stock
FROM product_variants pv
LEFT JOIN event_ledger el ON el.variant_id = pv.id
GROUP BY pv.id, pv.product_code, pv.size, pv.color;
```

**Add Stock:**

```sql
-- Add opening stock for a variant
INSERT INTO event_ledger (event_type, variant_id, location_id, quantity, reference_type, notes)
VALUES (
  'OPENING_STOCK',
  'your-variant-id-here',
  '00000000-0000-0000-0000-000000000001', -- Main Store
  100, -- Quantity
  'OPENING_STOCK',
  'Manual stock addition'
);
```

---

### **Problem: Products Exist But Not Searchable**

**Check is_active Flag:**

```sql
-- See all products
SELECT 
  p.product_name,
  pv.product_code,
  pv.barcode,
  pv.is_active as variant_active,
  p.is_active as product_active
FROM products p
JOIN product_variants pv ON pv.product_id = p.id;

-- Activate all products
UPDATE products SET is_active = true;
UPDATE product_variants SET is_active = true;
```

---

## 📋 **Quick Verification Checklist:**

- [ ] Tables exist: `products`, `product_variants`, `event_ledger`
- [ ] Function exists: `get_variant_stock`
- [ ] RLS policies created
- [ ] Sample products added
- [ ] Products have `is_active = true`
- [ ] Variants have stock > 0
- [ ] Browser console shows no errors

---

## 🚀 **Import Real Products:**

Once search works with sample data, import your real products:

### **Option 1: Use Legacy PRMAST Importer**
1. Click "Legacy Import" in sidebar
2. Upload your CSV file
3. Map columns
4. Import!

### **Option 2: Bulk CSV Upload**
1. Create CSV with columns:
   ```
   product_name,brand,category,product_code,barcode,size,color,mrp,selling_price,base_price,opening_stock
   ```
2. Use "Bulk Import" feature
3. Upload and import

### **Option 3: Manual SQL Insert**
```sql
-- Insert product
INSERT INTO products (product_name, brand, category)
VALUES ('Your Product', 'Your Brand', 'Your Category')
RETURNING id;

-- Insert variant (use ID from above)
INSERT INTO product_variants (
  product_id, 
  product_code, 
  barcode, 
  size, 
  color, 
  mrp, 
  selling_price, 
  base_price
)
VALUES (
  'product-id-from-above',
  'YOUR-CODE',
  'YOUR-BARCODE',
  'M',
  'Blue',
  999.00,
  799.00,
  500.00
);

-- Add opening stock
INSERT INTO event_ledger (
  event_type, 
  variant_id, 
  location_id, 
  quantity, 
  reference_type
)
VALUES (
  'OPENING_STOCK',
  'variant-id-from-above',
  '00000000-0000-0000-0000-000000000001',
  50,
  'OPENING_STOCK'
);
```

---

## ✅ **Success Indicators:**

When search is working correctly:

1. ✅ Type in search box (2+ characters)
2. ✅ See dropdown appear within 200ms
3. ✅ Products listed with details
4. ✅ Stock numbers shown
5. ✅ Click product → Added to cart
6. ✅ Beep sound plays (if using FinalPOSScreen)

---

## 🎯 **Final Check:**

```sql
-- This query should return products you can search for
SELECT 
  p.product_name,
  pv.product_code,
  pv.barcode,
  pv.size,
  pv.color,
  pv.selling_price,
  get_variant_stock(pv.id) as available_stock
FROM products p
JOIN product_variants pv ON pv.product_id = p.id
WHERE pv.is_active = true
  AND p.is_active = true
  AND get_variant_stock(pv.id) > 0
LIMIT 10;
```

**If this returns rows, your search will work!** ✅

---

## 📞 **Still Not Working?**

1. Check browser console (F12) for errors
2. Check Supabase logs in dashboard
3. Verify you're logged in (session valid)
4. Try refreshing the page
5. Check RLS policies are not blocking access

---

**Once you complete Step 2, product search will work perfectly!** ✅

**You can then import your real inventory and start selling!** 🚀
