# 🚨 DATABASE TABLES NOT CREATED YET

## ❌ Current Error

```
PGRST205: Could not find the table 'public.locations' in the schema cache
PGRST205: Could not find the table 'public.products' in the schema cache
```

**This means your database tables don't exist yet in Supabase!**

## ✅ Solution: Create Database Tables

You have complete migration scripts ready in `/database/` folder. You need to run them in your Supabase database.

### 📋 Step-by-Step Instructions

#### **Step 1: Open Supabase SQL Editor**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

#### **Step 2: Run Migration Scripts (IN ORDER)**

Run these scripts **one at a time**, in this exact order:

##### **Script 1: Create Tables** (`/database/01-create-tables.sql`)
- Copy the entire contents of `/database/01-create-tables.sql`
- Paste into Supabase SQL Editor
- Click **"Run"** (or press Ctrl+Enter)
- ✅ Wait for "Success" message

##### **Script 2: Create Views** (`/database/02-create-views.sql`)
- Copy the entire contents of `/database/02-create-views.sql`
- Paste into Supabase SQL Editor
- Click **"Run"**
- ✅ Wait for "Success" message

##### **Script 3: Seed Test Data** (`/database/03-seed-data.sql`)
- Copy the entire contents of `/database/03-seed-data.sql`
- Paste into Supabase SQL Editor
- Click **"Run"**
- ✅ Wait for "Success" message

---

## 📊 What Gets Created

### Script 1: Creates 14 Core Tables
1. `categories` - Product categories
2. `brands` - Brand information
3. `roles` - User roles (OWNER, MANAGER, STORE_STAFF, GODOWN_STAFF)
4. `locations` - Store/Godown locations
5. `user_profiles` - User information linked to auth
6. `user_location_access` - Location permissions per user
7. `products` - Master product data
8. `product_variants` - SKU-level variants (size, color)
9. `event_ledger` - **Core immutable transaction log** (INSERT-ONLY)
10. `customers` - Customer information
11. `suppliers` - Supplier information
12. `exchange_requests` - Garment exchange management
13. `audit_log` - Complete audit trail
14. `offline_sync_queue` - Offline mode support

### Script 2: Creates 5 Reporting Views
1. `current_stock_view` - Real-time stock levels
2. `daily_sales_summary` - Daily sales reports
3. `product_performance_view` - Top selling products
4. `location_stock_summary` - Stock by location
5. `low_stock_alerts` - Items below min stock

### Script 3: Seeds Test Data
- 5 test users (owner, manager, staff, godown, accountant)
- Sample locations (Store Main, Godown 1)
- Sample products and variants
- Sample test transactions

---

## ⚡ Quick Copy-Paste Commands

### Option A: Run All Scripts Together (Fastest)

If you want to run everything at once:

1. Open Supabase SQL Editor
2. Copy ALL THREE scripts together in this order:
   - First: All of `01-create-tables.sql`
   - Then: All of `02-create-views.sql`
   - Then: All of `03-seed-data.sql`
3. Run the combined script

### Option B: Use Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# From your project root
supabase db reset
supabase db push --migrations /database/
```

---

## 🧪 Verify Tables Were Created

After running the scripts, verify in Supabase:

1. Go to **"Table Editor"** in Supabase Dashboard
2. You should see all 14 tables listed
3. Check that each table has data (from seed script)

Or run this quick verification query in SQL Editor:

```sql
-- Verify tables exist
SELECT 
    schemaname,
    tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Quick row counts
SELECT 
    'locations' as table_name, COUNT(*) as row_count FROM locations
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'product_variants', COUNT(*) FROM product_variants
UNION ALL
SELECT 'event_ledger', COUNT(*) FROM event_ledger;
```

Expected output:
- `locations`: 2+ rows
- `products`: 5+ rows  
- `product_variants`: 10+ rows
- `event_ledger`: 0 rows (will populate after first import)

---

## 🎯 After Database Setup is Complete

Once tables are created, return to your Figma Make app and:

1. **Refresh the page** (to clear any cached errors)
2. Go to **"Bulk Import"** section
3. Upload your CSV file again
4. Click **"Preview & Validate"**
5. ✅ **It should work now!**

---

## 🔧 Troubleshooting

### Error: "relation already exists"
✅ **This is OK!** It means the table already exists. Continue with next script.

### Error: "permission denied"
❌ Make sure you're logged in to the correct Supabase project
❌ Make sure you're using the **SQL Editor** (not Table Editor)

### Error: "syntax error near..."
❌ Make sure you copied the **ENTIRE** SQL file
❌ Make sure you didn't accidentally modify the SQL

### Tables created but app still shows error
1. **Hard refresh** the browser (Ctrl+Shift+R or Cmd+Shift+R)
2. **Clear browser cache**
3. Check Supabase logs for any RLS (Row Level Security) errors

---

## 📞 Need Help?

If you get stuck:
1. Copy the exact error message from Supabase SQL Editor
2. Check which line number has the error
3. Make sure you're running scripts in the correct order (1 → 2 → 3)

---

**🚀 Once complete, your bulk import will work and you can import all 124,962 sales records!**
