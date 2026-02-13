# ⚡ **QUICK START GUIDE - REAL POS SYSTEM**

## 🚀 **Get Your POS Running in 10 Minutes!**

---

## **STEP 1: Create Database Tables** (2 minutes)

1. Open **Supabase SQL Editor**
2. Copy & paste the entire SQL from: `/📋-SALES-TABLES-SCHEMA.sql`
3. Click **"Run"**
4. ✅ Wait for "Success!"

**Verify:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('sales', 'sale_items');
```

Expected: 2 rows (sales, sale_items)

---

## **STEP 2: Create Users** (5 minutes)

### **A. Create Auth Users in Dashboard**

1. Go to: **Supabase Dashboard** → **Authentication** → **Users**
2. Click: **"Add User"** → **"Create New User"**
3. Fill in:
   - **Email:** `owner@jariwala.com`
   - **Password:** `owner123`
   - **Auto Confirm Email:** ✅ **YES** (very important!)
4. Click **"Create User"**
5. Repeat for:
   - `manager@jariwala.com` / `manager123`
   - `staff@jariwala.com` / `staff123`
   - `godown@jariwala.com` / `godown123`

### **B. Link Users to Users Table**

Go to **SQL Editor** and run:

```sql
DO $$
DECLARE
  v_owner_id UUID;
  v_manager_id UUID;
  v_staff_id UUID;
  v_godown_id UUID;
  v_store_location UUID;
  v_godown_location UUID;
BEGIN
  -- Get location IDs
  SELECT id INTO v_store_location FROM locations WHERE location_type = 'STORE' LIMIT 1;
  SELECT id INTO v_godown_location FROM locations WHERE location_type = 'GODOWN' LIMIT 1;
  
  -- Get auth user IDs
  SELECT id INTO v_owner_id FROM auth.users WHERE email = 'owner@jariwala.com';
  SELECT id INTO v_manager_id FROM auth.users WHERE email = 'manager@jariwala.com';
  SELECT id INTO v_staff_id FROM auth.users WHERE email = 'staff@jariwala.com';
  SELECT id INTO v_godown_id FROM auth.users WHERE email = 'godown@jariwala.com';
  
  -- Insert store users
  INSERT INTO users (id, email, username, full_name, role, location_id, is_active)
  VALUES 
    (v_owner_id, 'owner@jariwala.com', 'jariwala_owner', 'Mr. Jariwala', 'OWNER', v_store_location, true),
    (v_manager_id, 'manager@jariwala.com', 'store_manager', 'Store Manager', 'MANAGER', v_store_location, true),
    (v_staff_id, 'staff@jariwala.com', 'store_staff_1', 'Store Staff', 'STORE_STAFF', v_store_location, true),
    (v_godown_id, 'godown@jariwala.com', 'godown_staff_1', 'Godown Staff', 'GODOWN_STAFF', v_godown_location, true)
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Users created successfully!';
END $$;
```

**Verify:**
```sql
SELECT email, username, role FROM users;
```

Expected: 4 users

---

## **STEP 3: Test POS System** (3 minutes)

1. **Reload your app** (refresh browser)
2. **Login:**
   - Username/Email: `owner@jariwala.com`
   - Password: `owner123`
   - Location: Select any store
3. Click **"Sign In"**
4. ✅ Should see Owner Dashboard!
5. Click **"POS"** in sidebar
6. ✅ POS screen should open!

---

## **STEP 4: Make Your First Sale!** (2 minutes)

1. **Search for a product:**
   - Type product name in search box
   - OR enter barcode in barcode input

2. **Add to cart:**
   - Click on product from search results
   - Adjust quantity with +/- buttons

3. **Complete sale:**
   - Click **"Complete Sale"** button
   - Select payment method (Cash/Card/UPI/Credit)
   - Click **"Confirm Payment"**
   - ✅ Sale completed! Invoice generated!

---

## **STEP 5: Verify in Database** (1 minute)

```sql
-- Check latest sale
SELECT 
  invoice_number,
  customer_name,
  total_amount,
  payment_method,
  sale_date
FROM sales 
ORDER BY created_at DESC 
LIMIT 5;

-- Check sale items
SELECT 
  si.product_name,
  si.size,
  si.quantity,
  si.rate,
  si.amount
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
ORDER BY si.created_at DESC
LIMIT 10;

-- Check inventory reduction
SELECT 
  el.event_type,
  pv.barcode,
  p.product_name,
  el.quantity,
  el.created_at
FROM event_ledger el
JOIN product_variants pv ON pv.id = el.variant_id
JOIN products p ON p.id = pv.product_id
WHERE el.event_type = 'SALE'
ORDER BY el.created_at DESC
LIMIT 10;
```

---

## **✅ CHECKLIST:**

- [ ] SQL tables created (sales, sale_items)
- [ ] RPC functions created (search_products_for_pos, get_variant_stock)
- [ ] Auth users created in Supabase Dashboard
- [ ] Users linked to users table
- [ ] Logged in successfully
- [ ] POS screen opened
- [ ] First sale completed
- [ ] Verified in database

---

## **🎉 YOU'RE DONE!**

Your POS system is now:
- ✅ **Connected to real database**
- ✅ **Saving real transactions**
- ✅ **Updating real inventory**
- ✅ **Generating real invoices**
- ✅ **Ready for production!**

---

## **📚 Need More Help?**

- **User Creation Issues:** See `/🔐-CREATE-USERS-FIXED.md`
- **Complete POS Guide:** See `/🛒-REAL-POS-SYSTEM-COMPLETE.md`
- **Database Schema:** See `/📋-SALES-TABLES-SCHEMA.sql`

---

## **🚨 Troubleshooting:**

### **Error: "No locations found"**
```sql
-- Create a test location
INSERT INTO locations (location_name, location_type, address, is_active)
VALUES ('Main Store', 'STORE', 'Test Address', true);
```

### **Error: "Session expired"**
- Just login again
- Session auto-refreshes normally

### **Error: "Product not found"**
- Make sure you've imported your PRMAST data
- Check: `SELECT COUNT(*) FROM products;`

### **Error: "RPC function not found"**
- Re-run the SQL schema
- Check: `SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE '%pos%';`

---

## **🎯 Next Steps:**

1. **Import more products** - Use Legacy PRMAST Importer
2. **Train staff** - Show them how to use POS
3. **Test all payment methods** - Cash, Card, UPI, Credit
4. **Try hold bills** - Save incomplete sales
5. **Check reports** - View sales summaries

---

**Ready to process real sales!** 🛒💰

**Questions? Issues? Just ask!** 🚀
