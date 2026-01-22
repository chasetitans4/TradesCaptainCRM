-- =====================================================
-- PROJECT WIDE AUDIT & SYNC
-- Migration: 099_project_wide_audit.sql
-- Consolidates missing migrations and ensures schema integrity.
-- NOW INCLUDES: Feature Requests (100) and Service Checklists (101)
-- to resolve migration drift and in-memory debt.
-- =====================================================

-- =====================================================
-- 1. MISSING RPCs
-- =====================================================

-- RPC: jsonb_set_key
DROP FUNCTION IF EXISTS jsonb_set_key(jsonb, text, jsonb);
CREATE OR REPLACE FUNCTION jsonb_set_key(target jsonb, key text, value jsonb)
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_set(target, ARRAY[key], value);
END;
$$ LANGUAGE plpgsql;

-- RPC: increment (Generic)
DROP FUNCTION IF EXISTS increment(uuid, text, text, int);
CREATE OR REPLACE FUNCTION increment(row_id uuid, table_name text, col_name text, amount int)
RETURNS void AS $$
BEGIN
  EXECUTE format('UPDATE %I SET %I = COALESCE(%I, 0) + $1 WHERE id = $2', table_name, col_name, col_name)
  USING amount, row_id;
END;
$$ LANGUAGE plpgsql;

