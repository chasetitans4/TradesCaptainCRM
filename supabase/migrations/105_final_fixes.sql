-- =====================================================
-- FINAL FIXES & MISSING SCHEMA MIGRATION
-- Migration: 105_final_fixes.sql
-- Purpose: Support recent code fixes (N+1, Security, Payments, Activity)
-- =====================================================

-- 1. PAYMENT PLANS (Support for Invoice Payment Plans)
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

CREATE TABLE IF NOT EXISTS payment_plan_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'failed')),
  paid_at TIMESTAMPTZ,
  transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Payment Plans
CREATE INDEX IF NOT EXISTS idx_payment_plans_invoice ON payment_plans(invoice_id);
CREATE INDEX IF NOT EXISTS idx_installments_plan ON payment_plan_installments(plan_id);

-- RLS for Payment Plans
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plan_installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage payment plans" ON payment_plans;
CREATE POLICY "Users can manage payment plans" ON payment_plans
  FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage installments" ON payment_plan_installments;
CREATE POLICY "Users can manage installments" ON payment_plan_installments
  FOR ALL USING (plan_id IN (SELECT id FROM payment_plans WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())));


-- 2. CUSTOMER ACTIVITY (Support for Activity API Security Fix)
CREATE TABLE IF NOT EXISTS customer_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  metadata JSONB,
  created_by UUID REFERENCES users(id),
  created_by_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_activity_customer ON customer_activity(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_activity_business ON customer_activity(business_id, created_at DESC);

-- RLS for Customer Activity
ALTER TABLE customer_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view activity for their business" ON customer_activity;
CREATE POLICY "Users can view activity for their business" ON customer_activity
  FOR SELECT USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can create activity for their business" ON customer_activity;
CREATE POLICY "Users can create activity for their business" ON customer_activity
  FOR INSERT WITH CHECK (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));


-- 3. PERFORMANCE INDEXES & SCHEMA FIXES (Support for N+1 Fixes)

-- Fix missing last_message_at column in sms_conversations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sms_conversations' 
        AND column_name = 'last_message_at'
    ) THEN
        ALTER TABLE sms_conversations ADD COLUMN last_message_at TIMESTAMPTZ DEFAULT NOW();
        
        -- Backfill from updated_at
        UPDATE sms_conversations SET last_message_at = updated_at;
    END IF;
END $$;

-- Create generic trigger to update last_message_at on any message
CREATE OR REPLACE FUNCTION update_last_message_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sms_conversations
  SET 
    last_message_at = NEW.created_at,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_sms_message_created_update_conversation_timestamp ON sms_messages;
CREATE TRIGGER on_sms_message_created_update_conversation_timestamp
AFTER INSERT ON sms_messages
FOR EACH ROW
EXECUTE FUNCTION update_last_message_timestamp();


-- The fix uses .in('conversation_id', ids) on sms_messages
CREATE INDEX IF NOT EXISTS idx_sms_messages_conversation_created 
  ON sms_messages(conversation_id, created_at DESC);

-- Now we can safely create this index
CREATE INDEX IF NOT EXISTS idx_sms_conversations_business_last_msg 
  ON sms_conversations(business_id, last_message_at DESC);


-- 4. FEATURE REQUESTS (Support for Feature Requests Page)
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
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'low',
  status TEXT NOT NULL DEFAULT 'submitted',
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

CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_submitter ON feature_requests(submitter_id);

ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view feature requests" ON feature_requests;
CREATE POLICY "Everyone can view feature requests" ON feature_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can insert feature requests" ON feature_requests;
CREATE POLICY "Authenticated can insert feature requests" ON feature_requests FOR INSERT WITH CHECK (auth.role() = 'authenticated');
