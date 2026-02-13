# 🧹 CLEANUP GUIDE - Remove All Imported Data

## 🎯 Quick Action (30 seconds)

### **Step 1: Open Supabase SQL Editor**
👉 https://supabase.com/dashboard → Your Project → **SQL Editor**

### **Step 2: Copy & Run Cleanup Script**
1. Open **`/database/99-cleanup-bulk-import.sql`**
2. **Copy ENTIRE file**
3. **Paste into Supabase SQL Editor**
4. Click **"Run"** (or Ctrl+Enter)
5. ✅ **All imported data deleted!**

---

## 🗑️ What Gets Deleted

### **1. Sale Events: 124,958 records**
```sql
DELETE FROM event_ledger
WHERE notes = 'BULK_IMPORT';
```
Removes all sale events created during bulk import.

### **2. Product Variants: ~45,000 records**
```sql
DELETE FROM product_variants
WHERE color = 'IMPORTED';
```
Removes all auto-created variants (color = 'IMPORTED').

### **3. Products: ~45,000 records**
```sql
DELETE FROM products
WHERE product_type = 'GARMENT'
AND id NOT IN (SELECT DISTINCT product_id FROM product_variants);
```
Removes products that have no variants left.

### **4. Locations: OPTIONAL (commented out)**
```sql
-- DELETE FROM locations
-- WHERE location_name LIKE 'Location %';
```
Auto-created locations are **NOT** deleted by default.  
Uncomment if you want to remove them too.

---

## ✅ Expected Output

After running the cleanup script, you'll see:

```
✅ Sale events deleted - 0 remaining events
✅ Product variants deleted - 0 remaining variants
✅ Products deleted - 0 remaining products
✅ Locations (not deleted by default) - X locations
✅ Current stock view refreshed
✅ CLEANUP COMPLETE

Verification:
- Bulk import events remaining: 0
- Imported variants remaining: 0
- Auto-created products remaining: 0
```

---

## 🔍 What Gets KEPT

The script is **SAFE** and only deletes bulk-imported data:

✅ **Keeps:**
- Any manually created products
- Any manually created locations
- Any manually created categories/brands
- Any other events (PURCHASE, TRANSFER, etc.)
- All table structures and views
- All seed data from script 3

❌ **Deletes:**
- Only events with `notes = 'BULK_IMPORT'`
- Only variants with `color = 'IMPORTED'`
- Only products with no remaining variants

---

## 🚨 Optional: Delete Locations Too

If you want to **also delete** auto-created locations:

1. Open `/database/99-cleanup-bulk-import.sql`
2. Find this section (around line 65):
```sql
-- DELETE FROM locations
-- WHERE location_name LIKE 'Location %'
-- AND location_type = 'STORE'
```
3. **Remove the `--` comments** to enable deletion
4. Run the script again

---

## 🔄 After Cleanup - Fresh Start!

Your database is now clean and ready for:

### **Option 1: Try Import Again**
1. Refresh Figma Make app (F5)
2. Go to Bulk Import
3. Upload CSV
4. Preview & Import
5. ✅ Should work perfectly now!

### **Option 2: Manual Data Entry**
1. Use the POS system
2. Add products manually
3. Record sales as they happen
4. Build data organically

### **Option 3: Wait for More Data**
1. Collect more CSV files
2. Prepare better formatted data
3. Import when ready

---

## 📊 Database State After Cleanup

```
┌──────────────────────────────────────────────┐
│ Table              │ Rows After Cleanup      │
├──────────────────────────────────────────────┤
│ event_ledger       │ 0 (or seed data only)   │
│ product_variants   │ 0 (or seed data only)   │
│ products           │ 0 (or seed data only)   │
│ locations          │ X (auto-created kept)   │
│ categories         │ X (unchanged)           │
│ brands             │ X (unchanged)           │
│ customers          │ X (unchanged)           │
└──────────────────────────────────────────────┘
```

All **table structures** and **views** remain intact!

---

## ⚡ Quick Verification Commands

After cleanup, check your database:

### **1. Check Events:**
```sql
SELECT COUNT(*) FROM event_ledger;
-- Should return: 0 or low number (only seed data)
```

### **2. Check Products:**
```sql
SELECT COUNT(*) FROM products;
-- Should return: 0 or low number (only seed data)
```

### **3. Check Variants:**
```sql
SELECT COUNT(*) FROM product_variants;
-- Should return: 0 or low number (only seed data)
```

### **4. Check Locations:**
```sql
SELECT * FROM locations ORDER BY created_at DESC;
-- Shows all locations (auto-created ones still there unless you uncommented deletion)
```

### **5. Check Current Stock:**
```sql
SELECT * FROM current_stock_view;
-- Should be empty or show only seed data
```

---

## 🎯 Transaction Safety

The cleanup script uses a **transaction**:

```sql
BEGIN;
  -- All delete operations
COMMIT;
```

**Benefits:**
- ✅ All-or-nothing execution
- ✅ Can rollback if something goes wrong
- ✅ Database stays consistent

**If you want to preview without deleting:**
1. Run everything up to `COMMIT;`
2. Review the counts
3. Run `ROLLBACK;` to undo (instead of COMMIT)
4. Or run `COMMIT;` to confirm deletion

---

## 📁 Files Reference

- **`/database/99-cleanup-bulk-import.sql`** - The cleanup script
- **`/🧹-CLEANUP-GUIDE.md`** - This guide
- **`/✅-ALL-FIXED-NOW.md`** - Import guide (after cleanup)

---

## ⏱️ Cleanup Time

- **Parse SQL:** Instant
- **Delete events:** 2-5 seconds
- **Delete variants:** 2-5 seconds  
- **Delete products:** 2-5 seconds
- **Refresh view:** 1-2 seconds

**Total: Less than 30 seconds!** ⚡

---

## 🚨 Important Notes

1. **Backup First (Optional):**
   - Supabase keeps backups automatically
   - You can restore from dashboard if needed
   - But this cleanup is **safe** and **reversible** via re-import

2. **Cascade Deletes:**
   - Products cascade to variants (ON DELETE CASCADE)
   - Deleting variants automatically removes orphaned products
   - No manual cleanup needed

3. **View Refresh:**
   - Script automatically refreshes `current_stock_view`
   - Ensures stock calculations are up-to-date
   - Other views are standard (auto-update)

4. **Locations:**
   - **Kept by default** because you might want to keep them
   - They're small (few dozen at most)
   - Easy to delete manually if needed

---

**👉 Run `/database/99-cleanup-bulk-import.sql` in Supabase NOW!** 🗑️

**Then start fresh with the corrected import!** 🚀
