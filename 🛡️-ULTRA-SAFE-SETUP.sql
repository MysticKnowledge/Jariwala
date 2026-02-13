-- 🛡️ ULTRA SAFE DATABASE SETUP
-- This version handles ALL existing tables and recreates them properly
-- Run this as ONE script - it will clean up and rebuild everything

-- ============================================
-- STEP 1: DROP ALL EXISTING TABLES
-- ============================================

-- Drop in correct order (dependencies first)
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS locations CASCADE;

-- Drop the update function if it exists
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================
-- STEP 2: CREATE UPDATE FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 3: CREATE LOCATIONS TABLE
-- ============================================

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_name TEXT NOT NULL,
  location_type TEXT NOT NULL CHECK (location_type IN ('STORE', 'GODOWN')),
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  phone TEXT,
  gst_number TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_locations_type ON locations(location_type);
CREATE INDEX idx_locations_active ON locations(is_active);

-- Insert default locations
INSERT INTO locations (id, location_name, location_type, address, city, state, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Main Store - Mumbai', 'STORE', 'Main Location', 'Mumbai', 'Maharashtra', true),
  ('00000000-0000-0000-0000-000000000002', 'Central Godown', 'GODOWN', 'Warehouse Area', 'Mumbai', 'Maharashtra', true);

-- RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read locations"
  ON locations FOR SELECT
  USING (true);

CREATE POLICY "Owners can manage locations"
  ON locations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'OWNER'
    )
  );

-- Trigger
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 4: CREATE USERS TABLE
-- ============================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'STORE_STAFF', 'GODOWN_STAFF')),
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_location ON users(location_id);
CREATE INDEX idx_users_active ON users(is_active);

-- RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Owners can manage all users"
  ON users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'OWNER'
    )
  );

-- Trigger
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 5: CREATE AUDIT_LOG TABLE
-- ============================================

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own audit logs"
  ON audit_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Owners can read all audit logs"
  ON audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'OWNER'
    )
  );

CREATE POLICY "System can insert audit logs"
  ON audit_log FOR INSERT
  WITH CHECK (true);

-- ============================================
-- STEP 6: VERIFICATION
-- ============================================

-- Check all tables exist
SELECT 
  'locations' as table_name, 
  COUNT(*) as row_count 
FROM locations
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'audit_log', COUNT(*) FROM audit_log;

-- Show locations
SELECT 
  id, 
  location_name, 
  location_type, 
  city,
  is_active 
FROM locations 
ORDER BY location_type, location_name;

-- ============================================
-- ✅ SUCCESS!
-- ============================================

SELECT '✅ Database setup complete!' as status;
SELECT '👤 Next: Create owner user in Authentication' as step_2;
SELECT '🔗 Then: Run /🔐-CREATE-OWNER-ONLY.sql' as step_3;
SELECT '🛒 Finally: Run /📋-SALES-TABLES-SCHEMA.sql' as step_4;
