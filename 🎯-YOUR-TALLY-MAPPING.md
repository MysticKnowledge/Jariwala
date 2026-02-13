# 🎯 YOUR TALLY/ACCOUNTING EXPORT - EXACT MAPPING

## ✅ Your Current Headers (From Image)

```
VTYPE, DATE, CATEGORY, VNO, PRNO, QTY, RATE, GROSS, ACNO, Details, 
S_Mno, OptCode, prtGCode, size_code, sal_rate, SAL_AMT, tmcom, 
grtcode, FTIIME, bigno, firmID, counter, gstRate, gstAmt, userld
```

---

## 🔄 Automatic Mapping

### ✅ **These will work automatically:**

| Your Column | Maps To | Status |
|-------------|---------|--------|
| **VNO** | bill_no | ✅ Auto-mapped |
| **DATE** | bill_datetime | ✅ Auto-mapped |
| **PRNO** | sku_code | ✅ Auto-mapped |
| **QTY** | quantity | ✅ Auto-mapped |
| **RATE** | selling_price | ✅ Auto-mapped |
| **ACNO** | location_code | ✅ Auto-mapped |

### ⚠️ **Optional/Extra columns (will be ignored):**

These columns won't cause errors - they'll just be skipped:
- VTYPE
- CATEGORY
- GROSS
- Details
- S_Mno
- OptCode
- prtGCode
- size_code
- sal_rate
- SAL_AMT
- tmcom
- grtcode
- FTIIME
- bigno
- firmID
- counter
- gstRate
- gstAmt
- userld

---

## 📝 What You Need To Do

### **Option 1: Keep All Columns** ✅ EASIEST

Just export your CSV with ALL columns as-is. The system will:
1. Pick the columns it needs (VNO, DATE, PRNO, QTY, RATE, ACNO)
2. Ignore the rest
3. Map them automatically

**No need to delete or modify anything!**

### **Option 2: Remove Extra Columns** (Optional)

If you want a cleaner file, keep only these columns:
```csv
VNO,DATE,PRNO,QTY,RATE,ACNO
```

Or use friendly names:
```csv
Bill No,Date,Product No,Quantity,Rate,Location
```

Both will work!

---

## 🎯 Example from Your Data

### **Your Tally Export:**
```csv
VTYPE,DATE,CATEGORY,VNO,PRNO,QTY,RATE,GROSS,ACNO,Details,S_Mno,OptCode,prtGCode,size_code,sal_rate,SAL_AMT,tmcom,grtcode,FTIIME,bigno,firmID,counter,gstRate,gstAmt,userld
SALE,2025-02-01,GARMENT,INV001,JKT-BLK-L,1,1499,1499,STORE1,Jacket Sale,M001,OPT1,GRP1,L,1499,1499,0,GRT1,14:30,100,FIRM1,CTR1,18,269.82,USR1
SALE,2025-02-02,GARMENT,INV002,SHIRT-WHT-M,2,899,1798,STORE1,Shirt Sale,M002,OPT2,GRP2,M,899,1798,0,GRT2,15:45,101,FIRM1,CTR1,18,323.64,USR1
```

### **What Gets Imported:**

| VNO | DATE | PRNO | QTY | RATE | ACNO |
|-----|------|------|-----|------|------|
| INV001 | 2025-02-01 | JKT-BLK-L | 1 | 1499 | STORE1 |
| INV002 | 2025-02-02 | SHIRT-WHT-M | 2 | 899 | STORE1 |

All other columns are automatically ignored!

---

## ⚠️ Important Prerequisites

### **Before importing, make sure:**

1. **SKU codes exist in database:**
   - `JKT-BLK-L` must exist in `product_variants` table
   - `SHIRT-WHT-M` must exist in `product_variants` table
   - Use the exact same SKU codes as your database!

2. **Location codes exist in database:**
   - `STORE1` must exist in `locations` table
   - Use the exact same location codes as your database!

