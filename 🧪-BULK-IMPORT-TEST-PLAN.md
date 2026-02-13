# 🧪 BULK IMPORT TESTING & VALIDATION PLAN

## 📋 Test Scenarios

### ✅ Test 1: Small Sample Import (Smoke Test)
**Purpose**: Verify basic functionality
**Dataset**: `/sample-test-import.csv` (3 rows)

**Steps**:
1. Open app → Settings → Bulk Import
2. Upload sample file
3. Click "Preview & Validate"
4. Verify:
   - ✅ Shows "3 Total Rows"
   - ✅ Shows "3 Valid Rows"
   - ✅ Shows "0 Errors"
   - ✅ Preview table shows 3 rows
   - ✅ Auto-created products/locations shown
5. Click "Import 3 Records"
6. Wait ~2-3 seconds
7. Verify:
   - ✅ Shows "Import Complete!"
   - ✅ Shows "3 Imported"
   - ✅ Shows event IDs created

**Expected Time**: < 5 seconds total
**Pass Criteria**: All checkboxes green, no errors

---

### ✅ Test 2: Large CSV Import (Your Actual Data)
**Purpose**: Test real-world scenario
**Dataset**: Your CSV file (62,480 rows)

#### Phase 1: Preview (Product Creation)
**Steps**:
1. Upload your 62,480-row CSV file
2. Click "Preview & Validate"
3. **WAIT** (this creates 4,575 products!)
4. Monitor console logs (F12 → Console)
5. Verify:
   - ✅ Shows "62,480 Total Rows"
   - ✅ Shows valid row count
   - ✅ "Auto-Created Master Data" section shows:
     - Products: ~4,575
     - Variants: ~4,575
     - Locations: (however many unique locations)
   - ✅ Preview table shows first 10 rows
   - ✅ Any validation errors displayed clearly

**Expected Time**: 45-60 seconds
**Console Output**:
```
Parsing Excel file...
Parsed rows: 62480
Auto-creating master data...
Unique SKU codes: 4575
Creating batch 1/3 (2000 products)
Creating batch 2/3 (2000 products)
Creating batch 3/3 (575 products)
Total products created: 4575
Valid rows: 62480
```

#### Phase 2: Import (Event Creation)
**Steps**:
1. After preview completes, click "Import 62,480 Records"
2. Watch progress (future enhancement)
3. **WAIT** (this creates events in batches)
4. Monitor console logs
5. Verify:
   - ✅ Shows "Import Complete!"
   - ✅ Shows "62,480 Imported"
   - ✅ Shows event IDs array
   - ✅ No timeout errors

**Expected Time**: 60-90 seconds
**Console Output**:
```
Creating events...
Fetching variant IDs for 4575 unique SKUs...
Fetching location IDs for X unique locations...
Processing 62480 events in 25 batches of 2500
Batch 1/25: Processing rows 0-2499
Batch 1 success: 2500 events created
Batch 2/25: Processing rows 2500-4999
...
Batch 25/25: Processing rows 62000-62479
Events created: 62480
```

**Total Expected Time**: 2-3 minutes

---

### ✅ Test 3: Validation Error Handling
**Purpose**: Test error detection and reporting
**Dataset**: Create a CSV with intentional errors

**Test File** (`test-errors.csv`):
```csv
bill_no,bill_datetime,sku_code,quantity,selling_price,location_code
B001,2024-01-01 10:00,SKU-001,1,100,LOC-001
B002,,SKU-002,1,100,LOC-001
B003,2024-01-03 10:00,,1,100,LOC-001
B004,2024-01-04 10:00,SKU-004,0,100,LOC-001
B005,2024-01-05 10:00,SKU-005,1,100,
```

**Expected Errors**:
- Row 3: Missing bill_datetime
- Row 4: Missing sku_code
- Row 5: Quantity must be > 0
- Row 6: Missing location_code

**Verify**:
- ✅ Shows "1 Valid Rows"
- ✅ Shows "4 Errors"
- ✅ Error list shows all 4 issues with row numbers
- ✅ Only valid row appears in preview
- ✅ Import button shows "Import 1 Record"

---

### ✅ Test 4: Header Normalization
**Purpose**: Test case-insensitive and variant header names
**Dataset**: Create CSV with different header formats

**Test File** (`test-headers.csv`):
```csv
VNO,DATE,PRNO,QTY,RATE,ACNO
V001,2024-01-01 10:00,SKU-001,1,100,LOC-001
V002,2024-01-02 10:00,SKU-002,2,200,LOC-002
```

**Verify**:
- ✅ Headers correctly mapped:
  - VNO → bill_no
  - DATE → bill_datetime
  - PRNO → sku_code
  - QTY → quantity
  - RATE → selling_price
  - ACNO → location_code
- ✅ Shows "2 Valid Rows"
- ✅ Preview shows correct data

---

### ✅ Test 5: Database Verification
**Purpose**: Confirm data actually created in database

**Steps**:
1. After successful import, go to Supabase Dashboard
2. Navigate to Table Editor
3. Run these queries:

#### Check Products Created
```sql
SELECT COUNT(*) as product_count
FROM products
WHERE product_code LIKE '%'; -- All products

-- Should show: ~4,575 products (or your unique count)
```

#### Check Variants Created
```sql
SELECT COUNT(*) as variant_count
FROM product_variants
WHERE sku_code IS NOT NULL;

-- Should show: ~4,575 variants
```

#### Check Events Created
```sql
SELECT COUNT(*) as event_count
FROM event_ledger
WHERE notes = 'BULK_IMPORT';

-- Should show: 62,480 events
```

