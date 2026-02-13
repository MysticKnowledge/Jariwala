# 🗑️ DELETE IMPORTED DATA - Quick Action

## ⚡ 30-Second Cleanup

### **1. Open Supabase**
https://supabase.com/dashboard → **SQL Editor**

### **2. Copy This File**
👉 `/database/99-cleanup-bulk-import.sql`

### **3. Paste & Run**
- Paste into SQL Editor
- Click **"Run"**
- ✅ Done!

---

## 🗑️ What Gets Deleted

- ❌ **124,958 sale events** (notes = 'BULK_IMPORT')
- ❌ **~45,000 variants** (color = 'IMPORTED')
- ❌ **~45,000 products** (auto-created)
- ✅ **Locations kept** (optional deletion - commented out)

---

## ✅ After Cleanup

Your database will be **clean** and ready for:
1. Fresh import attempt (with fixes!)
2. Manual data entry
3. Starting from scratch

**All tables, views, and schema remain intact!**

---

## 📊 Expected Result

```
✅ Bulk import events remaining: 0
✅ Imported variants remaining: 0
✅ Auto-created products remaining: 0
✅ Database clean - ready for fresh import!
```

---

## 🔄 Next Steps

**Option 1: Try Import Again (RECOMMENDED)**
1. Refresh app (F5)
2. Go to Bulk Import
3. Upload CSV
4. Import with all fixes applied
5. ✅ Should work perfectly!

**Option 2: Start Fresh**
1. Add products manually
2. Use POS system
3. Build data organically

---

## 📁 Full Documentation

- **`/🧹-CLEANUP-GUIDE.md`** - Complete cleanup guide
- **`/database/99-cleanup-bulk-import.sql`** - Cleanup script

---

**⏱️ Takes less than 30 seconds!**

**👉 Run it NOW, then try the import again!** 🚀
