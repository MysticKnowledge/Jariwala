# 📋 DATABASE DEPLOYMENT GUIDE

## 🗄️ **Complete Database Setup for Retail System**

**Domain:** jariwala.figma.site  
**Database:** PostgreSQL (Supabase)  
**Architecture:** Event-driven, Ledger-first

---

## 📊 **Database Summary**

| Component | Count | Purpose |
|-----------|-------|---------|
| **Core Tables** | 14 | Products, inventory, transactions, users |
| **Reporting Views** | 5 | Analytics and dashboards |
| **Roles** | 5 | OWNER, MANAGER, STAFF, GODOWN, ACCOUNTANT |
| **Event Types** | 11 | SALE, PURCHASE, TRANSFER, etc. |
| **Test Data** | Ready | Products, locations, customers |

---

## 🚀 **Quick Deployment (3 Steps)**

### **Step 1: Create Tables**
```sql
-- Run in Supabase SQL Editor
\i /database/01-create-tables.sql
```

### **Step 2: Create Views**
```sql
-- Run in Supabase SQL Editor
\i /database/02-create-views.sql
```

### **Step 3: Seed Data**
```sql
-- Run in Supabase SQL Editor
\i /database/03-seed-data.sql
```

---

## 📁 **Migration Files**

### **1. `/database/01-create-tables.sql`**
**Purpose:** Create all database tables  
**Tables Created:**
- ✅ categories
- ✅ brands
- ✅ roles
- ✅ locations
- ✅ user_profiles
- ✅ user_location_access
- ✅ products
- ✅ product_variants
- ✅ **event_ledger** (Core - INSERT only)
- ✅ customers
- ✅ invoices
- ✅ invoice_items
- ✅ audit_log

**Time:** ~30 seconds

---

### **2. `/database/02-create-views.sql`**
**Purpose:** Create 5 reporting views  
**Views Created:**
1. ✅ **current_stock_view** (Materialized) - Real-time stock levels
2. ✅ **sales_summary_view** - Daily sales summary
3. ✅ **inventory_movement_view** - Movement tracking
4. ✅ **product_performance_view** - Sales performance
5. ✅ **low_stock_alert_view** - Reorder alerts

**Time:** ~20 seconds

---

### **3. `/database/03-seed-data.sql`**
**Purpose:** Populate test data  
**Data Inserted:**
- ✅ 5 Roles (system roles)
- ✅ 6 Categories (Shirts, T-Shirts, Trousers, etc.)
- ✅ 6 Brands (Van Heusen, Peter England, etc.)
- ✅ 4 Locations (2 Stores, 1 Godown, 1 Showroom)
- ✅ 5 Products
- ✅ 12 Product Variants (with barcodes)
- ✅ 5 Customers

**Time:** ~10 seconds

---

## 🎯 **Event Ledger - Core Table**

### **Purpose:**
INSERT-only table for all inventory movements. Current stock is **calculated** from events, not stored.

### **Event Types:**
```
SALE            - Retail sale (qty < 0)
PURCHASE        - Supplier purchase (qty > 0)
TRANSFER_OUT    - Stock sent (qty < 0)
TRANSFER_IN     - Stock received (qty > 0)
RETURN          - Customer return (qty > 0)
EXCHANGE_IN     - Exchange received (qty > 0)
EXCHANGE_OUT    - Exchange given (qty < 0)
ADJUSTMENT      - Stock correction (± qty)
DAMAGE          - Damaged goods (qty < 0)
LOSS            - Lost/stolen (qty < 0)
FOUND           - Found inventory (qty > 0)
```

### **Example Events:**
```sql
-- Purchase: Add 50 shirts to Godown
INSERT INTO event_ledger (
    event_type, variant_id, quantity,
    to_location_id, channel,
    unit_cost_price, created_by
) VALUES (
    'PURCHASE', 
    (SELECT id FROM product_variants WHERE sku_code = 'PROD-001-M-WHITE'),
    50,
    (SELECT id FROM locations WHERE location_code = 'GODOWN-01'),
    'MANUAL',
    800.00,
    auth.uid()
);

-- Transfer: Move 10 shirts from Godown to Store
INSERT INTO event_ledger (
    event_type, variant_id, quantity,
    from_location_id, to_location_id,
    created_by
) VALUES (
    'TRANSFER_OUT',
    (SELECT id FROM product_variants WHERE sku_code = 'PROD-001-M-WHITE'),
    -10,
    (SELECT id FROM locations WHERE location_code = 'GODOWN-01'),
    (SELECT id FROM locations WHERE location_code = 'STORE-01'),
    auth.uid()
);

-- Sale: Sell 2 shirts from Store
INSERT INTO event_ledger (
    event_type, variant_id, quantity,
    from_location_id, channel,
    unit_selling_price, total_amount,
    created_by
) VALUES (
    'SALE',
    (SELECT id FROM product_variants WHERE sku_code = 'PROD-001-M-WHITE'),
    -2,
    (SELECT id FROM locations WHERE location_code = 'STORE-01'),
    'STORE',
    1299.00,
    2598.00,
    auth.uid()
);
```