-- RPC: increment_ai_response_count
DROP FUNCTION IF EXISTS increment_ai_response_count(uuid);
CREATE OR REPLACE FUNCTION increment_ai_response_count(conversation_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE leads_captain_conversations_v2
  SET ai_response_count = COALESCE(ai_response_count, 0) + 1
  WHERE id = conversation_id;
END;
$$ LANGUAGE plpgsql;

-- RPC: increment_contact_count
DROP FUNCTION IF EXISTS increment_contact_count(uuid);
CREATE OR REPLACE FUNCTION increment_contact_count(campaign_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE outreach_campaigns
  SET contact_count = COALESCE(contact_count, 0) + 1
  WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql;

-- RPC: increment_promotion_uses
DROP FUNCTION IF EXISTS increment_promotion_uses(uuid);
CREATE OR REPLACE FUNCTION increment_promotion_uses(promotion_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE promotions
  SET uses_count = COALESCE(uses_count, 0) + 1
  WHERE id = promotion_id;
END;
$$ LANGUAGE plpgsql;

-- RPC: upsert_sms_usage
CREATE TABLE IF NOT EXISTS sms_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  message_count INTEGER DEFAULT 0,
  segment_count INTEGER DEFAULT 0,
  estimated_cost DECIMAL(10,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, period_start)
);

DROP FUNCTION IF EXISTS upsert_sms_usage(uuid, int, int, decimal);
CREATE OR REPLACE FUNCTION upsert_sms_usage(
  p_business_id uuid, 
  p_message_count int, 
  p_segment_count int, 
  p_cost decimal
)
RETURNS void AS $$
DECLARE
  current_period DATE;
BEGIN
  current_period := DATE_TRUNC('month', NOW())::DATE;
  
  INSERT INTO sms_usage (business_id, period_start, message_count, segment_count, estimated_cost)
  VALUES (p_business_id, current_period, p_message_count, p_segment_count, p_cost)
  ON CONFLICT (business_id, period_start)
  DO UPDATE SET
    message_count = sms_usage.message_count + p_message_count,
    segment_count = sms_usage.segment_count + p_segment_count,
    estimated_cost = sms_usage.estimated_cost + p_cost,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- RPC: lookup_customer_by_phone
DROP FUNCTION IF EXISTS lookup_customer_by_phone(text, uuid);
CREATE OR REPLACE FUNCTION lookup_customer_by_phone(p_phone text, p_business_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  phone text
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.email, c.phone
  FROM customers c
  WHERE c.business_id = p_business_id
  AND (c.phone = p_phone OR c.phone LIKE '%' || RIGHT(p_phone, 10));
END;
$$ LANGUAGE plpgsql;

-- RPC: check_duplicate_events
DROP FUNCTION IF EXISTS check_duplicate_events(uuid, timestamptz, timestamptz, uuid);
CREATE OR REPLACE FUNCTION check_duplicate_events(
  p_business_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_resource_id uuid DEFAULT NULL
)
RETURNS TABLE (id uuid, title text, start_time timestamptz, end_time timestamptz) AS $$
BEGIN
  RETURN QUERY
  SELECT j.id, j.title, j.start_time, j.end_time
  FROM jobs j
  WHERE j.business_id = p_business_id
  AND j.start_time < p_end_time
  AND j.end_time > p_start_time
  AND (p_resource_id IS NULL OR j.assigned_technician_id = p_resource_id);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. SCHEMA SYNC: CUSTOMER AI PAUSE
-- =====================================================

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_portal_access' AND column_name = 'ai_paused') THEN
    ALTER TABLE customer_portal_access ADD COLUMN ai_paused BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_portal_access' AND column_name = 'ai_paused_at') THEN
    ALTER TABLE customer_portal_access ADD COLUMN ai_paused_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_portal_access' AND column_name = 'ai_paused_reason') THEN
    ALTER TABLE customer_portal_access ADD COLUMN ai_paused_reason TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_conversations' AND column_name = 'portal_customer_id') THEN
    ALTER TABLE sms_conversations ADD COLUMN portal_customer_id UUID REFERENCES customers(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_conversations' AND column_name = 'requires_human_attention') THEN
    ALTER TABLE sms_conversations ADD COLUMN requires_human_attention BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_conversations' AND column_name = 'human_requested_at') THEN
    ALTER TABLE sms_conversations ADD COLUMN human_requested_at TIMESTAMPTZ;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_portal_access_ai_paused ON customer_portal_access(business_id, customer_id) WHERE ai_paused = TRUE;
CREATE INDEX IF NOT EXISTS idx_sms_conversations_portal_customer ON sms_conversations(business_id, portal_customer_id) WHERE portal_customer_id IS NOT NULL;

-- =====================================================
-- 3. SCHEMA SYNC: INVENTORY SYSTEM
-- =====================================================

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

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  inventory_id UUID REFERENCES business_inventory(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'usage', 'adjustment', 'loss', 'return', 'audit')),
  quantity_change INTEGER NOT NULL,
  running_balance INTEGER,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  reference_id UUID,
  cost_per_unit DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Inventory
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_inventory_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Seed default categories
INSERT INTO inventory_categories (business_id, name, icon, is_default) VALUES
  (NULL, 'Hand Tools', 'wrench', true),
  (NULL, 'Power Tools', 'zap', true),
  (NULL, 'Diagnostic Equipment', 'activity', true),
  (NULL, 'Consumables', 'package', true)
ON CONFLICT DO NOTHING;

-- Triggers for Inventory
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

-- =====================================================
-- 4. SCHEMA SYNC: BOOKING & PAYMENTS
-- =====================================================

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

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_settings' AND column_name = 'lead_time_hours') THEN
    ALTER TABLE booking_settings ADD COLUMN lead_time_hours INTEGER DEFAULT 24;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'booking_settings' AND column_name = 'available_days') THEN
    ALTER TABLE booking_settings ADD COLUMN available_days INTEGER[] DEFAULT '{1,2,3,4,5}';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS follow_up_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  delay_hours INTEGER DEFAULT 24,
  action_type TEXT NOT NULL,
  message_template TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follow_up_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES follow_up_rules(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  status TEXT DEFAULT 'scheduled',
  scheduled_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_plan_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. SCHEMA SYNC: LEADS CAPTAIN PHASES 2 & 3
-- =====================================================

CREATE TABLE IF NOT EXISTS leads_captain_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES leads_captain_config(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  insights JSONB NOT NULL DEFAULT '[]',
  key_metrics JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads_captain_handoff_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES leads_captain_conversations_v2(id) ON DELETE CASCADE,
  quick_summary TEXT NOT NULL,
  customer_mood VARCHAR(20),
  urgency_level VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id)
);

CREATE TABLE IF NOT EXISTS leads_captain_sandbox_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES leads_captain_config(id) ON DELETE CASCADE,
  scenario JSONB NOT NULL,
  conversation JSONB NOT NULL DEFAULT '[]',
  analysis JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads_captain_photo_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES leads_captain_config(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES leads_captain_conversations_v2(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  category VARCHAR(20) NOT NULL,
  summary TEXT NOT NULL,
  detected_issues JSONB NOT NULL DEFAULT '[]',
  urgency VARCHAR(20) NOT NULL DEFAULT 'low',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leads_captain_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_captain_handoff_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_captain_sandbox_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_captain_photo_analysis ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. STORAGE BUCKETS
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('portal-uploads', 'portal-uploads', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access portal-uploads" ON storage.objects;
CREATE POLICY "Public Access portal-uploads"
ON storage.objects FOR SELECT
USING ( bucket_id = 'portal-uploads' );

DROP POLICY IF EXISTS "Authenticated Upload portal-uploads" ON storage.objects;
CREATE POLICY "Authenticated Upload portal-uploads"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'portal-uploads' AND auth.role() = 'authenticated' );

-- =====================================================
-- 7. MISSING ADMIN TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'agent',
  status TEXT DEFAULT 'active',
  hire_date DATE,
  commission_rate DECIMAL(5,4) DEFAULT 0.10,
  two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  plan_type TEXT NOT NULL,
  plan_tier TEXT NOT NULL DEFAULT 'individual',
  billing_interval TEXT NOT NULL DEFAULT 'month',
  monthly_amount DECIMAL(10,2) NOT NULL,
  user_limit INTEGER DEFAULT 1,
  plan_version TEXT DEFAULT '2026-01',
  status TEXT DEFAULT 'active',
  is_trial BOOLEAN DEFAULT FALSE,
  trial_ends_at TIMESTAMPTZ,
  promo_type TEXT,
  promo_ends_at TIMESTAMPTZ,
  web_customer_id UUID,
  coupon_id UUID,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  agent_id UUID REFERENCES admin_users(id),
  lead_id UUID,
  signup_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  company_sale BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS web_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  plan_type TEXT NOT NULL,
  billing_interval TEXT NOT NULL DEFAULT 'month',
  monthly_amount DECIMAL(10,2) NOT NULL,
  plan_version TEXT DEFAULT '2026-01',
  custom_quote_amount DECIMAL(10,2),
  custom_quote_notes TEXT,
  status TEXT DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  agent_id UUID REFERENCES admin_users(id),
  lead_id UUID,
  crm_coupon_issued BOOLEAN DEFAULT FALSE,
  crm_coupon_id UUID,
  extra_locations INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  company_sale BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS crm_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  web_customer_id UUID REFERENCES web_customers(id) NOT NULL,
  web_plan_type TEXT NOT NULL,
  crm_plan TEXT DEFAULT 'blue_starter',
  free_months INTEGER DEFAULT 12,
  status TEXT DEFAULT 'active',
  redeemed_at TIMESTAMPTZ,
  redeemed_by_account_id UUID REFERENCES crm_accounts(id),
  expires_at TIMESTAMPTZ,
  created_by_agent_id UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tc_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES admin_users(id),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  trade_type TEXT,
  employee_count TEXT,
  current_website TEXT,
  current_crm TEXT,
  source TEXT DEFAULT 'manual',
  source_details TEXT,
  status TEXT DEFAULT 'new',
  interested_in TEXT[],
  preferred_plan TEXT,
  estimated_value DECIMAL(10,2),
  last_contact_at TIMESTAMPTZ,
  next_followup_at TIMESTAMPTZ,
  contact_count INTEGER DEFAULT 0,
  converted_at TIMESTAMPTZ,
  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),
  notes TEXT,
  batch_upload_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES tc_leads(id) NOT NULL,
  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  old_status TEXT,
  new_status TEXT,
  old_agent_id UUID REFERENCES admin_users(id),
  new_agent_id UUID REFERENCES admin_users(id),
  reassigned_by UUID REFERENCES admin_users(id),
  reassignment_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_reassignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES tc_leads(id) NOT NULL,
  from_agent_id UUID REFERENCES admin_users(id),
  to_agent_id UUID REFERENCES admin_users(id) NOT NULL,
  reassigned_by UUID REFERENCES admin_users(id) NOT NULL,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_batch_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID REFERENCES admin_users(id) NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER,
  assigned_to_agent_id UUID REFERENCES admin_users(id) NOT NULL,
  total_rows INTEGER,
  successful_imports INTEGER DEFAULT 0,
  failed_imports INTEGER DEFAULT 0,
  duplicate_skipped INTEGER DEFAULT 0,
  errors JSONB,
  status TEXT DEFAULT 'processing',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  agent_id UUID REFERENCES admin_users(id),
  plan_type TEXT,
  successful_payments INTEGER DEFAULT 0,
  upfront_eligible BOOLEAN DEFAULT FALSE,
  upfront_paid BOOLEAN DEFAULT FALSE,
  recurring_eligible BOOLEAN DEFAULT FALSE,
  recurring_end_payment INTEGER,
  first_payment_at TIMESTAMPTZ,
  second_payment_at TIMESTAMPTZ,
  third_payment_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),
  stripe_subscription_id TEXT,
  sale_type TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  plan_tier TEXT,
  billing_interval TEXT NOT NULL,
  sale_amount DECIMAL(10,2) NOT NULL,
  commission_type TEXT NOT NULL,
  commission_rate DECIMAL(5,4),
  commission_amount DECIMAL(10,2) NOT NULL,
  payment_number INTEGER,
  retention_milestone TEXT,
  status TEXT DEFAULT 'pending',
  eligible_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES admin_users(id),
  paid_at TIMESTAMPTZ,
  paid_via TEXT,
  payment_reference TEXT,
  forfeited_at TIMESTAMPTZ,
  forfeiture_reason TEXT,
  sale_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  company_sale BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sales_attribution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),
  attributed_to TEXT NOT NULL,
  agent_id UUID REFERENCES admin_users(id),
  created_by UUID REFERENCES admin_users(id) NOT NULL,
  sale_amount DECIMAL(10,2),
  plan_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type TEXT NOT NULL,
  plan_tier TEXT NOT NULL,
  billing_interval TEXT NOT NULL,
  upfront_amount DECIMAL(10,2),
  upfront_delay_payments INTEGER DEFAULT 2,
  recurring_rate DECIMAL(5,4) DEFAULT 0.10,
  recurring_start_payment INTEGER DEFAULT 3,
  recurring_end_payment INTEGER DEFAULT 14,
  annual_rate DECIMAL(5,4) DEFAULT 0.35,
  annual_renewal_commission BOOLEAN DEFAULT FALSE,
  custom_rate DECIMAL(5,4) DEFAULT 0.35,
  retention_enabled BOOLEAN DEFAULT TRUE,
  month_3_call_bonus DECIMAL(10,2) DEFAULT 15,
  month_4_bonus DECIMAL(10,2) DEFAULT 25,
  month_6_bonus DECIMAL(10,2) DEFAULT 50,
  month_12_bonus DECIMAL(10,2) DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  version TEXT DEFAULT '2026-01',
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_type, billing_interval, version)
);

