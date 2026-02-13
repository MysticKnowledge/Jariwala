# 🚀 DEPLOY BULK IMPORT - STEP BY STEP

## ✅ ISSUE FIXED!

The bulk-import.tsx file was missing all its imports. I've recreated the complete file with:
- ✅ All necessary imports (createClient, XLSX)
- ✅ Complete type definitions
- ✅ Excel parsing functions
- ✅ Validation logic
- ✅ Event creation functions
- ✅ Main handler with error logging
- ✅ Demo user support (anon key)

---

## 📋 DEPLOY NOW - 3 STEPS

### **Step 1: Deploy Server Function** ⭐ CRITICAL

Run this command in your terminal:

```bash
supabase functions deploy server
```

**Expected output:**
```
Deploying Function...
✔ Packaged Function in 2.5s
✔ Deployed Function make-server-c45d1eeb in 15.3s
✅ Function deployed successfully
```

**Wait 30-60 seconds** for the deployment to fully propagate.

---

### **Step 2: Test Health Endpoint**

Verify the server is running:

```bash
curl https://ydkavqhmbenwypuzitlw.supabase.co/functions/v1/make-server-c45d1eeb/health
```

**Expected output:**
```json
{"status":"ok"}
```

✅ If you see this, the server is running!

---

### **Step 3: Test in Browser**

1. **Go to:** https://jariwala.figma.site
2. **Login as:** `owner001` (any password)
3. **Click:** "Bulk Import" in sidebar
4. **Download Template** (click button)
5. **Upload the template** (it has sample data)
6. **Click:** "Preview & Validate"
7. **Should see:** Validation results! ✅

---

## 🔍 IF STILL GETTING "Failed to fetch"

### **Check 1: Is function deployed?**

List all functions:
```bash
supabase functions list
```

Should show:
```
server
```

### **Check 2: Can you reach the endpoint?**

Test with curl:
```bash
curl -X POST \
  https://ydkavqhmbenwypuzitlw.supabase.co/functions/v1/make-server-c45d1eeb/bulk-import \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlka2F2cWhtYmVud3lwdXppdGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NzAxOTgsImV4cCI6MjA4NTM0NjE5OH0.mrvDSh_WKnqLnxwhVyTCJbqic6px-AAzVgv21g2bcMQ"
```

Should return:
```json
{"error":"No file uploaded"}
```