---

## 📊 **Reporting Views**

### **1. current_stock_view**
**Type:** Materialized (needs refresh)  
**Purpose:** Real-time stock levels

**Query:**
```sql
-- Get all stock at STORE-01
SELECT * FROM current_stock_view
WHERE location_code = 'STORE-01'
ORDER BY stock_status, product_name;

-- Get low/out of stock items
SELECT * FROM current_stock_view
WHERE stock_status IN ('LOW', 'OUT_OF_STOCK')
ORDER BY current_quantity;

-- Refresh the view
SELECT refresh_current_stock_view();
```

---

### **2. sales_summary_view**
**Purpose:** Daily sales analytics

**Query:**
```sql
-- Today's sales by location
SELECT * FROM sales_summary_view
WHERE invoice_date = CURRENT_DATE;

-- This week's sales
SELECT 
    location_name,
    SUM(net_sales) as week_sales,
    SUM(total_invoices) as week_invoices
FROM sales_summary_view
WHERE invoice_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY location_name;
```

---

### **3. inventory_movement_view**
**Purpose:** Track all movements

**Query:**
```sql
-- Last 50 movements
SELECT * FROM inventory_movement_view
LIMIT 50;

-- Movements for specific product
SELECT * FROM inventory_movement_view
WHERE sku_code = 'PROD-001-M-WHITE'
ORDER BY movement_date DESC;

-- Transfers between locations
SELECT * FROM inventory_movement_view
WHERE event_type IN ('TRANSFER_OUT', 'TRANSFER_IN')
AND movement_date >= CURRENT_DATE - INTERVAL '7 days';
```

---

### **4. product_performance_view**
**Purpose:** Sales performance

**Query:**
```sql
-- Top 10 selling products
SELECT * FROM product_performance_view
ORDER BY total_quantity_sold DESC
LIMIT 10;

-- Products never sold
SELECT * FROM product_performance_view
WHERE times_sold IS NULL OR times_sold = 0;

-- High margin products
SELECT * FROM product_performance_view
WHERE profit_margin_percent > 50
ORDER BY total_revenue DESC;
```

---

### **5. low_stock_alert_view**
**Purpose:** Reorder alerts

**Query:**
```sql
-- All low stock items
SELECT * FROM low_stock_alert_view
ORDER BY urgency DESC, days_until_stockout;

-- Urgent reorders needed
SELECT * FROM low_stock_alert_view
WHERE urgency = 'URGENT';

-- Items to reorder with costs
SELECT 
    sku_code,
    product_name,
    current_quantity,
    reorder_quantity,
    estimated_reorder_cost
FROM low_stock_alert_view
WHERE urgency IN ('URGENT', 'HIGH');
```

---

## 👥 **User Setup**

### **After Migration:**

1. **Create users in Supabase Auth:**
   - Go to Supabase Dashboard → Authentication → Users
   - Add users manually or via code

2. **Link to user_profiles:**
```sql
-- Example: Create OWNER user
INSERT INTO user_profiles (
    user_id,
    full_name,
    employee_code,
    phone,
    email,
    role_id,
    primary_location_id
) VALUES (
    'USER_UUID_FROM_AUTH',
    'Owner Name',
    'EMP-001',
    '+919876543210',
    'owner@example.com',
    (SELECT id FROM roles WHERE name = 'OWNER'),
    (SELECT id FROM locations WHERE location_code = 'STORE-01')
);
```

---

## 🔐 **Role-Based Permissions**

### **OWNER (Level 1)**
- ✅ Full system access
- ✅ All operations allowed
- ✅ All locations accessible

### **MANAGER (Level 2)**
- ✅ Inventory management
- ✅ Sales operations
- ✅ View reports
- ✅ Manage users (view only)

### **STORE_STAFF (Level 3)**
- ✅ POS billing
- ✅ Customer management
- ✅ View inventory
- ❌ Cannot purchase or transfer

### **GODOWN_STAFF (Level 3)**
- ✅ Receive purchases
- ✅ Transfer stock
- ✅ Inventory adjustments
- ❌ Cannot make sales

### **ACCOUNTANT (Level 3)**
- ✅ View all reports
- ✅ View sales data
- ❌ Cannot modify inventory

---

