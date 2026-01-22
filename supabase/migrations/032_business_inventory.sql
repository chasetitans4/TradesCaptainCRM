-- =====================================================
-- BUSINESS INVENTORY SYSTEM
-- Migration: 032_business_inventory.sql
-- Tracks tools, gear, chemicals, and supplies for technicians
-- =====================================================

-- 1. INVENTORY CATEGORIES (hierarchical)
CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
  icon TEXT DEFAULT 'box',
  color TEXT DEFAULT '#6B7280',
  sort_order INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient category lookups
CREATE INDEX IF NOT EXISTS idx_inventory_categories_business ON inventory_categories(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_categories_parent ON inventory_categories(parent_category_id);

-- 2. BUSINESS INVENTORY ITEMS
CREATE TABLE IF NOT EXISTS business_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES inventory_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  purchase_date DATE,
  purchase_price DECIMAL(10,2),
  current_value DECIMAL(10,2),
  warranty_expires DATE,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_vehicle TEXT,
  location TEXT,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'retired', 'lost')),
  condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
  last_maintenance DATE,
  next_maintenance DATE,
  quantity INTEGER DEFAULT 1,
  min_quantity INTEGER,
  photo_urls TEXT[],
  specifications JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_business_inventory_business ON business_inventory(business_id);
CREATE INDEX IF NOT EXISTS idx_business_inventory_category ON business_inventory(category_id);
CREATE INDEX IF NOT EXISTS idx_business_inventory_assigned ON business_inventory(assigned_to);
CREATE INDEX IF NOT EXISTS idx_business_inventory_status ON business_inventory(business_id, status);
CREATE INDEX IF NOT EXISTS idx_business_inventory_low_stock ON business_inventory(business_id)
  WHERE quantity <= min_quantity AND min_quantity IS NOT NULL;

-- 3. JOB INVENTORY USAGE (track what was used on each job)
CREATE TABLE IF NOT EXISTS job_inventory_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES business_inventory(id) ON DELETE CASCADE,
  quantity_used INTEGER DEFAULT 1,
  unit_cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, inventory_id)
);

CREATE INDEX IF NOT EXISTS idx_job_inventory_job ON job_inventory_usage(job_id);
CREATE INDEX IF NOT EXISTS idx_job_inventory_item ON job_inventory_usage(inventory_id);

-- 4. ENABLE RLS
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_inventory_usage ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES

-- Inventory Categories
DROP POLICY IF EXISTS "Users can view their business inventory categories" ON inventory_categories;
CREATE POLICY "Users can view their business inventory categories" ON inventory_categories
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
    OR business_id IS NULL -- Allow viewing default categories
  );

DROP POLICY IF EXISTS "Users can manage their business inventory categories" ON inventory_categories;
CREATE POLICY "Users can manage their business inventory categories" ON inventory_categories
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

-- Business Inventory
DROP POLICY IF EXISTS "Users can view their business inventory" ON business_inventory;
CREATE POLICY "Users can view their business inventory" ON business_inventory
  FOR SELECT USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage their business inventory" ON business_inventory;
CREATE POLICY "Users can manage their business inventory" ON business_inventory
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

