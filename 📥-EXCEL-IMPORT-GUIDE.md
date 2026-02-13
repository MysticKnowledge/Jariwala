# 📥 EXCEL IMPORT GUIDE - Old Sales Data

## 🎯 **Import Your Historical Sales in 3 Steps**

**Domain:** jariwala.figma.site  
**Feature:** Bulk import old sales from Excel/CSV

---

## ⚡ **Quick Start (3 Steps)**

### **Step 1: Prepare Excel File**
Download template or use your existing sales sheet with correct columns.

### **Step 2: Preview & Validate**
Upload file to see validation results before importing.

### **Step 3: Import**
Click "Import" to create event ledger entries for all valid rows.

---

## 📊 **Required Column Structure**

### **EXACT Column Names (Case-Sensitive)**

| Column Name | Type | Required | Example | Notes |
|-------------|------|----------|---------|-------|
| **bill_no** | Text | ✅ | 24561 | Bill/invoice number |
| **bill_datetime** | DateTime | ✅ | 2025-04-02 14:32 | Real datetime |
| **sku_code** | Text | ✅ | JKT-BLK-L | Must exist in database |
| **quantity** | Integer | ✅ | 1 | Always positive in Excel |
| **selling_price** | Number | ❌ | 1499 | Optional (for reports) |
| **location_code** | Text | ✅ | STORE-01 | Must exist in database |
| **customer_code** | Text | ❌ | CUST001 | Optional |

### **⚠️ IMPORTANT:**
- Column names MUST match exactly
- SKU codes must exist in `product_variants` table
- Location codes must exist in `locations` table
- Quantity is always positive (system converts to negative for sales)

---

## 📋 **Excel Template**

### **CSV Format:**
```csv
bill_no,bill_datetime,sku_code,quantity,selling_price,location_code,customer_code
24561,2025-04-02 14:32,PROD-001-M-WHITE,1,1299,STORE-01,CUST001
24562,2025-04-02 15:15,PROD-002-M-BLACK,2,599,STORE-01,
24563,2025-04-03 10:20,PROD-004-32-BLUE,1,2199,STORE-01,CUST002
24564,2025-04-03 11:45,PROD-001-L-BLUE,1,1299,STORE-02,
24565,2025-04-03 14:30,PROD-003-32-BLACK,1,1599,STORE-01,CUST001
```

### **Download Template:**
Click "Download Template" button in the UI to get a pre-formatted template.

---

## 🚀 **How to Import**

### **Step 1: Access Import Panel**
```
1. Login to jariwala.figma.site
2. Navigate to Bulk Import section
3. Click "Bulk Import - Old Sales Data"
```

### **Step 2: Upload File**
```
1. Click "Upload" or drag and drop
2. Select your Excel/CSV file
3. File will be uploaded (not validated yet)
```

### **Step 3: Preview & Validate**
```
1. Click "Preview & Validate"
2. System checks:
   ✓ All required columns present
   ✓ All SKU codes exist
   ✓ All location codes exist
   ✓ Dates are valid
   ✓ Quantities are positive
3. View validation results
```

### **Step 4: Review Errors**
```
If errors found:
- Red box shows all validation errors
- Each error shows row number and issue
- Fix errors in Excel and re-upload
```

### **Step 5: Import Valid Rows**
```
1. Review preview of valid rows
2. Click "Import X Records" button
3. System creates event ledger entries
4. Shows success summary
```

---

## 📊 **What Happens During Import**

### **For Each Valid Row:**

1. **Event Created:**
   ```sql
   INSERT INTO event_ledger (
     event_type,        -- 'SALE'
     variant_id,        -- From sku_code lookup
     quantity,          -- Negative (Excel qty * -1)
     from_location_id,  -- From location_code lookup
     to_location_id,    -- NULL (sale has no destination)
     channel,           -- 'MANUAL'
     reference_type,    -- 'BULK_IMPORT'
     reference_number,  -- bill_no from Excel
     unit_selling_price,-- selling_price from Excel
     total_amount,      -- quantity * selling_price
     client_timestamp,  -- bill_datetime from Excel
     created_by,        -- Current user
     metadata           -- Import details
   )
   ```

2. **Stock Reduced:**
   - Stock at location is reduced by quantity
   - Stock calculation is automatic (from events)
   - No manual stock update needed

3. **Audit Log:**
   - Import action logged in `audit_log` table
   - Tracks total rows, success count, error count

---

