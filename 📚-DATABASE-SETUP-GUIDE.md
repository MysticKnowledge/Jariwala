# 🚀 DATABASE SETUP - COMPLETE GUIDE

## 🎯 Quick Summary

**Your Error:** `PGRST205 - Could not find the table 'public.locations'`

**The Fix:** Run 3 SQL migration scripts in your Supabase database

**Time Required:** 2-3 minutes

---

## 📋 Step-by-Step Instructions

### **Method 1: Run Each Script Separately (Recommended)**

#### **Step 1: Open Supabase SQL Editor**

1. Go to: **https://supabase.com/dashboard**
2. Select your project from the list
3. Click **"SQL Editor"** in the left sidebar (looks like `</>`)
4. Click **"+ New Query"** button (top right)

#### **Step 2: Run First Migration - Create Tables**

1. Open the file: `/database/01-create-tables.sql` (in your project files)
2. **Copy the ENTIRE contents** (Ctrl+A, Ctrl+C)
3. **Paste into Supabase SQL Editor** (Ctrl+V)
4. Click **"Run"** button (or press Ctrl+Enter)
5. ✅ Wait for green "Success" notification
6. ⏱️ Should complete in 5-10 seconds

**What this creates:**
- 14 core tables (products, product_variants, locations, event_ledger, etc.)
- All indexes for fast queries
- All constraints and validations

#### **Step 3: Run Second Migration - Create Views**

1. Click **"+ New Query"** again (to start fresh)
2. Open the file: `/database/02-create-views.sql`
3. **Copy the ENTIRE contents**
4. **Paste into Supabase SQL Editor**
5. Click **"Run"**
6. ✅ Wait for green "Success" notification
7. ⏱️ Should complete in 2-3 seconds

**What this creates:**
- 5 reporting views (current stock, sales summary, low stock alerts, etc.)
- Materialized views for performance

#### **Step 4: Run Third Migration - Seed Data**

1. Click **"+ New Query"** again
2. Open the file: `/database/03-seed-data.sql`
3. **Copy the ENTIRE contents**
4. **Paste into Supabase SQL Editor**
5. Click **"Run"**
6. ✅ Wait for green "Success" notification
7. ⏱️ Should complete in 1-2 seconds

**What this creates:**
- 5 user roles (OWNER, MANAGER, STORE_STAFF, GODOWN_STAFF, ACCOUNTANT)
- 6 sample categories (Shirts, T-Shirts, Trousers, etc.)
- 6 sample brands (Van Heusen, Peter England, etc.)
- 2 sample locations (Store Main, Godown 1)
- Sample products and variants for testing

---

### **Method 2: Run All At Once (Faster)**

If you're confident, you can combine all three scripts:

1. Open Supabase SQL Editor
2. Click **"+ New Query"**
3. Copy contents of `01-create-tables.sql` → Paste
4. Below that, copy contents of `02-create-views.sql` → Paste
5. Below that, copy contents of `03-seed-data.sql` → Paste
6. Click **"Run"** once to run everything
7. ✅ Wait for "Success" (may take 15-20 seconds)

---

## ✅ Verify Everything Worked

### **Quick Verification (In Supabase SQL Editor)**

Run this query to check tables were created:

```sql
SELECT 
    schemaname,
    tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

**You should see 14+ tables including:**
- `audit_log`
- `brands`
- `categories`
- `customers`
- `event_ledger` ← **This is the important one!**
- `locations` ← **This too!**
- `products` ← **And this!**
- `product_variants` ← **And this!**
- `roles`
- `suppliers`
- `user_location_access`
- `user_profiles`
- Plus others...

### **Check Row Counts**

Run this to verify seed data was inserted:

```sql
SELECT 
    'roles' as table_name, COUNT(*) as row_count FROM roles