-- Job Inventory Usage
DROP POLICY IF EXISTS "Users can view job inventory usage" ON job_inventory_usage;
CREATE POLICY "Users can view job inventory usage" ON job_inventory_usage
  FOR SELECT USING (
    job_id IN (
      SELECT id FROM jobs WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can manage job inventory usage" ON job_inventory_usage;
CREATE POLICY "Users can manage job inventory usage" ON job_inventory_usage
  FOR ALL USING (
    job_id IN (
      SELECT id FROM jobs WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
    )
  );

-- Service role access
DROP POLICY IF EXISTS "Service role full access inventory_categories" ON inventory_categories;
CREATE POLICY "Service role full access inventory_categories" ON inventory_categories
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access business_inventory" ON business_inventory;
CREATE POLICY "Service role full access business_inventory" ON business_inventory
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role full access job_inventory_usage" ON job_inventory_usage;
CREATE POLICY "Service role full access job_inventory_usage" ON job_inventory_usage
  FOR ALL USING (auth.role() = 'service_role');

-- 6. SEED DEFAULT CATEGORIES (global, no business_id)
INSERT INTO inventory_categories (business_id, name, icon, color, sort_order, is_default) VALUES
  (NULL, 'Hand Tools', 'wrench', '#3B82F6', 1, true),
  (NULL, 'Power Tools', 'zap', '#F59E0B', 2, true),
  (NULL, 'Diagnostic Equipment', 'activity', '#10B981', 3, true),
  (NULL, 'Safety Gear', 'shield', '#EF4444', 4, true),
  (NULL, 'Consumables', 'package', '#8B5CF6', 5, true),
  (NULL, 'Chemicals', 'flask-conical', '#EC4899', 6, true),
  (NULL, 'Parts & Components', 'cpu', '#06B6D4', 7, true),
  (NULL, 'Specialty Tools', 'tool', '#F97316', 8, true),
  (NULL, 'Vehicles & Trailers', 'truck', '#6366F1', 9, true),
  (NULL, 'Ladders & Access', 'arrow-up', '#84CC16', 10, true),
  (NULL, 'Heavy Equipment', 'hard-hat', '#78716C', 11, true),
  (NULL, 'Office & Tech', 'laptop', '#64748B', 12, true)
ON CONFLICT DO NOTHING;

-- 7. SUBCATEGORIES - Trade specific (will be seeded as children)
-- Get parent IDs and insert subcategories
DO $$
DECLARE
  hand_tools_id UUID;
  power_tools_id UUID;
  diagnostic_id UUID;
  chemicals_id UUID;
  specialty_id UUID;
BEGIN
  -- Get parent category IDs
  SELECT id INTO hand_tools_id FROM inventory_categories WHERE name = 'Hand Tools' AND is_default = true;
  SELECT id INTO power_tools_id FROM inventory_categories WHERE name = 'Power Tools' AND is_default = true;
  SELECT id INTO diagnostic_id FROM inventory_categories WHERE name = 'Diagnostic Equipment' AND is_default = true;
  SELECT id INTO chemicals_id FROM inventory_categories WHERE name = 'Chemicals' AND is_default = true;
  SELECT id INTO specialty_id FROM inventory_categories WHERE name = 'Specialty Tools' AND is_default = true;

  -- Hand Tools subcategories
  INSERT INTO inventory_categories (business_id, name, parent_category_id, icon, sort_order, is_default) VALUES
    (NULL, 'Wrenches', hand_tools_id, 'wrench', 1, true),
    (NULL, 'Screwdrivers', hand_tools_id, 'minus', 2, true),
    (NULL, 'Pliers', hand_tools_id, 'grip-vertical', 3, true),
    (NULL, 'Hammers', hand_tools_id, 'hammer', 4, true),
    (NULL, 'Measuring Tools', hand_tools_id, 'ruler', 5, true)
  ON CONFLICT DO NOTHING;

  -- Power Tools subcategories
  INSERT INTO inventory_categories (business_id, name, parent_category_id, icon, sort_order, is_default) VALUES
    (NULL, 'Drills', power_tools_id, 'circle-dot', 1, true),
    (NULL, 'Saws', power_tools_id, 'scissors', 2, true),
    (NULL, 'Grinders', power_tools_id, 'disc', 3, true),
    (NULL, 'Impact Drivers', power_tools_id, 'zap', 4, true)
  ON CONFLICT DO NOTHING;

  -- Diagnostic Equipment subcategories
  INSERT INTO inventory_categories (business_id, name, parent_category_id, icon, sort_order, is_default) VALUES
    (NULL, 'Electrical Testers', diagnostic_id, 'zap', 1, true),
    (NULL, 'HVAC Diagnostics', diagnostic_id, 'thermometer', 2, true),
    (NULL, 'Cameras & Scopes', diagnostic_id, 'camera', 3, true),
    (NULL, 'Leak Detection', diagnostic_id, 'droplet', 4, true)
  ON CONFLICT DO NOTHING;

  -- Chemicals subcategories
  INSERT INTO inventory_categories (business_id, name, parent_category_id, icon, sort_order, is_default) VALUES
    (NULL, 'Refrigerants', chemicals_id, 'snowflake', 1, true),
    (NULL, 'Cleaners', chemicals_id, 'sparkles', 2, true),
    (NULL, 'Sealants', chemicals_id, 'droplet', 3, true),
    (NULL, 'Lubricants', chemicals_id, 'droplets', 4, true)
  ON CONFLICT DO NOTHING;

  -- Specialty Tools subcategories (HVAC/Plumbing specific)
  INSERT INTO inventory_categories (business_id, name, parent_category_id, icon, sort_order, is_default) VALUES
    (NULL, 'Pipe Tools', specialty_id, 'cylinder', 1, true),
    (NULL, 'HVAC Tools', specialty_id, 'wind', 2, true),
    (NULL, 'Electrical Tools', specialty_id, 'plug', 3, true),
    (NULL, 'Brazing & Soldering', specialty_id, 'flame', 4, true)
  ON CONFLICT DO NOTHING;
END $$;

-- 8. UPDATE TRIGGER for updated_at
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_inventory_categories_updated_at ON inventory_categories;
CREATE TRIGGER update_inventory_categories_updated_at
  BEFORE UPDATE ON inventory_categories
  FOR EACH ROW EXECUTE FUNCTION update_inventory_updated_at();

DROP TRIGGER IF EXISTS update_business_inventory_updated_at ON business_inventory;
CREATE TRIGGER update_business_inventory_updated_at
  BEFORE UPDATE ON business_inventory
  FOR EACH ROW EXECUTE FUNCTION update_inventory_updated_at();
