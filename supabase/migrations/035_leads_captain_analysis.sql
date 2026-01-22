-- =====================================================
-- LEADS CAPTAIN V2 & ANALYSIS TABLES
-- Comprehensive migration to ensure all V2 tables exist
-- and support the new 9-prompt architecture
-- =====================================================

-- =====================================================
-- 1. SAFE RENAMES (Dynamic SQL to avoid parse errors)
-- =====================================================

DO $$
BEGIN
  -- Rename Config
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nevermiss_config') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads_captain_config') THEN
    EXECUTE 'ALTER TABLE nevermiss_config RENAME TO leads_captain_config';
  END IF;

  -- Rename Conversations V2
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nevermiss_conversations_v2') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads_captain_conversations_v2') THEN
    EXECUTE 'ALTER TABLE nevermiss_conversations_v2 RENAME TO leads_captain_conversations_v2';
  END IF;

  -- Rename Messages V2
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nevermiss_messages_v2') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads_captain_messages_v2') THEN
    EXECUTE 'ALTER TABLE nevermiss_messages_v2 RENAME TO leads_captain_messages_v2';
  END IF;
END $$;

-- =====================================================
-- 2. ENSURE BASE TABLES EXIST
-- =====================================================

-- Ensure Config Table Exists
CREATE TABLE IF NOT EXISTS leads_captain_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  business_name VARCHAR(200) NOT NULL,
  business_type VARCHAR(50),
  service_area TEXT,
  owner_name VARCHAR(100),
  main_phone VARCHAR(20),
  emergency_phone VARCHAR(20),
  booking_link TEXT,
  business_hours JSONB DEFAULT '{
    "mon": {"open": "08:00", "close": "18:00", "enabled": true},
    "tue": {"open": "08:00", "close": "18:00", "enabled": true},
    "wed": {"open": "08:00", "close": "18:00", "enabled": true},
    "thu": {"open": "08:00", "close": "18:00", "enabled": true},
    "fri": {"open": "08:00", "close": "18:00", "enabled": true},
    "sat": {"open": "09:00", "close": "14:00", "enabled": true},
    "sun": {"open": null, "close": null, "enabled": false}
  }',
  timezone VARCHAR(50) DEFAULT 'America/Chicago',
  emergency_service BOOLEAN DEFAULT false,
  tone VARCHAR(30) DEFAULT 'friendly_professional',
  use_emojis BOOLEAN DEFAULT true,
  languages TEXT[] DEFAULT ARRAY['en'],
  ai_enabled BOOLEAN DEFAULT true,
  ai_confidence_threshold INTEGER DEFAULT 70,
  ai_creativity_level VARCHAR(20) DEFAULT 'low',
  ai_max_messages INTEGER DEFAULT 5,
  ai_pricing_mode VARCHAR(20) DEFAULT 'ranges',
  memory_scope VARCHAR(20) DEFAULT 'per_customer',
  memory_expiration_days INTEGER DEFAULT 90,
  global_mode VARCHAR(20) DEFAULT 'normal',
  require_approval VARCHAR(20) DEFAULT 'never',
  approval_timeout_minutes INTEGER DEFAULT 5,
  use_new_orchestrator BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id)
);

-- Ensure Conversations V2 Table Exists
CREATE TABLE IF NOT EXISTS leads_captain_conversations_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES leads_captain_config(id) ON DELETE CASCADE NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_name VARCHAR(200),
  customer_email VARCHAR(200),
  status VARCHAR(20) DEFAULT 'active',
  initial_intent VARCHAR(50),
  current_intent VARCHAR(50),
  sentiment VARCHAR(20),
  is_hot_lead BOOLEAN DEFAULT false,
  is_emergency BOOLEAN DEFAULT false,
  requires_human BOOLEAN DEFAULT false,
  opted_out BOOLEAN DEFAULT false,
  customer_memory JSONB DEFAULT '{}',
  message_count INTEGER DEFAULT 0,
  ai_message_count INTEGER DEFAULT 0,
  crm_lead_id UUID,
  crm_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  last_customer_message_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ownership fields
  owner_id UUID REFERENCES auth.users(id),
  claimed_by UUID REFERENCES auth.users(id),
  claimed_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure Messages V2 Table Exists
CREATE TABLE IF NOT EXISTS leads_captain_messages_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES leads_captain_conversations_v2(id) ON DELETE CASCADE NOT NULL,
  direction VARCHAR(10) NOT NULL,
  content TEXT NOT NULL,
  detected_intent VARCHAR(50),
  intent_confidence INTEGER,
  detected_sentiment VARCHAR(20),
  detected_language VARCHAR(10),
  extracted_entities JSONB,
  rule_matched UUID,
  template_used UUID,
  ai_used BOOLEAN DEFAULT false,
  ai_model VARCHAR(50),
  ai_confidence INTEGER,
  decision_explanation TEXT,
  decision_details JSONB,
  approval_required BOOLEAN DEFAULT false,
  approval_status VARCHAR(20),
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  original_content TEXT,
  twilio_sid VARCHAR(50),
  delivery_status VARCHAR(20) DEFAULT 'pending',
  delivery_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- =====================================================
-- 3. ANALYSIS TABLES (Prompt 3 & 4)
-- =====================================================

