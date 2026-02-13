# 🚨 FIX: Foreign Key Constraint Error

## ❌ The Error

```
Error creating events batch: {
  code: "23503",
  message: 'insert or update on table "event_ledger" violates foreign key constraint "event_ledger_created_by_fkey"'
  details: 'Key (created_by)=(00000000-0000-0000-0000-000000000000) is not present in table "users".'
}
```

## 🔍 Root Cause

The `event_ledger` table requires `created_by` to reference a valid user in `auth.users` table.

**Schema:**
```sql
created_by UUID NOT NULL REFERENCES auth.users(id)
```

The bulk import tries to use a system UUID `00000000-0000-0000-0000-000000000000` but this user doesn't exist in the auth.users table!

---

## ✅ SOLUTION: Create System User

### **Step 1: Open Supabase SQL Editor**
👉 https://supabase.com/dashboard → Your Project → **SQL Editor**

### **Step 2: Run This SQL**

```sql
-- Create system user for bulk imports
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
    is_super_admin,
    confirmed_at
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
    false,
    NOW()
)
ON CONFLICT (id) DO NOTHING;
```

### **Step 3: Verify It Worked**

Run this to check:
```sql
SELECT id, email, raw_user_meta_data->>'full_name' as name
FROM auth.users 
WHERE id = '00000000-0000-0000-0000-000000000000';
```

Should return:
```
id: 00000000-0000-0000-0000-000000000000
email: system@bulk-import.internal
name: Bulk Import System
```

### **Step 4: Retry Import**

1. **Refresh Figma Make** (F5)
2. **Upload CSV**
3. **Click Import**
4. ✅ **Should work now!**

---

## 🎯 Why This Works

- Creates a valid user in `auth.users` with the exact UUID the bulk import uses
- Satisfies the foreign key constraint
- Password is unusable (can't be logged into)
- Marked as system user in metadata
- Safe and reversible

---

## 📋 Alternative: Use SQL Script File

I've created `/database/00-create-system-user.sql` with the same SQL.

You can run that file instead if you prefer!

---

## ⏱️ Time Required

- **30 seconds** to create system user
- **7-11 minutes** for bulk import

**Total: ~12 minutes to complete import!**

---

## 🔒 Security Notes

**Is this safe?**
- ✅ Yes! The system user has an unusable encrypted password
- ✅ Cannot be logged into via Supabase Auth
- ✅ Only used for bulk import `created_by` field
- ✅ Marked as `is_system: true` in metadata
- ✅ Standard practice for system operations

**Can I delete it later?**
- ⚠️ Only if you delete all bulk-imported events first
- ✅ Or keep it - it's harmless and useful for future imports

---

## 🎉 After Fix

Your import will succeed and create:

```
✅ 124,958 sale events
✅ ~45,000 products
✅ ~45,000 variants
✅ All with created_by = 00000000-0000-0000-0000-000000000000
```

---

**👉 RUN THE SQL NOW IN SUPABASE!** 🚀

**Then retry your import!** ✅