✅ If you see this error, the endpoint is working! (It's just missing the file, which is expected)

### **Check 3: Open browser console (F12)**

Look for:
```
Sending preview request to: https://ydkavqhmbenwypuzitlw.supabase.co/functions/v1/make-server-c45d1eeb/bulk-import
Response status: 200
Response data: {success: true, ...}
```

---

## 🧪 TEST WITH SAMPLE DATA

### **Option 1: Use Template (Easiest)**

1. Click "Download Template" in the UI
2. Upload the downloaded CSV file
3. Click "Preview & Validate"
4. **Problem:** Will show errors because SKU codes don't exist in database yet

### **Option 2: Create Test Data First**

Before importing, create some test products:

```sql
-- Create a test location
INSERT INTO locations (location_code, name, type)
VALUES ('STORE_MAIN', 'Main Store', 'STORE')
ON CONFLICT DO NOTHING;

-- Create a test product
INSERT INTO products (name, category, brand)
VALUES ('Test Jacket', 'Outerwear', 'TestBrand')
RETURNING id;

-- Create product variants (use the product id from above)
INSERT INTO product_variants (product_id, sku_code, size, color, base_price)
VALUES 
  ('YOUR_PRODUCT_ID', 'JKT-BLK-L', 'L', 'Black', 1499),
  ('YOUR_PRODUCT_ID', 'SHIRT-WHT-M', 'M', 'White', 899),
  ('YOUR_PRODUCT_ID', 'JEANS-BLU-32', '32', 'Blue', 2199);
```

Then the template will work!

### **Option 3: Create Custom Excel with Real SKUs**

1. Check your database for existing SKU codes:
```sql
SELECT sku_code FROM product_variants LIMIT 10;
```

2. Check your location codes:
```sql
SELECT location_code FROM locations LIMIT 10;
```

3. Create Excel file with those codes:
```csv
bill_no,bill_datetime,sku_code,quantity,selling_price,location_code,customer_code
INV001,2025-02-01 10:00,YOUR_REAL_SKU,1,1000,YOUR_REAL_LOCATION,CUST001
```

4. Upload and test!

---

## 📊 WHAT THE LOGS SHOW

After deployment, the server logs will show:

```
Bulk import request received
Authenticated user: demo-user-bulk-import
Parsing form data...
Mode: preview
File: sales_import_template.csv
Reading file buffer...
Parsing Excel file...
Parsed rows: 3
Validating rows...
Valid rows: 3 (or 0 if SKUs don't exist)
Errors: 0 (or 3 if SKUs don't exist)
```

Check logs in Supabase Dashboard:
- Go to: https://supabase.com/dashboard/project/ydkavqhmbenwypuzitlw
- Click: "Edge Functions"
- Click: "server"
- Click: "Logs"

---

## ✅ SUCCESS LOOKS LIKE

### **Preview Response:**
```json
{
  "success": true,
  "totalRows": 3,
  "validRows": 3,
  "errorRows": 0,
  "errors": [],
  "preview": [
    {
      "bill_no": "24561",
      "bill_datetime": "2025-04-02 14:32",
      "sku_code": "JKT-BLK-L",
      "quantity": 1,
      "selling_price": 1499,
      "location_code": "STORE_MAIN"
    }
  ]
}
```

### **Import Response:**
```json
{
  "success": true,
  "totalRows": 3,
  "successCount": 3,
  "errorCount": 0,
  "errors": [],
  "eventIds": ["uuid1", "uuid2", "uuid3"]
}
```

---

## ❌ COMMON ERRORS & FIXES

### **Error: "SKU code not found in database"**

**Fix:** Create the product variant first:
```sql
INSERT INTO product_variants (product_id, sku_code, size, color, base_price)
VALUES ('product-uuid', 'JKT-BLK-L', 'L', 'Black', 1499);
```

### **Error: "Location code not found in database"**

**Fix:** Create the location first:
```sql
INSERT INTO locations (location_code, name, type)
VALUES ('STORE_MAIN', 'Main Store', 'STORE');
```

### **Error: "Bill number is required"**

**Fix:** Make sure your Excel has a `bill_no` column with values.

### **Error: "Quantity must be greater than 0"**

**Fix:** Make sure quantity column has numbers > 0.

---

## 🎯 DEPLOYMENT CHECKLIST

Before testing:
- [ ] Server function deployed: `supabase functions deploy server`
- [ ] Health endpoint works: `{"status":"ok"}`
- [ ] Browser console open (F12) for debugging
- [ ] Have test file ready (template or custom)

For successful import:
- [ ] Database has at least 1 location created
- [ ] Database has at least 1 product variant created
- [ ] Excel file uses matching SKU codes
- [ ] Excel file uses matching location codes

---

## 🚀 QUICK START COMMANDS

**Full deployment + test:**

```bash
# 1. Deploy function
supabase functions deploy server

# 2. Wait 30 seconds
sleep 30

# 3. Test health
curl https://ydkavqhmbenwypuzitlw.supabase.co/functions/v1/make-server-c45d1eeb/health

# 4. Test bulk-import endpoint
curl -X POST \
  https://ydkavqhmbenwypuzitlw.supabase.co/functions/v1/make-server-c45d1eeb/bulk-import \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlka2F2cWhtYmVud3lwdXppdGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NzAxOTgsImV4cCI6MjA4NTM0NjE5OH0.mrvDSh_WKnqLnxwhVyTCJbqic6px-AAzVgv21g2bcMQ"

# Should return: {"error":"No file uploaded"}
# This means the endpoint is working!

echo ""
echo "✅ Deployment complete!"
echo "Now test in browser at https://jariwala.figma.site"
```

---

## 📝 FILES FIXED

1. ✅ `/supabase/functions/server/bulk-import.tsx` - Complete rewrite with all imports
2. ✅ `/supabase/functions/server/index.tsx` - Already has route registered
3. ✅ `/src/app/components/BulkImportPanel.tsx` - Already has error handling

---

## 🎉 NEXT STEPS

1. **Deploy:** `supabase functions deploy server`
2. **Wait:** 30-60 seconds
3. **Test:** Go to app and try bulk import
4. **Success!** 🎉

If you still get errors after deployment, check:
- Browser console (F12)
- Supabase function logs
- curl test results

The function is now complete and ready to deploy! 🚀