CREATE TABLE IF NOT EXISTS retention_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crm_account_id UUID REFERENCES crm_accounts(id),
  web_customer_id UUID REFERENCES web_customers(id),
  agent_id UUID REFERENCES admin_users(id) NOT NULL,
  month_3_call_completed BOOLEAN DEFAULT FALSE,
  month_3_call_date TIMESTAMPTZ,
  month_3_call_notes TEXT,
  month_3_audit_sent BOOLEAN DEFAULT FALSE,
  month_3_bonus_paid BOOLEAN DEFAULT FALSE,
  month_4_retained BOOLEAN DEFAULT FALSE,
  month_4_payment_date TIMESTAMPTZ,
  month_4_bonus_paid BOOLEAN DEFAULT FALSE,
  month_6_retained BOOLEAN DEFAULT FALSE,
  month_6_payment_date TIMESTAMPTZ,
  month_6_bonus_paid BOOLEAN DEFAULT FALSE,
  month_12_retained BOOLEAN DEFAULT FALSE,
  month_12_payment_date TIMESTAMPTZ,
  month_12_bonus_paid BOOLEAN DEFAULT FALSE,
  total_retention_bonus DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crm_account_id),
  UNIQUE(web_customer_id)
);

-- Enable RLS for Admin Tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE web_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE tc_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_reassignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_batch_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_attribution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_tracking ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 8. DOCUMENTS, TICKETS, CHECKLISTS, FEATURES
-- =====================================================

