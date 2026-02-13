-- 🔐 CREATE OWNER USER ONLY
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Create owner in Supabase Dashboard
-- ============================================
-- 1. Go to: Supabase Dashboard → Authentication → Users
-- 2. Click: "Add User" → "Create New User"
-- 3. Email: owner@jariwala.com
-- 4. Password: owner123
-- 5. ✅ Check "Auto Confirm Email"
-- 6. Click "Create User"

-- ============================================
-- STEP 2: Link owner to users table
-- ============================================

DO $$
DECLARE
  v_owner_id UUID;
  v_location_id UUID;
BEGIN
  -- Get first STORE location (or create one if doesn't exist)
  SELECT id INTO v_location_id FROM locations WHERE location_type = 'STORE' LIMIT 1;
  
  -- If no location exists, create one
  IF v_location_id IS NULL THEN
    INSERT INTO locations (location_name, location_type, address, city, state, is_active)
    VALUES ('Main Store', 'STORE', 'Main Location', 'Mumbai', 'Maharashtra', true)
    RETURNING id INTO v_location_id;
    
    RAISE NOTICE 'Created default location: %', v_location_id;
  END IF;
  
  -- Get auth user ID for owner
  SELECT id INTO v_owner_id FROM auth.users WHERE email = 'owner@jariwala.com';
  
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Owner auth user not found! Create in Supabase Dashboard first: owner@jariwala.com';
  END IF;
  
  -- Insert/update owner in users table
  INSERT INTO users (
    id, 
    email, 
    username, 
    full_name, 
    role, 
    location_id, 
    is_active,
    phone
  )
  VALUES (
    v_owner_id,
    'owner@jariwala.com',
    'jariwala_owner',
    'Mr. Jariwala',
    'OWNER',
    v_location_id,
    true,
    '+91 98765 43210'
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    location_id = EXCLUDED.location_id,
    is_active = EXCLUDED.is_active;
  
  RAISE NOTICE '✅ Owner user created successfully!';
  RAISE NOTICE 'Email: owner@jariwala.com';
  RAISE NOTICE 'Password: owner123';
  RAISE NOTICE 'User ID: %', v_owner_id;
  RAISE NOTICE 'Location ID: %', v_location_id;
  
END $$;

-- ============================================
-- STEP 3: Verify owner created
-- ============================================

SELECT 
  u.email,
  u.username,
  u.full_name,
  u.role,
  l.location_name,
  u.is_active,
  u.created_at
FROM users u
LEFT JOIN locations l ON l.id = u.location_id
WHERE u.email = 'owner@jariwala.com';

-- Expected output:
-- email: owner@jariwala.com
-- username: jariwala_owner
-- full_name: Mr. Jariwala
-- role: OWNER
-- location_name: Main Store (or your location name)
-- is_active: true

-- ============================================
-- ✅ DONE! Now you can login and create other users from the app!
-- ============================================