UNION ALL
SELECT 'locations', COUNT(*) FROM locations
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'product_variants', COUNT(*) FROM product_variants
UNION ALL
SELECT 'event_ledger', COUNT(*) FROM event_ledger;
```

**Expected Results:**
- `roles`: 5 rows
- `locations`: 2 rows
- `products`: 5-10 rows
- `product_variants`: 10-20 rows
- `event_ledger`: 0 rows (will populate after your bulk import)

---

## 🎯 After Setup Complete

### **Return to Figma Make App**

1. **Refresh your browser** (F5 or Ctrl+R)
2. Go to **"Bulk Import"** section in sidebar
3. Upload your CSV file (124,962 rows)
4. Click **"Preview & Validate"**
5. ✅ **It should work now!** No more database errors

### **Expected Results**

**Preview:**
- Valid Rows: 124,958 ✅
- Errors: 4 (just that one blank row 62468)
- Will Create: ~45,000 products (your unique SKU codes)
- Will Create: 1 location (code "10")

**Import (after clicking "Import 124,958 Records"):**
- Phase 1: Creates 45,000 products in 90 batches (~5-8 minutes)
- Phase 2: Creates 124,958 sale events in 125 batches (~2-3 minutes)
- **Total Time: ~7-11 minutes**

---

## 🔧 Troubleshooting

### **Error: "relation already exists"**

✅ **This is OK!** It means you already ran this script before. Skip to the next one.

### **Error: "permission denied"**

❌ **Fix:** Make sure you're logged into the correct Supabase project
❌ **Fix:** Make sure you're using the **SQL Editor** (not Table Editor or Database section)

### **Error: "syntax error at or near..."**

❌ **Fix:** Make sure you copied the **ENTIRE** SQL file (from first line to last)
❌ **Fix:** Don't modify the SQL files - copy them exactly as they are

### **App still shows "table not found" error**

1. **Hard refresh** browser: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Clear cache**: In DevTools (F12) → Application → Clear Storage
3. **Check Supabase logs**: Dashboard → Logs → Look for any RLS errors

### **Preview works but Import fails**

1. Check Supabase Dashboard → Logs for detailed error
2. Make sure you have enough database capacity (free tier has limits)
3. Try importing in smaller batches (split your CSV into 2-3 files)

---

## 📊 Database Architecture Overview

Your database uses a **ledger-first, event-driven architecture**:

### **Core Concept: Event Ledger**

All inventory movements are recorded as **immutable events** in the `event_ledger` table:

- ✅ **INSERT-ONLY** - Events can never be deleted or modified
- ✅ **Complete Audit Trail** - Every transaction is permanently recorded
- ✅ **Calculated Stock** - Current stock is calculated from events, not stored directly

### **Event Types**

- `SALE` - Customer purchase (negative quantity)
- `PURCHASE` - Buying from supplier (positive quantity)
- `TRANSFER_OUT` - Move to another location (negative)
- `TRANSFER_IN` - Receive from another location (positive)
- `RETURN` - Customer return (positive)
- `EXCHANGE_IN` / `EXCHANGE_OUT` - Garment exchanges
- `ADJUSTMENT` - Manual stock correction
- `DAMAGE` / `LOSS` / `FOUND` - Stock discrepancies

### **Your Bulk Import Creates:**

When you import 124,958 old sales records:

1. Creates **products** table entries (for each unique SKU code)
2. Creates **product_variants** table entries (SKU = variant)
3. Creates **event_ledger** entries with:
   - `event_type = 'SALE'`
   - `quantity = negative` (stock goes out)
   - `notes = 'BULK_IMPORT'` (for filtering)
   - `event_datetime = your historical date`

---

## 📞 Still Need Help?

If you're still stuck after following this guide:

1. Copy the **exact error message** from Supabase SQL Editor
2. Note which script failed (01, 02, or 03)
3. Note the line number where it failed
4. Share these details so we can debug

---

## 🎉 Success Checklist

- [ ] Opened Supabase Dashboard → SQL Editor
- [ ] Ran `/database/01-create-tables.sql` → Success ✅
- [ ] Ran `/database/02-create-views.sql` → Success ✅
- [ ] Ran `/database/03-seed-data.sql` → Success ✅
- [ ] Verified 14+ tables exist in Table Editor
- [ ] Verified seed data (5 roles, 2 locations, etc.)
- [ ] Refreshed Figma Make app in browser
- [ ] Bulk Import → Preview now works! ✅
- [ ] Ready to import 124,958 records 🚀

---

**Once all checkboxes are complete, your system is fully operational!**
