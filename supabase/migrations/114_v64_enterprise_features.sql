-- =====================================================
-- V6.4 ENTERPRISE FEATURES MIGRATION
-- Multi-location, Equipment Tracking, Recurring Jobs, Inventory
-- Performance Indexes, Cost Optimizations
-- =====================================================

-- =====================================================
-- 1. MULTI-LOCATION SUPPORT (Franchise Businesses)
-- =====================================================

-- Business locations table
CREATE TABLE IF NOT EXISTS business_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  phone TEXT,
  email TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_headquarters BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  operating_hours JSONB DEFAULT '{}',
  service_area_radius_miles INTEGER DEFAULT 25,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add location reference to key tables
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES business_locations(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS primary_location_id UUID REFERENCES business_locations(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_location_id UUID REFERENCES business_locations(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES business_locations(id);

-- Location-based indexes
CREATE INDEX IF NOT EXISTS idx_business_locations_business
  ON business_locations(business_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_jobs_location
  ON jobs(location_id, scheduled_date) WHERE location_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_location
  ON users(assigned_location_id) WHERE assigned_location_id IS NOT NULL;

-- =====================================================
-- 2. EQUIPMENT TRACKING (Customer Assets)
-- =====================================================

-- Equipment types catalog
CREATE TABLE IF NOT EXISTS equipment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  manufacturer TEXT,
  default_warranty_months INTEGER DEFAULT 12,
  maintenance_interval_days INTEGER,
  service_checklist_id UUID REFERENCES service_checklists(id),
  estimated_lifespan_years INTEGER,
  default_labor_hours DECIMAL(4, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, name)
);

-- Enhanced customer equipment with tracking
ALTER TABLE customer_equipment
  ADD COLUMN IF NOT EXISTS equipment_type_id UUID REFERENCES equipment_types(id),
  ADD COLUMN IF NOT EXISTS last_service_date DATE,
  ADD COLUMN IF NOT EXISTS next_service_date DATE,
  ADD COLUMN IF NOT EXISTS service_history JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS qr_code TEXT,
  ADD COLUMN IF NOT EXISTS asset_tag TEXT,
  ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS replacement_cost DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS efficiency_rating TEXT,
  ADD COLUMN IF NOT EXISTS refrigerant_type TEXT,
  ADD COLUMN IF NOT EXISTS refrigerant_charge_oz DECIMAL(6, 2);

-- Equipment service log (detailed history)
CREATE TABLE IF NOT EXISTS equipment_service_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES customer_equipment(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL, -- 'maintenance', 'repair', 'install', 'inspection'
  service_date DATE NOT NULL DEFAULT CURRENT_DATE,
  technician_id UUID REFERENCES users(id),
  notes TEXT,
  parts_used JSONB DEFAULT '[]',
  labor_hours DECIMAL(4, 2),
  total_cost DECIMAL(10, 2),
  condition_before TEXT, -- 'excellent', 'good', 'fair', 'poor'
  condition_after TEXT,
  readings JSONB DEFAULT '{}', -- temperature, pressure, etc.
  photos JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment indexes
CREATE INDEX IF NOT EXISTS idx_equipment_types_business
  ON equipment_types(business_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_equipment_next_service
  ON customer_equipment(business_id, next_service_date)
  WHERE status = 'active' AND next_service_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_equipment_service_log
  ON equipment_service_log(equipment_id, service_date DESC);

CREATE INDEX IF NOT EXISTS idx_equipment_qr
  ON customer_equipment(qr_code) WHERE qr_code IS NOT NULL;

-- =====================================================
-- 3. RECURRING JOB TEMPLATES
-- =====================================================

-- Recurring job templates (schedules repeat automatically)
CREATE TABLE IF NOT EXISTS recurring_job_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  service_type TEXT,
  estimated_duration_minutes INTEGER DEFAULT 60,
  price DECIMAL(10, 2),

  -- Recurrence pattern
  frequency TEXT NOT NULL, -- 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semiannually', 'annually'
  interval_count INTEGER DEFAULT 1, -- e.g., every 2 weeks = frequency='weekly', interval=2
  day_of_week INTEGER[], -- 0=Sun, 1=Mon, etc. (for weekly)
  day_of_month INTEGER, -- 1-31 (for monthly)
  month_of_year INTEGER, -- 1-12 (for annual)
  preferred_time TIME,
  time_window_start TIME,
  time_window_end TIME,

  -- Assignment
  assigned_to UUID REFERENCES users(id),
  location_id UUID REFERENCES business_locations(id),

  -- Generation settings
  auto_generate BOOLEAN DEFAULT true,
  generate_days_ahead INTEGER DEFAULT 14,
  require_confirmation BOOLEAN DEFAULT false,

  -- Tracking
  last_generated_date DATE,
  next_generation_date DATE,
  total_jobs_created INTEGER DEFAULT 0,

  -- Service agreement link
  service_agreement_id UUID REFERENCES service_agreements(id),
  equipment_id UUID REFERENCES customer_equipment(id),

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs created from templates track their source
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS recurring_template_id UUID REFERENCES recurring_job_templates(id),
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;

-- Indexes for recurring jobs
CREATE INDEX IF NOT EXISTS idx_recurring_templates_business
  ON recurring_job_templates(business_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_recurring_templates_generation
  ON recurring_job_templates(next_generation_date, auto_generate)
  WHERE is_active = true AND auto_generate = true;

CREATE INDEX IF NOT EXISTS idx_recurring_templates_customer
  ON recurring_job_templates(customer_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_jobs_recurring
  ON jobs(recurring_template_id) WHERE recurring_template_id IS NOT NULL;

-- =====================================================
-- 4. INVENTORY MANAGEMENT (Parts & Materials)
-- =====================================================

-- Inventory items catalog
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  brand TEXT,
  unit_of_measure TEXT DEFAULT 'each', -- 'each', 'ft', 'lb', 'gal', 'box'

  -- Pricing
  cost_price DECIMAL(10, 2),
  retail_price DECIMAL(10, 2),
  markup_percentage DECIMAL(5, 2),

  -- Stock levels
  quantity_on_hand INTEGER DEFAULT 0,
  minimum_stock_level INTEGER DEFAULT 0,
  reorder_quantity INTEGER,

  -- Location
  location_id UUID REFERENCES business_locations(id),
  storage_location TEXT, -- bin/shelf location

  -- Tracking
  is_serialized BOOLEAN DEFAULT false,
  track_lot_numbers BOOLEAN DEFAULT false,

  -- Supplier info
  preferred_supplier TEXT,
  supplier_part_number TEXT,
  lead_time_days INTEGER,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory transactions (stock movements)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL, -- 'purchase', 'sale', 'job_use', 'adjustment', 'transfer', 'return'
  quantity INTEGER NOT NULL, -- positive = add, negative = remove
  unit_cost DECIMAL(10, 2),

  -- Reference
  job_id UUID REFERENCES jobs(id),
  invoice_id UUID REFERENCES invoices(id),
  purchase_order_id UUID,

  -- Details
  notes TEXT,
  lot_number TEXT,
  serial_number TEXT,

  -- Location (for transfers)
  from_location_id UUID REFERENCES business_locations(id),
  to_location_id UUID REFERENCES business_locations(id),

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parts used on jobs
CREATE TABLE IF NOT EXISTS job_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  item_id UUID REFERENCES inventory_items(id),
  custom_name TEXT, -- for non-inventory items
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost DECIMAL(10, 2),
  unit_price DECIMAL(10, 2),
  total_price DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_items_business
  ON inventory_items(business_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_inventory_low_stock
  ON inventory_items(business_id, quantity_on_hand)
  WHERE is_active = true AND quantity_on_hand <= minimum_stock_level;

CREATE INDEX IF NOT EXISTS idx_inventory_sku
  ON inventory_items(business_id, sku) WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item
  ON inventory_transactions(item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_job
  ON inventory_transactions(job_id) WHERE job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_parts_job
  ON job_parts(job_id);

-- =====================================================
-- 5. ADDITIONAL PERFORMANCE INDEXES
-- =====================================================

-- High-traffic query optimizations
CREATE INDEX IF NOT EXISTS idx_payments_business_date
  ON payments(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_conversations_business_updated
  ON sms_conversations(business_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_reminders_due
  ON reminders(user_id, due_at)
  WHERE is_completed = false;

CREATE INDEX IF NOT EXISTS idx_scheduled_messages_pending
  ON scheduled_messages(scheduled_for, status)
  WHERE status = 'pending';

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_jobs_business_status_date
  ON jobs(business_id, status, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_invoices_business_status_date
  ON invoices(business_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customers_business_created
  ON customers(business_id, created_at DESC);

-- =====================================================
-- 6. RLS POLICIES FOR NEW TABLES
-- =====================================================

ALTER TABLE business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_service_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_job_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_parts ENABLE ROW LEVEL SECURITY;

-- Business locations policies
CREATE POLICY "Users can view their business locations" ON business_locations
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage business locations" ON business_locations
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Equipment types policies
CREATE POLICY "Users can view equipment types" ON equipment_types
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage equipment types" ON equipment_types
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Equipment service log policies
CREATE POLICY "Users can view equipment service logs" ON equipment_service_log
  FOR SELECT USING (
    equipment_id IN (
      SELECT ce.id FROM customer_equipment ce
      JOIN customers c ON ce.customer_id = c.id
      WHERE c.business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can create service logs" ON equipment_service_log
  FOR INSERT WITH CHECK (
    equipment_id IN (
      SELECT ce.id FROM customer_equipment ce
      JOIN customers c ON ce.customer_id = c.id
      WHERE c.business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
    )
  );

-- Recurring templates policies
CREATE POLICY "Users can view recurring templates" ON recurring_job_templates
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage recurring templates" ON recurring_job_templates
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin', 'dispatcher')
    )
  );

-- Inventory policies
CREATE POLICY "Users can view inventory" ON inventory_items
  FOR SELECT USING (
    business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage inventory" ON inventory_items
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM users
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view inventory transactions" ON inventory_transactions
  FOR SELECT USING (
    item_id IN (
      SELECT id FROM inventory_items
      WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can create inventory transactions" ON inventory_transactions
  FOR INSERT WITH CHECK (
    item_id IN (
      SELECT id FROM inventory_items
      WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can view job parts" ON job_parts
  FOR SELECT USING (
    job_id IN (
      SELECT id FROM jobs
      WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage job parts" ON job_parts
  FOR ALL USING (
    job_id IN (
      SELECT id FROM jobs
      WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
    )
  );

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Function to generate recurring jobs
CREATE OR REPLACE FUNCTION generate_recurring_jobs()
RETURNS INTEGER AS $$
DECLARE
  template RECORD;
  job_count INTEGER := 0;
  next_date DATE;
BEGIN
  FOR template IN
    SELECT * FROM recurring_job_templates
    WHERE is_active = true
    AND auto_generate = true
    AND (next_generation_date IS NULL OR next_generation_date <= CURRENT_DATE)
  LOOP
    -- Calculate next job date based on frequency
    next_date := COALESCE(template.last_generated_date, CURRENT_DATE);

    CASE template.frequency
      WHEN 'daily' THEN
        next_date := next_date + (template.interval_count || ' days')::INTERVAL;
      WHEN 'weekly' THEN
        next_date := next_date + (template.interval_count * 7 || ' days')::INTERVAL;
      WHEN 'biweekly' THEN
        next_date := next_date + (template.interval_count * 14 || ' days')::INTERVAL;
      WHEN 'monthly' THEN
        next_date := next_date + (template.interval_count || ' months')::INTERVAL;
      WHEN 'quarterly' THEN
        next_date := next_date + (template.interval_count * 3 || ' months')::INTERVAL;
      WHEN 'semiannually' THEN
        next_date := next_date + (template.interval_count * 6 || ' months')::INTERVAL;
      WHEN 'annually' THEN
        next_date := next_date + (template.interval_count || ' years')::INTERVAL;
    END CASE;

    -- Generate jobs up to generate_days_ahead
    WHILE next_date <= CURRENT_DATE + template.generate_days_ahead LOOP
      -- Insert job
      INSERT INTO jobs (
        business_id, customer_id, title, description,
        scheduled_date, scheduled_time, estimated_duration,
        price, assigned_to, status, recurring_template_id, is_recurring
      ) VALUES (
        template.business_id, template.customer_id, template.title, template.description,
        next_date, template.preferred_time::TEXT, template.estimated_duration_minutes,
        template.price, template.assigned_to, 'scheduled', template.id, true
      );

      job_count := job_count + 1;

      -- Calculate next date
      CASE template.frequency
        WHEN 'daily' THEN
          next_date := next_date + (template.interval_count || ' days')::INTERVAL;
        WHEN 'weekly' THEN
          next_date := next_date + (template.interval_count * 7 || ' days')::INTERVAL;
        WHEN 'biweekly' THEN
          next_date := next_date + (template.interval_count * 14 || ' days')::INTERVAL;
        WHEN 'monthly' THEN
          next_date := next_date + (template.interval_count || ' months')::INTERVAL;
        WHEN 'quarterly' THEN
          next_date := next_date + (template.interval_count * 3 || ' months')::INTERVAL;
        WHEN 'semiannually' THEN
          next_date := next_date + (template.interval_count * 6 || ' months')::INTERVAL;
        WHEN 'annually' THEN
          next_date := next_date + (template.interval_count || ' years')::INTERVAL;
      END CASE;
    END LOOP;

    -- Update template tracking
    UPDATE recurring_job_templates
    SET
      last_generated_date = CURRENT_DATE,
      next_generation_date = next_date,
      total_jobs_created = total_jobs_created + job_count,
      updated_at = NOW()
    WHERE id = template.id;
  END LOOP;

  RETURN job_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update inventory on job completion
CREATE OR REPLACE FUNCTION update_inventory_on_job_parts()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrease inventory when parts are used
  IF TG_OP = 'INSERT' AND NEW.item_id IS NOT NULL THEN
    UPDATE inventory_items
    SET quantity_on_hand = quantity_on_hand - NEW.quantity
    WHERE id = NEW.item_id;

    -- Create transaction record
    INSERT INTO inventory_transactions (
      item_id, transaction_type, quantity, unit_cost, job_id, created_by
    ) VALUES (
      NEW.item_id, 'job_use', -NEW.quantity, NEW.unit_cost, NEW.job_id,
      (SELECT assigned_to FROM jobs WHERE id = NEW.job_id)
    );
  END IF;

  -- Restore inventory when parts are removed
  IF TG_OP = 'DELETE' AND OLD.item_id IS NOT NULL THEN
    UPDATE inventory_items
    SET quantity_on_hand = quantity_on_hand + OLD.quantity
    WHERE id = OLD.item_id;

    INSERT INTO inventory_transactions (
      item_id, transaction_type, quantity, job_id, notes
    ) VALUES (
      OLD.item_id, 'return', OLD.quantity, OLD.job_id, 'Parts removed from job'
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inventory_on_job_parts
  AFTER INSERT OR DELETE ON job_parts
  FOR EACH ROW EXECUTE FUNCTION update_inventory_on_job_parts();

-- =====================================================
-- 8. ANALYZE TABLES
-- =====================================================
ANALYZE business_locations;
ANALYZE equipment_types;
ANALYZE equipment_service_log;
ANALYZE recurring_job_templates;
ANALYZE inventory_items;
ANALYZE inventory_transactions;
ANALYZE job_parts;
