-- 🔧 FIX LOCATIONS TABLE
-- This will update the existing locations table to match the new schema

-- ============================================
-- DROP AND RECREATE LOCATIONS TABLE
-- ============================================

-- Drop the table (this will also drop dependent foreign keys)
DROP TABLE IF EXISTS locations CASCADE;

-- Recreate with full schema
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

-- Create indexes
CREATE INDEX idx_locations_type ON locations(location_type);
CREATE INDEX idx_locations_active ON locations(is_active);

-- Insert default locations
INSERT INTO locations (id, location_name, location_type, address, city, state, is_active)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Main Store - Mumbai', 'STORE', 'Main Location', 'Mumbai', 'Maharashtra', true),
  ('00000000-0000-0000-0000-000000000002', 'Central Godown', 'GODOWN', 'Warehouse Area', 'Mumbai', 'Maharashtra', true);

-- Enable RLS
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Everyone can read locations" ON locations;
CREATE POLICY "Everyone can read locations"
  ON locations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Owners can manage locations" ON locations;
CREATE POLICY "Owners can manage locations"
  ON locations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'OWNER'
    )
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

SELECT '✅ Locations table fixed!' as status;
SELECT * FROM locations;
