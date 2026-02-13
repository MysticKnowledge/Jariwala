# 🔐 **CREATE USERS - FIXED METHOD**

## ❌ **Why the Error Happened:**

You can't directly insert into `auth.users` - Supabase manages that table through its Auth service.

## ✅ **Correct Way to Create Users:**

---

## **METHOD 1: Supabase Dashboard (EASIEST - RECOMMENDED)**

### **Step 1: Create Auth Users in Dashboard**

1. Go to your Supabase Dashboard
2. Navigate to: **Authentication** → **Users**
3. Click **"Add User"** → **"Create New User"**
4. Create these 4 users:

| Email | Password | Auto Confirm Email |
|-------|----------|-------------------|
| owner@jariwala.com | owner123 | ✅ YES |
| manager@jariwala.com | manager123 | ✅ YES |
| staff@jariwala.com | staff123 | ✅ YES |
| godown@jariwala.com | godown123 | ✅ YES |

**Important:** Check "Auto Confirm Email" for all users!

### **Step 2: Link Users to Your Users Table**

After creating the auth users, run this SQL in **Supabase SQL Editor**:

```sql
-- Link auth users to your users table
DO $$
DECLARE
  v_owner_id UUID;
  v_manager_id UUID;
  v_staff_id UUID;
  v_godown_id UUID;
  v_location_id UUID;
BEGIN
  -- Get first location (you can change this to specific locations)
  SELECT id INTO v_location_id FROM locations WHERE location_type = 'STORE' LIMIT 1;
  
  -- Get auth user IDs
  SELECT id INTO v_owner_id FROM auth.users WHERE email = 'owner@jariwala.com';
  SELECT id INTO v_manager_id FROM auth.users WHERE email = 'manager@jariwala.com';
  SELECT id INTO v_staff_id FROM auth.users WHERE email = 'staff@jariwala.com';
  SELECT id INTO v_godown_id FROM auth.users WHERE email = 'godown@jariwala.com';
  
  -- Insert into users table (only if they don't exist)
  INSERT INTO users (id, email, username, full_name, role, location_id, is_active)
  VALUES 
    (v_owner_id, 'owner@jariwala.com', 'jariwala_owner', 'Mr. Jariwala', 'OWNER', v_location_id, true),
    (v_manager_id, 'manager@jariwala.com', 'store_manager', 'Store Manager', 'MANAGER', v_location_id, true),
    (v_staff_id, 'staff@jariwala.com', 'store_staff_1', 'Store Staff', 'STORE_STAFF', v_location_id, true)
  ON CONFLICT (id) DO NOTHING;
  
  -- Godown staff needs a godown location
  SELECT id INTO v_location_id FROM locations WHERE location_type = 'GODOWN' LIMIT 1;
  
  INSERT INTO users (id, email, username, full_name, role, location_id, is_active)
  VALUES 
    (v_godown_id, 'godown@jariwala.com', 'godown_staff_1', 'Godown Staff', 'GODOWN_STAFF', v_location_id, true)
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Users created successfully!';
END $$;
```

---

## **METHOD 2: Supabase Admin API (For Developers)**

If you want to automate user creation, use the Supabase Admin API:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-service-role-key' // ⚠️ Use service role key (keep secret!)
);

// Create user
const { data, error } = await supabase.auth.admin.createUser({
  email: 'owner@jariwala.com',
  password: 'owner123',
  email_confirm: true, // Auto-confirm email
  user_metadata: {
    full_name: 'Mr. Jariwala',
    role: 'OWNER'
  }
});