-- DOCUMENTS
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'job', 'equipment', 'business', 'inventory')),
  entity_id UUID NOT NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN ('contract', 'permit', 'license', 'insurance', 'warranty', 'invoice', 'quote', 'photo', 'manual', 'other')),
  description TEXT,
  tags TEXT[],
  expiration_date TIMESTAMPTZ,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- SUPPORT TICKETS
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  crm_account_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_email TEXT,
  business_name TEXT,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  ai_summary JSONB,
  category TEXT,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  conversation_context JSONB,
  page_context TEXT,
  assigned_to UUID,
  assigned_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'agent', 'system', 'ai')),
  sender_id TEXT,
  sender_name TEXT,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;

-- ONBOARDING CHECKLISTS (From 101)
CREATE TABLE IF NOT EXISTS service_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL,
  checklist_type TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  overall_progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, checklist_type)
);

ALTER TABLE service_onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_service_onboarding_client ON service_onboarding_progress(client_id);
CREATE INDEX IF NOT EXISTS idx_service_onboarding_type ON service_onboarding_progress(checklist_type);

-- FEATURE REQUESTS (From 100)
CREATE SEQUENCE IF NOT EXISTS feature_request_seq START 1000;

CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_seq_id INTEGER DEFAULT nextval('feature_request_seq'),
  request_number TEXT GENERATED ALWAYS AS ('FR-' || request_seq_id::text) STORED,
  source TEXT NOT NULL CHECK (source IN ('client', 'admin')),
  submitter_id UUID NOT NULL,
  submitter_name TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  business_name TEXT,
  crm_account_id UUID REFERENCES crm_accounts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  use_case TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'leads_customers', 'jobs_scheduling', 'quotes_invoices', 'communication', 
    'reporting', 'integrations', 'mobile_app', 'admin_settings', 'other'
  )),
  priority TEXT NOT NULL DEFAULT 'low' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'under_review', 'planned', 'in_progress', 'completed', 'declined'
  )),
  upvotes INTEGER DEFAULT 0,
  admin_notes TEXT,
  estimated_timeline TEXT,
  assigned_to UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS feature_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feature_request_id, user_id)
);