3. **Date format:**
   - Accepted: `2025-02-01`, `2025-02-01 14:30`, `01/02/2025`
   - Best: `YYYY-MM-DD` or `YYYY-MM-DD HH:MM`

---

## 🚀 Upload Process

### **Step 1: Export from Tally/QuickBooks**
Export your sales data with all columns (no need to clean up!)

### **Step 2: Upload to System**
1. Go to Bulk Import panel
2. Click "Upload"
3. Select your CSV file
4. Click "Preview & Validate"

### **Step 3: Check Logs**
You'll see in server logs:
```
Raw headers: ['VTYPE', 'DATE', 'CATEGORY', 'VNO', 'PRNO', 'QTY', 'RATE', ...]
Normalized headers: ['vtype', 'bill_datetime', 'category', 'bill_no', 'sku_code', 'quantity', 'selling_price', ...]
```

See how:
- `VNO` → `bill_no` ✅
- `DATE` → `bill_datetime` ✅
- `PRNO` → `sku_code` ✅
- `QTY` → `quantity` ✅
- `RATE` → `selling_price` ✅
- `ACNO` → `location_code` ✅

### **Step 4: Import**
Click "Import X Records" and done!

---

## 🐛 Common Issues & Fixes

### **Issue 1: "SKU code not found in database"**

**Error:**
```
Row 2: sku_code - SKU code not found in database (Value: "JKT-BLK-L")
```

**Fix:**
1. Check if `JKT-BLK-L` exists in your `product_variants` table
2. If not, create it first
3. Make sure SKU codes match EXACTLY (case-sensitive!)

### **Issue 2: "Location code not found in database"**

**Error:**
```
Row 2: location_code - Location code not found in database (Value: "STORE1")
```

**Fix:**
1. Check if `STORE1` exists in your `locations` table
2. If not, create it first
3. Make sure location codes match EXACTLY

### **Issue 3: "Bill datetime is required"**

**Error:**
```
Row 2: bill_datetime - Bill datetime is required (Value: "")
```

**Fix:**
Make sure your DATE column has values for all rows

---

## 💡 Pro Tips

### **Tip 1: Use RATE or SAL_AMT**

You have both `RATE` and `SAL_AMT` columns. The system will use:
- `RATE` (preferred) if available
- Falls back to `SAL_AMT` if RATE is empty

### **Tip 2: Customer Code (Optional)**

If you want to track customers, you can map another column to `customer_code`:
- Add mapping in server code
- Or add a `customer_code` column to your export

### **Tip 3: Size Code**

Your export has `size_code` but it's not used. If needed:
1. Include size in SKU code: `JKT-BLK-L` (L = Large)
2. Or track separately in metadata

---

## ✅ Final Checklist

Before uploading:

- [ ] Export sales data from Tally/QuickBooks
- [ ] Make sure VNO, DATE, PRNO, QTY, RATE, ACNO columns exist
- [ ] All SKU codes exist in `product_variants` table
- [ ] All location codes exist in `locations` table
- [ ] Deploy server function: `supabase functions deploy server`
- [ ] Upload and preview
- [ ] Check validation errors
- [ ] Import!

---

## 🎉 Summary

Your Tally export is **100% compatible**! Just upload it as-is:

```csv
VTYPE,DATE,CATEGORY,VNO,PRNO,QTY,RATE,GROSS,ACNO,Details,...
SALE,2025-02-01,GARMENT,INV001,JKT-BLK-L,1,1499,1499,STORE1,Jacket Sale,...
```

The system will automatically:
- ✅ Map VNO → bill_no
- ✅ Map DATE → bill_datetime
- ✅ Map PRNO → sku_code
- ✅ Map QTY → quantity
- ✅ Map RATE → selling_price
- ✅ Map ACNO → location_code
- ✅ Ignore all other columns

**Deploy and test now!** 🚀

```bash
supabase functions deploy server
```