if (data.user) {
  // Then insert into users table
  await supabase.from('users').insert({
    id: data.user.id,
    email: 'owner@jariwala.com',
    username: 'jariwala_owner',
    full_name: 'Mr. Jariwala',
    role: 'OWNER',
    location_id: 'your-location-id'
  });
}
```

---

## **METHOD 3: SQL Function (Advanced)**

Create a helper function to create users:

```sql
-- Create function to add users
CREATE OR REPLACE FUNCTION create_test_user(
  p_email TEXT,
  p_password TEXT,
  p_username TEXT,
  p_full_name TEXT,
  p_role TEXT,
  p_location_id UUID
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Note: This still requires using Supabase Admin API or Dashboard
  -- This function only handles the users table part
  
  -- Get user ID from auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth user % not found. Create in Dashboard first!', p_email;
  END IF;
  
  -- Insert into users table
  INSERT INTO users (id, email, username, full_name, role, location_id, is_active)
  VALUES (v_user_id, p_email, p_username, p_full_name, p_role, p_location_id, true)
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    location_id = EXCLUDED.location_id;
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Usage (after creating auth users in dashboard):
/*
SELECT create_test_user(
  'owner@jariwala.com',
  'owner123',
  'jariwala_owner',
  'Mr. Jariwala',
  'OWNER',
  (SELECT id FROM locations WHERE location_type = 'STORE' LIMIT 1)
);
*/
```

---

## **QUICK START GUIDE:**

### **✅ Step-by-Step (5 minutes):**

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Select your project

2. **Create Auth Users**
   - Click: **Authentication** → **Users** → **Add User**
   - Create owner@jariwala.com with password: owner123
   - Check "Auto Confirm Email"
   - Click "Create User"
   - Repeat for manager, staff, godown

3. **Link to Users Table**
   - Go to: **SQL Editor**
   - Copy the SQL from "Step 2: Link Users to Your Users Table" above
   - Click "Run"
   - ✅ Done!

4. **Test Login**
   - Go to your app
   - Login with: owner@jariwala.com / owner123
   - ✅ Should work!

---

## **Verify Users Created:**

```sql
-- Check auth users
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users 
WHERE email LIKE '%jariwala.com'
ORDER BY created_at DESC;

-- Check users table
SELECT id, email, username, role, location_id 
FROM users 
WHERE email LIKE '%jariwala.com'
ORDER BY created_at DESC;

-- Check if they're linked correctly
SELECT 
  au.email,
  u.username,
  u.full_name,
  u.role,
  l.location_name
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
LEFT JOIN locations l ON l.id = u.location_id
WHERE au.email LIKE '%jariwala.com';
```

Expected output:
```
email                  | username        | full_name     | role         | location_name
----------------------|-----------------|---------------|--------------|---------------
owner@jariwala.com    | jariwala_owner  | Mr. Jariwala  | OWNER        | Main Store
manager@jariwala.com  | store_manager   | Store Manager | MANAGER      | Main Store
staff@jariwala.com    | store_staff_1   | Store Staff   | STORE_STAFF  | Main Store
godown@jariwala.com   | godown_staff_1  | Godown Staff  | GODOWN_STAFF | Central Godown
```

---

## **Troubleshooting:**

### **Error: "User not found"**
- Make sure you created the auth user in Dashboard first
- Check: Authentication → Users

### **Error: "Location not found"**
- Make sure you have locations in your `locations` table
- Run: `SELECT * FROM locations;`
- If empty, create locations first

### **Error: "Duplicate key"**
- User already exists in users table
- Run: `SELECT * FROM users WHERE email = 'owner@jariwala.com';`
- If exists, you can update instead of insert

---

## **Creating Locations (if needed):**

If you don't have locations yet:

```sql
-- Create sample locations
INSERT INTO locations (location_name, location_type, address, city, state, is_active)
VALUES 
  ('Main Store - Mumbai', 'STORE', 'Shop 1, ABC Complex', 'Mumbai', 'Maharashtra', true),
  ('Branch Store - Pune', 'STORE', 'Shop 5, XYZ Mall', 'Pune', 'Maharashtra', true),
  ('Central Godown', 'GODOWN', 'Warehouse A, Industrial Area', 'Mumbai', 'Maharashtra', true)
ON CONFLICT DO NOTHING;

-- Verify
SELECT * FROM locations;
```

---

## **Summary:**

✅ **Do this:**
1. Create users in Supabase Dashboard → Authentication → Users
2. Run SQL to link them to users table
3. Test login

❌ **Don't do this:**
1. Don't try to INSERT directly into auth.users
2. Don't use raw SQL to create auth users
3. Don't skip email confirmation

---

## 🎉 **YOU'RE READY!**

Once you've created the users:
- ✅ Login with owner@jariwala.com / owner123
- ✅ Access POS system
- ✅ Complete real sales
- ✅ Everything works!

**Questions? Having issues? Let me know!** 🚀
