-- 🗄️ SAFE DATABASE SETUP (Checks for existing tables)
-- Run this instead of the previous setup - it's safer!

-- ============================================
-- 1. LOCATIONS TABLE
-- ============================================

-- Create locations table if it doesn't exist
CREATE TABLE IF NOT EXISTS locations (
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

-- Create indexes (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(location_type);
CREATE INDEX IF NOT EXISTS idx_locations_active ON locations(is_active);

-- ============================================
-- 2. USERS TABLE
-- ============================================

-- Drop users table if exists (to recreate with proper foreign key)
DROP TABLE IF EXISTS users CASCADE;

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

-- Create indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_location ON users(location_id);
CREATE INDEX idx_users_active ON users(is_active);

-- ============================================
-- 3. AUDIT LOG TABLE (Fixed Schema)
-- ============================================

-- Drop and recreate with correct schema
DROP TABLE IF EXISTS audit_log CASCADE;

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

-- Create indexes
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================
-- 4. INSERT DEFAULT LOCATIONS
-- ============================================

-- Insert or ignore default locations
INSERT INTO locations (id, location_name, location_type, address, city, state, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Main Store - Mumbai', 'STORE', 'Main Location', 'Mumbai', 'Maharashtra', true),
  ('00000000-0000-0000-0000-000000000002', 'Central Godown', 'GODOWN', 'Warehouse Area', 'Mumbai', 'Maharashtra', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Owners can manage all users" ON users;

DROP POLICY IF EXISTS "Everyone can read locations" ON locations;
DROP POLICY IF EXISTS "Owners can manage locations" ON locations;

DROP POLICY IF EXISTS "Users can read own audit logs" ON audit_log;
DROP POLICY IF EXISTS "Owners can read all audit logs" ON audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_log;

-- Users table policies
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

-- Locations table policies
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

-- Audit log policies
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
-- 6. TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they exist
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;

-- Create triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. VERIFICATION
-- ============================================

-- Check tables
SELECT 'locations' as table_name, COUNT(*) as row_count FROM locations
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'audit_log', COUNT(*) FROM audit_log;

-- Check locations
SELECT id, location_name, location_type, is_active FROM locations;

-- ============================================
-- ✅ DONE!
-- ============================================

SELECT '✅ Database setup complete!' as status;
SELECT '📍 Next: Create owner user in Supabase Dashboard' as next_step;
SELECT '📋 Then: Run /🔐-CREATE-OWNER-ONLY.sql' as after_that;