CREATE TABLE IF NOT EXISTS feature_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  commenter_type TEXT NOT NULL CHECK (commenter_type IN ('client', 'admin')),
  commenter_id UUID NOT NULL,
  commenter_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  is_official_response BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_category ON feature_requests(category);
CREATE INDEX IF NOT EXISTS idx_feature_requests_submitter ON feature_requests(submitter_id);
CREATE INDEX IF NOT EXISTS idx_feature_votes_request ON feature_votes(feature_request_id);
CREATE INDEX IF NOT EXISTS idx_feature_comments_request ON feature_comments(feature_request_id);

ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_comments ENABLE ROW LEVEL SECURITY;

-- Feature Request Triggers
CREATE OR REPLACE FUNCTION update_feature_upvotes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE feature_requests
    SET upvotes = upvotes + 1
    WHERE id = NEW.feature_request_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE feature_requests
    SET upvotes = upvotes - 1
    WHERE id = OLD.feature_request_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_feature_upvotes_trigger ON feature_votes;
CREATE TRIGGER update_feature_upvotes_trigger
AFTER INSERT OR DELETE ON feature_votes
FOR EACH ROW EXECUTE FUNCTION update_feature_upvotes();

CREATE OR REPLACE FUNCTION update_feature_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_feature_request_timestamp_trigger ON feature_requests;
CREATE TRIGGER update_feature_request_timestamp_trigger
BEFORE UPDATE ON feature_requests
FOR EACH ROW EXECUTE FUNCTION update_feature_request_timestamp();


-- STORAGE BUCKET: documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Documents Public Access" ON storage.objects;
CREATE POLICY "Documents Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'documents' );

DROP POLICY IF EXISTS "Documents Authenticated Upload" ON storage.objects;
CREATE POLICY "Documents Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'documents' AND auth.role() = 'authenticated' );


-- =====================================================
-- 9. RLS POLICIES
-- =====================================================

-- Helper function for RLS (if not exists)
CREATE OR REPLACE FUNCTION auth_user_business_id()
RETURNS UUID AS $$
  SELECT business_id FROM users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Inventory Policies
DROP POLICY IF EXISTS "Users can view their business inventory" ON business_inventory;
DROP POLICY IF EXISTS "Users can manage their business inventory" ON business_inventory;
DROP POLICY IF EXISTS "Service role full access business_inventory" ON business_inventory;

CREATE POLICY "Users can view their business inventory"
  ON business_inventory FOR SELECT
  USING (business_id = auth_user_business_id());

CREATE POLICY "Users can manage their business inventory"
  ON business_inventory FOR ALL
  USING (business_id = auth_user_business_id());

DROP POLICY IF EXISTS "Users can view their business categories" ON inventory_categories;
DROP POLICY IF EXISTS "Users can view their business inventory categories" ON inventory_categories;
DROP POLICY IF EXISTS "Service role full access inventory_categories" ON inventory_categories;

