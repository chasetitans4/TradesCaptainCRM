-- =====================================================
-- MISSING FEATURES MIGRATION
-- Migration: 034_missing_features.sql
-- Features: Payment Plans, Inventory History, Booking Settings, Follow-ups
-- =====================================================

-- 1. BOOKING SETTINGS (Self-Service Scheduling)
-- Robust handling: Create table if not exists, then ensure columns exist
CREATE TABLE IF NOT EXISTS booking_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT false,
  booking_url_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id),
  UNIQUE(booking_url_slug)
);

-- Ensure columns exist (idempotent updates)
DO $$ 
BEGIN 
  -- Availability
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_settings' AND column_name = 'lead_time_hours') THEN
    ALTER TABLE booking_settings ADD COLUMN lead_time_hours INTEGER DEFAULT 24;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_settings' AND column_name = 'max_days_ahead') THEN
    ALTER TABLE booking_settings ADD COLUMN max_days_ahead INTEGER DEFAULT 30;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_settings' AND column_name = 'buffer_minutes') THEN
    ALTER TABLE booking_settings ADD COLUMN buffer_minutes INTEGER DEFAULT 30;
  END IF;

  -- Time slots
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_settings' AND column_name = 'slot_duration_minutes') THEN
    ALTER TABLE booking_settings ADD COLUMN slot_duration_minutes INTEGER DEFAULT 60;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_settings' AND column_name = 'available_days') THEN
    ALTER TABLE booking_settings ADD COLUMN available_days INTEGER[] DEFAULT '{1,2,3,4,5}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_settings' AND column_name = 'day_start_time') THEN
    ALTER TABLE booking_settings ADD COLUMN day_start_time TEXT DEFAULT '09:00';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_settings' AND column_name = 'day_end_time') THEN
    ALTER TABLE booking_settings ADD COLUMN day_end_time TEXT DEFAULT '17:00';
  END IF;

  -- Services
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_settings' AND column_name = 'enabled_services') THEN
    ALTER TABLE booking_settings ADD COLUMN enabled_services TEXT[] DEFAULT '{}';
  END IF;

  -- Customization
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_settings' AND column_name = 'welcome_message') THEN
    ALTER TABLE booking_settings ADD COLUMN welcome_message TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_settings' AND column_name = 'confirmation_message') THEN
    ALTER TABLE booking_settings ADD COLUMN confirmation_message TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_settings' AND column_name = 'primary_color') THEN
    ALTER TABLE booking_settings ADD COLUMN primary_color TEXT DEFAULT '#3b82f6';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_settings' AND column_name = 'logo_url') THEN
    ALTER TABLE booking_settings ADD COLUMN logo_url TEXT;
  END IF;

  -- Notifications
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_settings' AND column_name = 'notify_email') THEN
    ALTER TABLE booking_settings ADD COLUMN notify_email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_settings' AND column_name = 'auto_confirm') THEN
    ALTER TABLE booking_settings ADD COLUMN auto_confirm BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_settings' AND column_name = 'calendar_integration') THEN
    ALTER TABLE booking_settings ADD COLUMN calendar_integration BOOLEAN DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_booking_settings_slug ON booking_settings(booking_url_slug);

-- 2. AUTOMATED FOLLOW-UP RULES
CREATE TABLE IF NOT EXISTS follow_up_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- quote_sent, job_completed, etc.
  delay_hours INTEGER DEFAULT 24,
  action_type TEXT NOT NULL, -- sms, email, task
  
  -- Content
  message_template TEXT,
  email_subject TEXT,
  email_template TEXT,
  task_title TEXT,
  task_assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Logic
  conditions JSONB DEFAULT '{}',
  max_attempts INTEGER DEFAULT 1,
  stop_on_response BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_rules_business ON follow_up_rules(business_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_rules_trigger ON follow_up_rules(business_id, trigger_type);

-- 3. FOLLOW-UP INSTANCES (Execution History)
CREATE TABLE IF NOT EXISTS follow_up_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES follow_up_rules(id) ON DELETE SET NULL,
  
  -- Target
  entity_type TEXT NOT NULL, -- quote, job, invoice
  entity_id UUID NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  
  -- Status
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'cancelled', 'failed', 'stopped')),
  sent_at TIMESTAMPTZ,
  attempt_number INTEGER DEFAULT 1,
  
  -- Results
  result_message TEXT,
  stopped_reason TEXT,
  message_sid TEXT,
  email_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_instances_status ON follow_up_instances(status);
CREATE INDEX IF NOT EXISTS idx_follow_up_instances_entity ON follow_up_instances(entity_type, entity_id);

-- 4. PAYMENT PLANS
CREATE TABLE IF NOT EXISTS payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  
  total_amount DECIMAL(10,2) NOT NULL,
  number_of_installments INTEGER NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  start_date DATE NOT NULL,
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'defaulted')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_plans_invoice ON payment_plans(invoice_id);

-- 5. PAYMENT PLAN INSTALLMENTS
CREATE TABLE IF NOT EXISTS payment_plan_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
  
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'failed')),
  
  paid_at TIMESTAMPTZ,
  transaction_id TEXT, -- Stripe charge ID or similar
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_installments_plan ON payment_plan_installments(plan_id);
CREATE INDEX IF NOT EXISTS idx_installments_status ON payment_plan_installments(status);

-- 6. INVENTORY TRANSACTIONS (History)
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES business_inventory(id) ON DELETE SET NULL,
  
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'adjustment', 'loss', 'return', 'audit')),
  quantity_change INTEGER NOT NULL,
  running_balance INTEGER, -- Snapshot of balance after transaction
  
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  reference_id UUID, -- job_id or purchase_order_id
  cost_per_unit DECIMAL(10,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_tx_item ON inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tx_date ON inventory_transactions(created_at);

-- 7. ENABLE RLS
ALTER TABLE booking_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plan_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES

-- Booking Settings (Public read for slug, Admin write)
DROP POLICY IF EXISTS "Public can view booking settings by slug" ON booking_settings;
CREATE POLICY "Public can view booking settings by slug" ON booking_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their booking settings" ON booking_settings;
CREATE POLICY "Users can manage their booking settings" ON booking_settings
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

-- Follow-ups
DROP POLICY IF EXISTS "Users can manage their follow up rules" ON follow_up_rules;
CREATE POLICY "Users can manage their follow up rules" ON follow_up_rules
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can view follow up instances" ON follow_up_instances;
CREATE POLICY "Users can view follow up instances" ON follow_up_instances
  FOR SELECT USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

-- Payment Plans
DROP POLICY IF EXISTS "Users can manage payment plans" ON payment_plans;
CREATE POLICY "Users can manage payment plans" ON payment_plans
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage installments" ON payment_plan_installments;
CREATE POLICY "Users can manage installments" ON payment_plan_installments
  FOR ALL USING (plan_id IN (SELECT id FROM payment_plans WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())));

-- Inventory Transactions
DROP POLICY IF EXISTS "Users can view inventory transactions" ON inventory_transactions;
CREATE POLICY "Users can view inventory transactions" ON inventory_transactions
  FOR SELECT USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can create inventory transactions" ON inventory_transactions;
CREATE POLICY "Users can create inventory transactions" ON inventory_transactions
  FOR INSERT WITH CHECK (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));