## 🧪 **Testing After Deployment**

### **1. Verify Tables:**
```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Count should be 14 tables
```

### **2. Verify Views:**
```sql
-- Check all views exist
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Count should be 4 views + 1 materialized view
```

### **3. Verify Seed Data:**
```sql
-- Check roles
SELECT * FROM roles;

-- Check products
SELECT COUNT(*) as product_count FROM products;
SELECT COUNT(*) as variant_count FROM product_variants;

-- Check locations
SELECT * FROM locations;
```

### **4. Test Stock Calculation:**
```sql
-- Should show 0 stock initially (no events yet)
SELECT * FROM current_stock_view
WHERE location_code = 'STORE-01'
LIMIT 10;
```

---

## 📈 **Performance Tips**

### **Refresh Materialized View:**
```sql
-- Manual refresh
SELECT refresh_current_stock_view();

-- Schedule automatic refresh (every 5 minutes)
-- Add in Supabase Dashboard → Database → Cron Jobs
SELECT cron.schedule(
    'refresh-stock-view',
    '*/5 * * * *',
    'SELECT refresh_current_stock_view();'
);
```

### **Index Usage:**
All important columns are indexed:
- ✅ SKU codes
- ✅ Barcodes
- ✅ Event types
- ✅ Locations
- ✅ Dates

---

## 🔄 **Event Flow Example**

### **Complete Purchase-to-Sale Flow:**

```sql
-- 1. PURCHASE: Supplier delivers 100 shirts to Godown
INSERT INTO event_ledger (event_type, variant_id, quantity, to_location_id, unit_cost_price, created_by)
SELECT 'PURCHASE', id, 100, 
    (SELECT id FROM locations WHERE location_code = 'GODOWN-01'),
    800.00,
    auth.uid()
FROM product_variants WHERE sku_code = 'PROD-001-M-WHITE';

-- 2. TRANSFER: Move 20 shirts from Godown to Store
INSERT INTO event_ledger (event_type, variant_id, quantity, from_location_id, to_location_id, created_by)
SELECT 'TRANSFER_OUT', id, -20,
    (SELECT id FROM locations WHERE location_code = 'GODOWN-01'),
    (SELECT id FROM locations WHERE location_code = 'STORE-01'),
    auth.uid()
FROM product_variants WHERE sku_code = 'PROD-001-M-WHITE';

-- 3. SALE: Customer buys 3 shirts
INSERT INTO event_ledger (event_type, variant_id, quantity, from_location_id, unit_selling_price, total_amount, created_by)
SELECT 'SALE', id, -3,
    (SELECT id FROM locations WHERE location_code = 'STORE-01'),
    1299.00,
    3897.00,
    auth.uid()
FROM product_variants WHERE sku_code = 'PROD-001-M-WHITE';

-- 4. Check stock levels
SELECT refresh_current_stock_view();

SELECT location_name, current_quantity
FROM current_stock_view
WHERE sku_code = 'PROD-001-M-WHITE';
-- Result: GODOWN-01 = 80, STORE-01 = 17
```

---

## 🎯 **Production Checklist**

- [ ] Run 01-create-tables.sql
- [ ] Run 02-create-views.sql
- [ ] Run 03-seed-data.sql
- [ ] Create test users in Auth
- [ ] Link users to user_profiles
- [ ] Test event insertion
- [ ] Refresh materialized view
- [ ] Test all 5 reporting views
- [ ] Set up cron job for view refresh
- [ ] Verify role-based access
- [ ] Test complete purchase-to-sale flow

---

## 📚 **Complete Documentation**

| Document | Purpose |
|----------|---------|
| **`/📊-DATABASE-TABLES.md`** | Complete schema documentation |
| **`/database/01-create-tables.sql`** | Create all tables |
| **`/database/02-create-views.sql`** | Create reporting views |
| **`/database/03-seed-data.sql`** | Seed test data |
| **`/📋-DATABASE-DEPLOYMENT.md`** | This guide |

---

## ✅ **Status**

- ✅ Schema designed (14 tables)
- ✅ Views created (5 views)
- ✅ Seed data ready
- ✅ Migration scripts written
- ✅ Documentation complete
- ⏳ Ready to deploy to Supabase

---

## 🚀 **Deploy Now!**

**Run in Supabase SQL Editor:**
1. Copy contents of `01-create-tables.sql`
2. Execute
3. Copy contents of `02-create-views.sql`
4. Execute
5. Copy contents of `03-seed-data.sql`
6. Execute

**Time:** ~2 minutes  
**Result:** Complete database ready for production

---

**Created:** February 10, 2026  
**Status:** Ready to deploy  
**Domain:** jariwala.figma.site
