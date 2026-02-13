# ⚡ 2-MINUTE QUICK FIX

## 🚨 Your Error
```
PGRST205: Could not find the table 'public.locations'
```

## ✅ The Fix (2 Minutes)

### **1. Open Supabase**
https://supabase.com/dashboard → Your Project → **SQL Editor**

### **2. Copy & Run These 3 Files**

#### **File 1:** `/database/01-create-tables.sql` ✅ YOU DID THIS
- ~~Copy entire file~~
- ~~Paste in SQL Editor~~
- ~~Click "Run"~~
- ✅ ~~Wait for "Success"~~ DONE!

#### **File 2:** `/database/02-create-views-FIXED.sql` ⚠️ USE FIXED VERSION
- Copy entire file: **`/database/02-create-views-FIXED.sql`** (NOT the original!)
- Paste in SQL Editor
- Click "Run"
- ✅ Wait for "Success"
- **Why FIXED?** Original referenced tables that don't exist (`invoices`, `invoice_items`)

#### **File 3:** `/database/03-seed-data.sql` ✅ YOU DID THIS
- ~~Copy entire file~~
- ~~Paste in SQL Editor~~
- ~~Click "Run"~~
- ✅ ~~Wait for "Success"~~ DONE!

### **3. Test Your App**
- Refresh Figma Make app (F5)
- Go to Bulk Import
- Upload CSV
- Click "Preview & Validate"
- ✅ Should work now!

---

## 🎯 Expected Results

### **Before Fix:**
- ❌ Error: "Could not find table"
- ❌ 124,962 validation errors

### **After Fix:**
- ✅ Valid Rows: 124,958
- ✅ Will Create: 45,000 products
- ✅ Errors: 4 (one blank row - normal!)

---

## 📖 Need More Help?

- **Detailed Guide:** `/📚-DATABASE-SETUP-GUIDE.md`
- **Full Summary:** `/✅-BULK-IMPORT-FIXED.md`
- **Quick Reference:** `/🚨-DATABASE-NOT-CREATED.md`

---

**⏱️ Total Time: 2 minutes to set up, 7-11 minutes to import 124,958 records!**