## ✅ **Validation Rules**

### **Required Field Validation:**
- ❌ `bill_no` cannot be empty
- ❌ `bill_datetime` cannot be empty
- ❌ `sku_code` cannot be empty
- ❌ `quantity` must be > 0
- ❌ `location_code` cannot be empty

### **Database Validation:**
- ❌ `sku_code` must exist in `product_variants.sku_code`
- ❌ `location_code` must exist in `locations.location_code`

### **Data Type Validation:**
- ❌ `quantity` must be integer
- ❌ `selling_price` must be number (if provided)
- ❌ `bill_datetime` must be valid date

### **Business Rules:**
- ❌ Cannot import future dates
- ❌ Quantity cannot be zero
- ✅ Duplicate bill_no is allowed (if intentional)

---

## 🔍 **Preview Mode vs Import Mode**

### **Preview Mode:**
- Uploads file
- Validates all rows
- Shows errors
- Shows first 10 valid rows
- **Does NOT create events**
- No database changes

### **Import Mode:**
- Creates event ledger entries
- Updates stock levels
- Logs to audit_log
- **PERMANENT changes**
- Cannot undo (event_ledger is INSERT-only)

---

## 📈 **After Import**

### **1. Verify Events:**
```sql
-- Check imported events
SELECT * FROM event_ledger
WHERE reference_type = 'BULK_IMPORT'
ORDER BY created_at DESC;
```

### **2. Refresh Stock View:**
```sql
-- Refresh materialized view
SELECT refresh_current_stock_view();

-- Check updated stock
SELECT * FROM current_stock_view
WHERE location_code = 'STORE-01';
```

### **3. Check Sales Reports:**
```sql
-- View imported sales
SELECT * FROM sales_summary_view
WHERE invoice_date >= '2025-04-01'
ORDER BY invoice_date DESC;
```

---

## 🎯 **Example Import Scenarios**

### **Scenario 1: Import Last Month's Sales**

**Excel Data:**
```csv
bill_no,bill_datetime,sku_code,quantity,selling_price,location_code,customer_code
INV-2501,2025-01-05 10:30,PROD-001-M-WHITE,2,1299,STORE-01,CUST001
INV-2502,2025-01-05 14:20,PROD-002-M-BLACK,1,599,STORE-01,
INV-2503,2025-01-06 11:15,PROD-004-32-BLUE,1,2199,STORE-02,CUST003
```

**Result:**
- 3 events created
- Stock reduced at STORE-01 and STORE-02
- Sales visible in reports

---

### **Scenario 2: Import with Errors**

**Excel Data:**
```csv
bill_no,bill_datetime,sku_code,quantity,selling_price,location_code,customer_code
INV-2601,,PROD-001-M-WHITE,1,1299,STORE-01,
INV-2602,2025-01-07 10:00,INVALID-SKU,2,599,STORE-01,
INV-2603,2025-01-07 11:00,PROD-003-32-BLACK,0,1599,STORE-01,
INV-2604,2025-01-07 12:00,PROD-005-M-NAVY,1,5999,STORE-01,
```

**Validation Errors:**
- Row 2: `bill_datetime` is empty ❌
- Row 3: SKU code 'INVALID-SKU' not found ❌
- Row 4: `quantity` must be > 0 ❌

**Result:**
- 1 valid row (INV-2604)
- 3 errors shown
- Only valid row imported

---

### **Scenario 3: Import from Multiple Stores**

**Excel Data:**
```csv
bill_no,bill_datetime,sku_code,quantity,selling_price,location_code,customer_code
S1-001,2025-02-01 09:00,PROD-001-M-WHITE,1,1299,STORE-01,
S1-002,2025-02-01 10:00,PROD-002-M-BLACK,2,599,STORE-01,
S2-001,2025-02-01 09:30,PROD-003-32-BLACK,1,1599,STORE-02,
S2-002,2025-02-01 11:00,PROD-004-32-BLUE,1,2199,STORE-02,
```

**Result:**
- 4 events created
- Stock reduced at STORE-01 (3 items)
- Stock reduced at STORE-02 (2 items)

---

## 🛠️ **Troubleshooting**

### **Error: "SKU code not found"**
**Solution:**
1. Check `sku_code` in Excel matches database exactly
2. Query database: `SELECT sku_code FROM product_variants;`
3. Fix Excel to match database SKU codes