#### Check Event Details
```sql
SELECT 
  event_type,
  reference_number,
  quantity,
  unit_selling_price,
  created_at
FROM event_ledger
WHERE notes = 'BULK_IMPORT'
ORDER BY created_at DESC
LIMIT 10;

-- Should show: Recent sales with your bill numbers
```

#### Verify Stock Impact
```sql
SELECT 
  pv.sku_code,
  SUM(el.quantity) as net_quantity
FROM event_ledger el
JOIN product_variants pv ON el.variant_id = pv.id
WHERE el.notes = 'BULK_IMPORT'
GROUP BY pv.sku_code
LIMIT 10;

-- Should show: Negative quantities (sales reduce stock)
```

**Pass Criteria**:
- ✅ Product count matches unique SKUs
- ✅ Variant count matches products
- ✅ Event count matches total rows imported
- ✅ Events have correct bill numbers
- ✅ Quantities are negative (sales)

---

## 🐛 Common Issues & Solutions

### Issue 1: "Database tables not found"
**Error**: `PGRST205` or "Could not find the table"
**Solution**: 
```bash
# Run database migrations
1. Open Supabase Dashboard → SQL Editor
2. Run /database/01-create-tables.sql
3. Run /database/02-create-views.sql
4. Run /database/03-seed-data.sql
```

### Issue 2: Preview takes too long (>2 minutes)
**Expected**: 45-60 seconds for 4,575 products
**If longer**: Check console for errors
**Optimization**: Already batched at 2,000/batch - this is optimal

### Issue 3: Import fails with "Missing variant ID"
**Cause**: Products not created in Phase 1
**Solution**: 
1. Always run Preview before Import
2. Check "Auto-Created Master Data" section
3. If 0 products created, check for errors in console

### Issue 4: Some rows show errors
**Expected**: Invalid data will be skipped
**Action**: 
1. Review error list
2. Fix CSV file
3. Re-upload and preview again

### Issue 5: Import completes but fewer events than expected
**Cause**: Some rows failed validation
**Check**: 
1. Error count in results
2. Error list shows which rows failed
3. Common causes:
   - Missing required fields
   - Zero or negative quantities
   - Invalid date formats

---

## 📊 Performance Benchmarks

### Your 62,480 Row Dataset

| Metric | Target | Acceptable Range | Red Flag |
|--------|--------|------------------|----------|
| **Preview Time** | 45-60s | 30-90s | >120s |
| **Import Time** | 60-90s | 45-120s | >180s |
| **Total Time** | 2-3 min | 1.5-4 min | >5 min |
| **DB Queries (lookup)** | ~10 | 5-20 | >100 |
| **Events/Second** | 700-1000 | 500-1500 | <300 |
| **Memory Usage** | Streaming | N/A | If timeout |

### How to Monitor Performance

#### Browser Console (F12)
```javascript
// Time the preview
console.time('preview');
// ... click Preview button ...
// When done:
console.timeEnd('preview');

// Time the import
console.time('import');
// ... click Import button ...
// When done:
console.timeEnd('import');
```

#### Supabase Logs
1. Go to Supabase Dashboard → Edge Functions → make-server-c45d1eeb
2. Click "Logs"
3. Watch for:
   - "Batch X/25: Processing rows Y-Z"
   - "Batch X success: N events created"
   - Any error messages

---

## ✅ Final Checklist

Before marking as COMPLETE, verify:

- [ ] Small sample import works (3 rows, <5 seconds)
- [ ] Large import Preview completes (4,575 products, ~45-60s)
- [ ] Large import Import completes (62,480 events, ~60-90s)
- [ ] Validation errors are detected and displayed
- [ ] Header normalization works (VNO, DATE, PRNO, etc.)
- [ ] Database queries confirm all data created
- [ ] Performance within acceptable ranges
- [ ] Console shows no timeout errors
- [ ] UI shows progress and completion messages
- [ ] Can import another file after first import

---

## 📝 Test Results Template

Copy this and fill in as you test:

```
=== BULK IMPORT TEST RESULTS ===
Date: __________
Tester: __________

Test 1: Small Sample (3 rows)
- Status: [ ] PASS [ ] FAIL
- Time: _____ seconds
- Notes: ________________________________

Test 2: Large Import Phase 1 (62,480 rows)
- Status: [ ] PASS [ ] FAIL
- Time: _____ seconds
- Products Created: _____
- Variants Created: _____
- Notes: ________________________________

Test 2: Large Import Phase 2
- Status: [ ] PASS [ ] FAIL
- Time: _____ seconds
- Events Created: _____
- Notes: ________________________________

Test 3: Error Handling
- Status: [ ] PASS [ ] FAIL
- Errors Detected: _____
- Notes: ________________________________

Test 4: Header Normalization
- Status: [ ] PASS [ ] FAIL
- Notes: ________________________________

Test 5: Database Verification
- Status: [ ] PASS [ ] FAIL
- Products in DB: _____
- Events in DB: _____
- Notes: ________________________________

Overall Status: [ ] ALL PASS [ ] SOME FAIL
Ready for Production: [ ] YES [ ] NO

Issues Found:
1. ________________________________
2. ________________________________
3. ________________________________
```

---

## 🚀 Next Steps After Testing

Once all tests pass:

1. ✅ **Document**: Save test results
2. ✅ **Train Users**: Show them the two-phase process
3. ✅ **Monitor**: Watch first real import closely
4. ✅ **Optimize**: If needed, adjust batch sizes
5. ✅ **Celebrate**: You just imported 62k records! 🎉

**Questions or Issues?** Check `/🚀-BULK-IMPORT-OPTIMIZED.md` for troubleshooting.
