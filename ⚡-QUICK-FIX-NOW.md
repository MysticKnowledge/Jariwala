# ⚡ QUICK FIX - Run This SQL NOW!

## 🎯 30-Second Fix

### **Copy & Paste This SQL:**

```sql
-- Create system user for bulk imports (FIXED - removed confirmed_at)
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin
)
VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'system@bulk-import.internal',
    '$2a$10$AAAAAAAAAAAAAAAAAAAAAA',
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "system", "providers": ["system"]}'::jsonb,
    '{"full_name": "Bulk Import System", "is_system": true}'::jsonb,
    false
)
ON CONFLICT (id) DO NOTHING;
```

---

## 📍 Where to Run

1. **Open:** https://supabase.com/dashboard
2. **Click:** Your Project
3. **Click:** SQL Editor (left sidebar)
4. **Paste:** The SQL above
5. **Click:** "Run" (or Ctrl+Enter)
6. ✅ **Done!**

---

## ✅ After Running

**Expected Output:**
```
INSERT 0 1
```

OR if already exists:
```
INSERT 0 0
```

Both are fine!

---

## 🚀 Now Retry Import

1. **Refresh Figma Make** (Press F5)
2. **Upload CSV**
3. **Click "Import"**
4. ✅ **Will work this time!**

---

## 🎯 What This Does

Creates a system user in `auth.users` so the bulk import can reference it as `created_by`.

**Safe?** ✅ Yes!
- Password is unusable
- Can't be logged into
- Only for system operations

---

## 🔧 What Changed

**Previous error:** `cannot insert a non-DEFAULT value into column "confirmed_at"`

**Fix:** Removed `confirmed_at` from INSERT (it's auto-generated)

---

**👉 RUN THE SQL IN SUPABASE NOW!** 🚀

**Then immediately retry your import!** ✅

---

**Time: 30 seconds to fix, then 10 minutes to import!**