### **Error: "Location code not found"**
**Solution:**
1. Check `location_code` in Excel matches database
2. Query database: `SELECT location_code FROM locations;`
3. Use correct location codes from database

### **Error: "Invalid date format"**
**Solution:**
1. Use format: `YYYY-MM-DD HH:MM`
2. Example: `2025-04-02 14:32`
3. Excel date cells should be formatted as text or datetime

### **Error: "Quantity must be positive"**
**Solution:**
1. Ensure quantity > 0 in Excel
2. System automatically converts to negative for sales
3. Never use negative quantities in Excel

---

## 📊 **Import Limits**

### **File Limits:**
- **Max file size:** 10 MB
- **Max rows:** Unlimited (processed in batches of 100)
- **Supported formats:** .xlsx, .xls, .csv

### **Performance:**
- **Small files (< 100 rows):** < 5 seconds
- **Medium files (100-1000 rows):** 10-30 seconds
- **Large files (1000+ rows):** 30-60 seconds

### **Batch Processing:**
- Events created in batches of 100
- Prevents timeout on large imports
- All-or-nothing per batch

---

## 🔐 **Security & Audit**

### **Audit Logging:**
Every import is logged:
```sql
SELECT * FROM audit_log
WHERE action_type = 'BULK_IMPORT'
ORDER BY created_at DESC;
```

### **Event Metadata:**
Each imported event has metadata:
```json
{
  "imported": true,
  "import_source": "excel",
  "customer_code": "CUST001",
  "original_bill_no": "24561"
}
```

### **User Tracking:**
- `created_by` = User who imported
- `client_timestamp` = Original sale datetime
- `created_at` = Import timestamp

---

## 📚 **API Endpoint**

### **Endpoint:**
```
POST /make-server-c45d1eeb/bulk-import
```

### **Request:**
```javascript
const formData = new FormData();
formData.append('file', excelFile);
formData.append('mode', 'preview'); // or 'import'

fetch('https://YOUR_PROJECT.supabase.co/functions/v1/make-server-c45d1eeb/bulk-import', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: formData
});
```

### **Response (Preview):**
```json
{
  "success": true,
  "totalRows": 100,
  "validRows": 95,
  "errorRows": 5,
  "errors": [
    {
      "row": 2,
      "field": "sku_code",
      "error": "SKU code not found in database",
      "value": "INVALID-SKU"
    }
  ],
  "preview": [
    {
      "bill_no": "24561",
      "bill_datetime": "2025-04-02T14:32:00.000Z",
      "sku_code": "PROD-001-M-WHITE",
      "quantity": 1,
      "selling_price": 1299,
      "location_code": "STORE-01"
    }
  ]
}
```

### **Response (Import):**
```json
{
  "success": true,
  "totalRows": 100,
  "successCount": 95,
  "errorCount": 5,
  "errors": [...],
  "eventIds": [
    "uuid-1",
    "uuid-2",
    "uuid-3"
  ]
}
```

---

## 🎯 **Best Practices**

### **1. Always Preview First**
- Never import directly
- Check validation errors
- Verify preview data

### **2. Fix All Errors**
- Don't ignore errors
- Fix in Excel, re-upload
- 100% valid is best

### **3. Backup Before Import**
- Export current event_ledger
- Take database snapshot
- Event ledger is INSERT-only (no undo)

### **4. Import in Batches**
- Don't import years at once
- Break into monthly batches
- Easier to verify

### **5. Verify After Import**
- Check stock levels
- Review sales reports
- Confirm event count

---

## ✅ **Deployment**

### **Deploy Server Function:**
```bash
./DEPLOY-ALL-FUNCTIONS.sh
```

### **Use in Frontend:**
```tsx
import { BulkImportPanel } from './components/BulkImportPanel';

function App() {
  return (
    <div>
      <BulkImportPanel />
    </div>
  );
}
```

---

## 📋 **Checklist Before Import**

- [ ] Downloaded template
- [ ] Filled all required columns
- [ ] SKU codes match database
- [ ] Location codes match database
- [ ] Dates are valid format
- [ ] Quantities are positive
- [ ] Previewed and validated
- [ ] All errors fixed
- [ ] Ready to import

---

## 🎉 **Success!**

After import:
- ✅ All sales in event_ledger
- ✅ Stock levels updated
- ✅ Reports show historical data
- ✅ Audit trail complete

---

**Created:** February 10, 2026  
**Status:** Ready to use  
**Domain:** jariwala.figma.site

🚀 **Import your old sales now!**
