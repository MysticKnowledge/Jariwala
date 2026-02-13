# 🔍 DEBUGGING GUIDE - Header Mapping

## ⚠️ Issue: "Still needs sku_code and location_code"

If you're seeing errors that the system still needs `sku_code` and `location_code`, here's how to debug:

---

## 🧪 STEP-BY-STEP DEBUGGING

### **Step 1: Deploy Server Function**

```bash
supabase functions deploy server
```

**Wait for:**
```
Function server deployed successfully!
```

---

### **Step 2: Create Test Data in Database**

Before testing, create test SKU and location:

```sql
-- Create test location
INSERT INTO locations (location_code, location_name, location_type)
VALUES ('TEST-LOC-001', 'Test Location', 'STORE')
ON CONFLICT (location_code) DO NOTHING;

-- Create test product
INSERT INTO products (product_code, product_name, category)
VALUES ('TEST-PROD', 'Test Product', 'GARMENT')
ON CONFLICT (product_code) DO NOTHING;

-- Create test variant
INSERT INTO product_variants (product_id, sku_code, size, color)
SELECT id, 'TEST-SKU-001', 'M', 'Blue'
FROM products 
WHERE product_code = 'TEST-PROD'
ON CONFLICT (sku_code) DO NOTHING;
```

---

### **Step 3: Test with Simple CSV**

Use this test file (`/TEST-YOUR-HEADERS.csv`):

```csv
VNO,DATE,PRNO,QTY,RATE,ACNO
TEST001,2025-02-01,TEST-SKU-001,1,1499,TEST-LOC-001
TEST002,2025-02-02,TEST-SKU-001,2,1499,TEST-LOC-001
```

**Upload this file** to the Bulk Import panel.

---

### **Step 4: Check Server Logs**

**Go to:** Supabase Dashboard → Edge Functions → server → Logs

**Look for these lines:**

```
✅ GOOD OUTPUT:
Raw headers: ['VNO', 'DATE', 'PRNO', 'QTY', 'RATE', 'ACNO']
Normalized headers: ['bill_no', 'bill_datetime', 'sku_code', 'quantity', 'selling_price', 'location_code']

First parsed row (before mapping): {
  bill_no: 'TEST001',
  bill_datetime: '2025-02-01',
  sku_code: 'TEST-SKU-001',
  quantity: '1',
  selling_price: '1499',
  location_code: 'TEST-LOC-001'
}

First mapped row: {
  bill_no: 'TEST001',
  bill_datetime: '2025-02-01',
  sku_code: 'TEST-SKU-001',
  quantity: 1,
  selling_price: 1499,
  location_code: 'TEST-LOC-001',
  customer_code: undefined
}
```

---

### **Step 5: Check for Issues**

#### **❌ BAD OUTPUT 1: Headers Not Mapped**

```
Raw headers: ['VNO', 'DATE', 'PRNO', 'QTY', 'RATE', 'ACNO']
Normalized headers: ['vno', 'date', 'prno', 'qty', 'rate', 'acno']  ❌ WRONG!
```

**Cause:** Mapping dictionary not working

**Fix:** Check that HEADER_MAPPINGS is defined correctly in server code.

---

#### **❌ BAD OUTPUT 2: Empty Values**

```
First parsed row (before mapping): {
  bill_no: '',
  bill_datetime: '',
  sku_code: '',
  ...
}
```

**Cause:** CSV parsing issue (wrong delimiter or encoding)

**Fix:** 
1. Make sure CSV is comma-separated (not tab or semicolon)
2. Make sure CSV is UTF-8 encoded
3. Check for special characters in CSV

---

#### **❌ BAD OUTPUT 3: Missing Fields**

```
First mapped row: {
  bill_no: 'TEST001',
  bill_datetime: '2025-02-01',
  sku_code: '',  ❌ EMPTY!
  location_code: ''  ❌ EMPTY!
}
```

**Cause:** Column data is empty or not being read

**Fix:** Check your CSV file has data in those columns

---

## 🔧 COMMON FIXES

### **Fix 1: File Encoding Issue**

If your CSV is from Excel or Tally, it might be UTF-16 or Windows-1252 encoded.

**Solution:**
1. Open CSV in Notepad (Windows) or TextEdit (Mac)
2. Save As → Encoding: **UTF-8**
3. Upload again

---

### **Fix 2: Wrong Delimiter**

Some exports use semicolon (;) or tab instead of comma.

**Check your CSV:**
```csv
VNO;DATE;PRNO;QTY;RATE;ACNO  ❌ SEMICOLON!
VNO	DATE	PRNO	QTY	RATE	ACNO  ❌ TAB!
VNO,DATE,PRNO,QTY,RATE,ACNO  ✅ COMMA!
```

**Solution:** Convert to comma-separated in Excel or text editor.

---