CREATE POLICY "Users can view their business categories"
  ON inventory_categories FOR SELECT
  USING (business_id = auth_user_business_id() OR business_id IS NULL);

-- Job Inventory Usage Policies
DROP POLICY IF EXISTS "Users can manage job inventory usage" ON job_inventory_usage;
CREATE POLICY "Users can manage job inventory usage"
  ON job_inventory_usage FOR ALL
  USING (
    job_id IN (SELECT id FROM jobs WHERE business_id = auth_user_business_id())
  );

-- Inventory Transactions Policies
DROP POLICY IF EXISTS "Users can manage inventory transactions" ON inventory_transactions;
CREATE POLICY "Users can manage inventory transactions"
  ON inventory_transactions FOR ALL
  USING (business_id = auth_user_business_id());

-- Documents Policies
DROP POLICY IF EXISTS "Users can view their business documents" ON documents;
DROP POLICY IF EXISTS "Users can manage their business documents" ON documents;

CREATE POLICY "Users can view their business documents"
  ON documents FOR SELECT
  USING (business_id = auth_user_business_id());

CREATE POLICY "Users can manage their business documents"
  ON documents FOR ALL
  USING (business_id = auth_user_business_id());

-- Support Tickets Policies
DROP POLICY IF EXISTS "Users can view their business tickets" ON support_tickets;
CREATE POLICY "Users can view their business tickets"
  ON support_tickets FOR SELECT
  USING (crm_account_id = auth_user_business_id());

DROP POLICY IF EXISTS "Users can create tickets for their business" ON support_tickets;
CREATE POLICY "Users can create tickets for their business"
  ON support_tickets FOR INSERT
  WITH CHECK (crm_account_id = auth_user_business_id());

-- Checklists Policies (Updated to match 101)
DROP POLICY IF EXISTS "Admins can manage all onboarding progress" ON service_onboarding_progress;
CREATE POLICY "Admins can manage all onboarding progress" ON service_onboarding_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'super_admin' OR role = 'manager')
    )
  );

DROP POLICY IF EXISTS "Businesses can view their own onboarding progress" ON service_onboarding_progress;
CREATE POLICY "Businesses can view their own onboarding progress" ON service_onboarding_progress
  FOR SELECT USING (
    client_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- Leads Captain Insights Policies
DROP POLICY IF EXISTS "Users can view their business insights" ON leads_captain_insights;
CREATE POLICY "Users can view their business insights"
  ON leads_captain_insights FOR SELECT
  USING (
    config_id IN (
      SELECT id FROM leads_captain_config 
      WHERE business_id = auth_user_business_id()
    )
  );

-- Leads Captain Photo Analysis Policies
DROP POLICY IF EXISTS "Users can view their photo analysis" ON leads_captain_photo_analysis;
CREATE POLICY "Users can view their photo analysis"
  ON leads_captain_photo_analysis FOR SELECT
  USING (
    config_id IN (
      SELECT id FROM leads_captain_config 
      WHERE business_id = auth_user_business_id()
    )
  );

-- Feature Requests Policies (From 100)
DROP POLICY IF EXISTS "Everyone can view feature requests" ON feature_requests;
CREATE POLICY "Everyone can view feature requests" 
  ON feature_requests FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Authenticated can create feature requests" ON feature_requests;
CREATE POLICY "Authenticated can create feature requests" 
  ON feature_requests FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Submitters can update their own requests" ON feature_requests;
CREATE POLICY "Submitters can update their own requests" 
  ON feature_requests FOR UPDATE
  USING (auth.uid() = submitter_id);

DROP POLICY IF EXISTS "Authenticated can vote" ON feature_votes;
CREATE POLICY "Authenticated can vote" 
  ON feature_votes FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can remove their own votes" ON feature_votes;
CREATE POLICY "Users can remove their own votes" 
  ON feature_votes FOR DELETE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Everyone can view votes" ON feature_votes;
CREATE POLICY "Everyone can view votes" 
  ON feature_votes FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Authenticated can comment" ON feature_comments;
CREATE POLICY "Authenticated can comment" 
  ON feature_comments FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Everyone can view comments" ON feature_comments;
CREATE POLICY "Everyone can view comments" 
  ON feature_comments FOR SELECT 
  USING (true);

-- =====================================================
-- END OF AUDIT
-- =====================================================