-- Conversation Analysis Table (Prompt 3 Results)
CREATE TABLE IF NOT EXISTS leads_captain_conversation_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES leads_captain_conversations_v2(id) ON DELETE CASCADE,
  config_id UUID NOT NULL REFERENCES leads_captain_config(id) ON DELETE CASCADE,

  -- Analysis results
  summary TEXT NOT NULL,
  customer_sentiment VARCHAR(20), -- positive, neutral, frustrated, angry
  lead_quality VARCHAR(10), -- hot, warm, cold
  service_category VARCHAR(100),
  estimated_job_value VARCHAR(20), -- high, medium, low, unknown
  follow_up_recommendation TEXT,
  ai_performance_notes JSONB DEFAULT '[]',

  -- Metadata
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  model_used VARCHAR(50),
  tokens_used INTEGER,

  -- Ensure one analysis per conversation
  UNIQUE(conversation_id)
);

-- Extracted Notes Table (Prompt 4 Results)
CREATE TABLE IF NOT EXISTS leads_captain_extracted_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES leads_captain_conversations_v2(id) ON DELETE CASCADE,

  -- Note details
  note_type VARCHAR(30) NOT NULL, -- service_detail, scheduling, concern, follow_up, general
  content TEXT NOT NULL,
  confidence DECIMAL(3,2), -- 0.00 to 1.00

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. UPDATES & INDEXES
-- =====================================================

-- Add feature flag column to config if missing
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads_captain_config' AND column_name = 'use_new_orchestrator') THEN
    ALTER TABLE leads_captain_config ADD COLUMN use_new_orchestrator BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Indexes for Analysis
CREATE INDEX IF NOT EXISTS idx_lc_analysis_conversation
  ON leads_captain_conversation_analysis(conversation_id);

CREATE INDEX IF NOT EXISTS idx_lc_analysis_config
  ON leads_captain_conversation_analysis(config_id);

CREATE INDEX IF NOT EXISTS idx_lc_analysis_analyzed_at
  ON leads_captain_conversation_analysis(analyzed_at DESC);

CREATE INDEX IF NOT EXISTS idx_lc_analysis_lead_quality
  ON leads_captain_conversation_analysis(config_id, lead_quality);

CREATE INDEX IF NOT EXISTS idx_lc_analysis_sentiment
  ON leads_captain_conversation_analysis(config_id, customer_sentiment);

-- Indexes for Notes
CREATE INDEX IF NOT EXISTS idx_lc_notes_conversation
  ON leads_captain_extracted_notes(conversation_id);

CREATE INDEX IF NOT EXISTS idx_lc_notes_type
  ON leads_captain_extracted_notes(note_type);

CREATE INDEX IF NOT EXISTS idx_lc_notes_created
  ON leads_captain_extracted_notes(created_at DESC);

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE leads_captain_conversation_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads_captain_extracted_notes ENABLE ROW LEVEL SECURITY;

-- Policy for conversation analysis
DROP POLICY IF EXISTS analysis_read_own_business ON leads_captain_conversation_analysis;
CREATE POLICY analysis_read_own_business ON leads_captain_conversation_analysis
  FOR SELECT
  TO authenticated
  USING (
    config_id IN (
      SELECT lcc.id FROM leads_captain_config lcc
      JOIN users u ON u.business_id = lcc.business_id
      WHERE u.id = auth.uid()
    )
  );

-- Policy for extracted notes
DROP POLICY IF EXISTS notes_read_own_business ON leads_captain_extracted_notes;
CREATE POLICY notes_read_own_business ON leads_captain_extracted_notes
  FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT c.id FROM leads_captain_conversations_v2 c
      JOIN leads_captain_config lcc ON lcc.id = c.config_id
      JOIN users u ON u.business_id = lcc.business_id
      WHERE u.id = auth.uid()
    )
  );

-- =====================================================
-- 6. ANALYTICS VIEWS
-- =====================================================

-- View for lead quality distribution
CREATE OR REPLACE VIEW leads_captain_lead_quality_stats AS
SELECT
  config_id,
  lead_quality,
  COUNT(*) as count,
  DATE_TRUNC('day', analyzed_at) as analysis_date
FROM leads_captain_conversation_analysis
WHERE analyzed_at >= NOW() - INTERVAL '30 days'
GROUP BY config_id, lead_quality, DATE_TRUNC('day', analyzed_at);

-- View for sentiment distribution
CREATE OR REPLACE VIEW leads_captain_sentiment_stats AS
SELECT
  config_id,
  customer_sentiment,
  COUNT(*) as count,
  DATE_TRUNC('day', analyzed_at) as analysis_date
FROM leads_captain_conversation_analysis
WHERE analyzed_at >= NOW() - INTERVAL '30 days'
GROUP BY config_id, customer_sentiment, DATE_TRUNC('day', analyzed_at);

-- View for note type distribution
CREATE OR REPLACE VIEW leads_captain_note_type_stats AS
SELECT
  c.config_id,
  n.note_type,
  COUNT(*) as count,
  AVG(n.confidence) as avg_confidence
FROM leads_captain_extracted_notes n
JOIN leads_captain_conversations_v2 c ON c.id = n.conversation_id
WHERE n.created_at >= NOW() - INTERVAL '30 days'
GROUP BY c.config_id, n.note_type;