### **Fix 3: Extra Spaces in Headers**

```csv
VNO ,  DATE  ,PRNO,QTY,RATE,ACNO  ❌ EXTRA SPACES!
```

**Solution:** The code should trim spaces, but if it doesn't work, remove them manually.

---

### **Fix 4: Different Case**

```csv
vno,date,prno,qty,rate,acno  ← lowercase
VNO,DATE,PRNO,QTY,RATE,ACNO  ← uppercase
Vno,Date,Prno,Qty,Rate,Acno  ← mixed
```

**All should work!** The normalization converts everything to lowercase.

If it doesn't work, check server logs for "Raw headers" to see what's being received.

---

## 🧪 MANUAL TEST SCRIPT

If you want to test the normalization logic directly:

```typescript
// Test in browser console or Node.js

function normalizeHeader(header) {
  return header
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

const HEADER_MAPPINGS = {
  'vno': 'bill_no',
  'date': 'bill_datetime',
  'prno': 'sku_code',
  'qty': 'quantity',
  'rate': 'selling_price',
  'acno': 'location_code',
};

// Test your headers
const testHeaders = ['VNO', 'DATE', 'PRNO', 'QTY', 'RATE', 'ACNO'];

testHeaders.forEach(header => {
  const normalized = normalizeHeader(header);
  const mapped = HEADER_MAPPINGS[normalized] || normalized;
  console.log(`${header} → ${normalized} → ${mapped}`);
});

// Expected output:
// VNO → vno → bill_no
// DATE → date → bill_datetime
// PRNO → prno → sku_code
// QTY → qty → quantity
// RATE → rate → selling_price
// ACNO → acno → location_code
```

---

## 📊 VALIDATION ERRORS vs MAPPING ERRORS

### **Mapping Error** (before validation):

```
Error: Headers do not match expected format
```

This means headers aren't being normalized correctly.

**Fix:** Check server logs for "Raw headers" and "Normalized headers"

---

### **Validation Error** (after mapping):

```
Row 2: sku_code - SKU code not found in database (Value: "TEST-SKU-001")
```

This means headers **ARE** mapped correctly, but the SKU doesn't exist in database.

**Fix:** Create the SKU in database OR change the value in CSV to an existing SKU.

---

## ✅ COMPLETE DEBUGGING CHECKLIST

- [ ] Server function deployed successfully
- [ ] Test location `TEST-LOC-001` created in database
- [ ] Test SKU `TEST-SKU-001` created in database
- [ ] CSV file is comma-separated (not semicolon or tab)
- [ ] CSV file is UTF-8 encoded (not UTF-16)
- [ ] CSV headers are exactly: `VNO,DATE,PRNO,QTY,RATE,ACNO`
- [ ] CSV has data rows with values
- [ ] Uploaded file to Bulk Import panel
- [ ] Checked server logs for "Raw headers"
- [ ] Checked server logs for "Normalized headers"
- [ ] Headers show correct mapping (VNO → bill_no, etc.)
- [ ] "First parsed row" shows correct data
- [ ] "First mapped row" shows correct data
- [ ] Validation shows actual errors (SKU not found, etc.) not mapping errors

---

## 🚨 IF STILL NOT WORKING

### **Share This Information:**

1. **Server logs output:**
   - Raw headers: [...]
   - Normalized headers: [...]
   - First parsed row: {...}
   - First mapped row: {...}

2. **First 3 lines of your CSV file:**
   ```
   Line 1: ...
   Line 2: ...
   Line 3: ...
   ```

3. **Error message from frontend:**
   ```
   Error: ...
   ```

4. **Database check:**
   ```sql
   SELECT COUNT(*) FROM product_variants WHERE sku_code = 'YOUR-SKU';
   SELECT COUNT(*) FROM locations WHERE location_code = 'YOUR-LOC';
   ```

With this information, we can pinpoint the exact issue!

---

## 🎯 QUICK VERIFICATION

**Run this in Supabase SQL Editor:**

```sql
-- Check if test data exists
SELECT 'Locations' as table_name, COUNT(*) as count 
FROM locations 
WHERE location_code = 'TEST-LOC-001'

UNION ALL

SELECT 'Product Variants', COUNT(*) 
FROM product_variants 
WHERE sku_code = 'TEST-SKU-001';
```

**Expected output:**
```
table_name        | count
------------------+-------
Locations         | 1
Product Variants  | 1
```

If count is 0, the test data doesn't exist. Create it first!

---

## 💡 TIP: Test Locally First

Before importing 10,000 rows, always:

1. Create 2-3 test rows
2. Test with minimal CSV (only required columns)
3. Check server logs
4. Verify mapping is working
5. Then import full dataset

---

**Deploy and test now:**

```bash
supabase functions deploy server
```

Then upload `/TEST-YOUR-HEADERS.csv` and check logs! 🔍
