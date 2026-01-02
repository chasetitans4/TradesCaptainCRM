-- =====================================================
-- NEVERMISS v2.0 DATABASE SCHEMA
-- Migration: 016_nevermiss_v2.sql
-- Description: Rules-first AI SMS response system
-- =====================================================

-- =====================================================
-- 1. BUSINESS CONFIGURATION
-- =====================================================

CREATE TABLE IF NOT EXISTS nevermiss_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Business context
  business_name VARCHAR(200) NOT NULL,
  business_type VARCHAR(50), -- plumbing, hvac, electrical, roofing, general, etc.
  service_area TEXT,
  owner_name VARCHAR(100),

  -- Contact info
  main_phone VARCHAR(20),
  emergency_phone VARCHAR(20),
  booking_link TEXT,

  -- Hours (JSONB)
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

  -- Response style
  tone VARCHAR(30) DEFAULT 'friendly_professional', -- casual, friendly_professional, formal
  use_emojis BOOLEAN DEFAULT true,
  languages TEXT[] DEFAULT ARRAY['en'],

  -- AI settings
  ai_enabled BOOLEAN DEFAULT true,
  ai_confidence_threshold INTEGER DEFAULT 70, -- 0-100
  ai_creativity_level VARCHAR(20) DEFAULT 'low', -- none, low, medium, high
  ai_max_messages INTEGER DEFAULT 5, -- Before requiring human
  ai_pricing_mode VARCHAR(20) DEFAULT 'ranges', -- never, ranges, specific

  -- Memory settings
  memory_scope VARCHAR(20) DEFAULT 'per_customer', -- conversation, per_customer, never
  memory_expiration_days INTEGER DEFAULT 90,

  -- Admin settings
  global_mode VARCHAR(20) DEFAULT 'normal', -- normal, templates_only, paused
  require_approval VARCHAR(20) DEFAULT 'never', -- never, low_confidence, first_message, all
  approval_timeout_minutes INTEGER DEFAULT 5,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(business_id)
);

-- =====================================================
-- 2. ENABLED INTENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS nevermiss_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES nevermiss_config(id) ON DELETE CASCADE NOT NULL,

  intent_code VARCHAR(50) NOT NULL,
  intent_label VARCHAR(100) NOT NULL,
  intent_category VARCHAR(50), -- lead, scheduling, service, other
  example_phrases TEXT[], -- For display in UI
  enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(config_id, intent_code)
);

-- =====================================================
-- 3. RESPONSE TEMPLATES
-- =====================================================

CREATE TABLE IF NOT EXISTS nevermiss_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES nevermiss_config(id) ON DELETE CASCADE NOT NULL,

  name VARCHAR(100) NOT NULL,
  template_key VARCHAR(50), -- missed_call_initial, emergency, pricing, after_hours, etc.
  content TEXT NOT NULL, -- Supports {{variables}}

  -- Settings
  max_length INTEGER DEFAULT 320,
  emoji_setting VARCHAR(20) DEFAULT 'business_default', -- business_default, always, never
  ai_personalization VARCHAR(20) DEFAULT 'low', -- none, low, medium

  is_system BOOLEAN DEFAULT false, -- System templates can't be deleted
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. AUTOMATION RULES
-- =====================================================

CREATE TABLE IF NOT EXISTS nevermiss_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES nevermiss_config(id) ON DELETE CASCADE NOT NULL,

  name VARCHAR(100) NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 100, -- Lower number = higher priority

  -- Conditions (JSONB)
  -- Example: {"operator": "AND", "conditions": [{"field": "intent", "operator": "equals", "value": "emergency"}]}
  conditions JSONB NOT NULL,

  -- Actions (JSONB)
  -- Example: {"send_template": "uuid", "notify": {"recipients": ["owner"], "methods": ["sms"]}, "escalate_to_human": false}
  actions JSONB NOT NULL,

  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 5. PRICE LIST
-- =====================================================

CREATE TABLE IF NOT EXISTS nevermiss_price_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES nevermiss_config(id) ON DELETE CASCADE NOT NULL,

  service_name VARCHAR(200) NOT NULL,
  price_min DECIMAL(10,2),
  price_max DECIMAL(10,2),
  price_note TEXT, -- "Starting at...", "Depends on...", etc.
  display_order INTEGER DEFAULT 0,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 6. NOTIFICATION RECIPIENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS nevermiss_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES nevermiss_config(id) ON DELETE CASCADE NOT NULL,

  recipient_name VARCHAR(100) NOT NULL,
  recipient_phone VARCHAR(20),
  recipient_email VARCHAR(200),
  recipient_role VARCHAR(50) DEFAULT 'owner', -- owner, oncall, backup

  -- Methods
  notify_sms BOOLEAN DEFAULT true,
  notify_push BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT false,

  -- Triggers
  triggers JSONB DEFAULT '{
    "new_conversation": true,
    "hot_lead": true,
    "emergency": true,
    "angry_customer": true,
    "escalation": true,
    "booking": true,
    "every_message": false
  }',

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT true,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  quiet_hours_except_emergency BOOLEAN DEFAULT true,

  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. CONVERSATIONS (v2)
-- =====================================================

CREATE TABLE IF NOT EXISTS nevermiss_conversations_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES nevermiss_config(id) ON DELETE CASCADE NOT NULL,

  -- Customer info
  customer_phone VARCHAR(20) NOT NULL,
  customer_name VARCHAR(200),
  customer_email VARCHAR(200),

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active, human_takeover, closed, blocked

  -- Classification
  initial_intent VARCHAR(50),
  current_intent VARCHAR(50),
  sentiment VARCHAR(20), -- positive, neutral, negative, angry

  -- Flags
  is_hot_lead BOOLEAN DEFAULT false,
  is_emergency BOOLEAN DEFAULT false,
  requires_human BOOLEAN DEFAULT false,
  opted_out BOOLEAN DEFAULT false,

  -- Memory (per-customer context)
  customer_memory JSONB DEFAULT '{}',

  -- Counters
  message_count INTEGER DEFAULT 0,
  ai_message_count INTEGER DEFAULT 0,

  -- CRM Integration
  crm_lead_id UUID, -- Link to CRM lead if created
  crm_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  last_customer_message_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 8. MESSAGES (v2)
-- =====================================================

CREATE TABLE IF NOT EXISTS nevermiss_messages_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES nevermiss_conversations_v2(id) ON DELETE CASCADE NOT NULL,

  -- Message content
  direction VARCHAR(10) NOT NULL, -- inbound, outbound
  content TEXT NOT NULL,

  -- Analysis (inbound messages)
  detected_intent VARCHAR(50),
  intent_confidence INTEGER, -- 0-100
  detected_sentiment VARCHAR(20),
  detected_language VARCHAR(10),
  extracted_entities JSONB, -- {"name": "John", "service": "leak", "time": "tonight"}

  -- Decision tracking (outbound messages)
  rule_matched UUID REFERENCES nevermiss_rules(id) ON DELETE SET NULL,
  template_used UUID REFERENCES nevermiss_templates(id) ON DELETE SET NULL,
  ai_used BOOLEAN DEFAULT false,
  ai_model VARCHAR(50),
  ai_confidence INTEGER,

  -- Explainability
  decision_explanation TEXT, -- Human-readable explanation
  decision_details JSONB, -- Full decision context

  -- Approval workflow
  approval_required BOOLEAN DEFAULT false,
  approval_status VARCHAR(20), -- pending, approved, rejected, timeout
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  original_content TEXT, -- If edited before sending

  -- Delivery
  twilio_sid VARCHAR(50),
  delivery_status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, failed, undelivered
  delivery_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

-- =====================================================
-- 9. TRAINING EXAMPLES
-- =====================================================

CREATE TABLE IF NOT EXISTS nevermiss_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES nevermiss_config(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES nevermiss_messages_v2(id) ON DELETE SET NULL,

  incoming_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,

  rating VARCHAR(10), -- good, bad
  feedback_reasons TEXT[], -- too_long, too_formal, wrong_info, etc.
  better_response TEXT, -- User-provided correction

  processed BOOLEAN DEFAULT false, -- Whether used for training

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 10. AUDIT LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS nevermiss_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES nevermiss_config(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES nevermiss_conversations_v2(id) ON DELETE SET NULL,
  message_id UUID REFERENCES nevermiss_messages_v2(id) ON DELETE SET NULL,

  action VARCHAR(50) NOT NULL,
  -- Actions: message_received, message_sent, rule_matched, ai_invoked,
  -- escalated, human_takeover, config_changed, rule_created, rule_updated,
  -- template_created, opt_out, blocked, unblocked

  actor VARCHAR(100), -- system, ai, user email/name
  details JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_nevermiss_config_business ON nevermiss_config(business_id);
CREATE INDEX IF NOT EXISTS idx_nevermiss_intents_config ON nevermiss_intents(config_id);
CREATE INDEX IF NOT EXISTS idx_nevermiss_templates_config ON nevermiss_templates(config_id);
CREATE INDEX IF NOT EXISTS idx_nevermiss_templates_key ON nevermiss_templates(config_id, template_key);
CREATE INDEX IF NOT EXISTS idx_nevermiss_rules_config_priority ON nevermiss_rules(config_id, priority);
CREATE INDEX IF NOT EXISTS idx_nevermiss_price_list_config ON nevermiss_price_list(config_id);
CREATE INDEX IF NOT EXISTS idx_nevermiss_notifications_config ON nevermiss_notifications(config_id);
CREATE INDEX IF NOT EXISTS idx_nevermiss_conversations_v2_config ON nevermiss_conversations_v2(config_id);
CREATE INDEX IF NOT EXISTS idx_nevermiss_conversations_v2_phone ON nevermiss_conversations_v2(customer_phone);
CREATE INDEX IF NOT EXISTS idx_nevermiss_conversations_v2_status ON nevermiss_conversations_v2(status);
CREATE INDEX IF NOT EXISTS idx_nevermiss_conversations_v2_last_message ON nevermiss_conversations_v2(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_nevermiss_messages_v2_conversation ON nevermiss_messages_v2(conversation_id);
CREATE INDEX IF NOT EXISTS idx_nevermiss_messages_v2_created ON nevermiss_messages_v2(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nevermiss_messages_v2_approval ON nevermiss_messages_v2(approval_status) WHERE approval_required = true;
CREATE INDEX IF NOT EXISTS idx_nevermiss_audit_config ON nevermiss_audit_log(config_id);
CREATE INDEX IF NOT EXISTS idx_nevermiss_audit_created ON nevermiss_audit_log(created_at DESC);

-- =====================================================
-- SEED DEFAULT INTENTS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION seed_nevermiss_intents(p_config_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO nevermiss_intents (config_id, intent_code, intent_label, intent_category, example_phrases, enabled)
  VALUES
    (p_config_id, 'new_lead', 'New Service Request', 'lead', ARRAY['I need a plumber', 'Can you help with...', 'Do you do...'], true),
    (p_config_id, 'pricing', 'Pricing Question', 'lead', ARRAY['How much', 'What do you charge', 'Price for...'], true),
    (p_config_id, 'availability', 'Availability Question', 'lead', ARRAY['Are you available', 'Can you come', 'When can you...'], true),
    (p_config_id, 'emergency', 'Emergency Request', 'lead', ARRAY['Emergency', 'Urgent', 'Pipe burst', 'Flooding'], true),
    (p_config_id, 'schedule', 'Schedule Appointment', 'scheduling', ARRAY['Book appointment', 'Schedule', 'Set up a time'], true),
    (p_config_id, 'reschedule', 'Reschedule Request', 'scheduling', ARRAY['Reschedule', 'Move my appointment', 'Change time'], true),
    (p_config_id, 'cancel', 'Cancellation Request', 'scheduling', ARRAY['Cancel', 'Nevermind', 'Don''t need anymore'], true),
    (p_config_id, 'existing_customer', 'Existing Customer', 'service', ARRAY['You worked on my house', 'Was there before', 'Follow up'], true),
    (p_config_id, 'complaint', 'Complaint', 'service', ARRAY['Not happy', 'Problem with', 'Complaint'], true),
    (p_config_id, 'refund', 'Refund Request', 'service', ARRAY['Refund', 'Money back', 'Overcharged'], true),
    (p_config_id, 'wrong_number', 'Wrong Number', 'other', ARRAY['Wrong number', 'Sorry', 'Didn''t mean to'], true),
    (p_config_id, 'spam', 'Spam/Solicitation', 'other', ARRAY['SEO', 'Marketing', 'Boost your'], true),
    (p_config_id, 'bot_check', 'Bot Check', 'other', ARRAY['Are you a bot', 'Real person', 'AI', 'Automated'], true),
    (p_config_id, 'general', 'General Question', 'other', ARRAY['Question', 'Info', 'Wondering'], true)
  ON CONFLICT (config_id, intent_code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DEFAULT TEMPLATES FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION seed_nevermiss_templates(p_config_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO nevermiss_templates (config_id, name, template_key, content, is_system)
  VALUES
    (p_config_id, 'Missed Call Initial', 'missed_call_initial',
     'Hey! This is {{business_name}}. Sorry we missed your call. What can we help you with today?', true),

    (p_config_id, 'New Lead', 'new_lead',
     'Thanks for reaching out{{#first_name}}, {{first_name}}{{/first_name}}! We''d be happy to help. When would be a good time to take a look?{{#booking_link}} Book here: {{booking_link}}{{/booking_link}}', true),

    (p_config_id, 'Pricing Question', 'pricing',
     'Great question! Our pricing depends on the specific job. Can you tell me a bit more about what you need done? Then I can give you a better idea of cost.', true),

    (p_config_id, 'After Hours', 'after_hours',
     'Thanks for reaching out! We''re currently closed but will be back {{next_available}}. {{#booking_link}}Want to book a time? {{booking_link}}{{/booking_link}}{{#emergency_phone}}For emergencies, call {{emergency_phone}}{{/emergency_phone}}', true),

    (p_config_id, 'Emergency', 'emergency',
     '{{first_name}}, we got your message about an emergency. For urgent issues, please call us right now at {{emergency_phone}} — we have techs available 24/7.', true),

    (p_config_id, 'Human Confirmation', 'bot_check',
     'Ha! Fair question. This is {{owner_name}} — real human here. How can I help you today?', true),

    (p_config_id, 'Angry Customer', 'angry_customer',
     'I''m really sorry to hear that{{#first_name}}, {{first_name}}{{/first_name}}. That''s not the experience we want you to have. Let me get {{owner_name}} on this personally. They''ll reach out within the hour.', true),

    (p_config_id, 'Booking Confirmation', 'booking_confirmation',
     'You''re all set{{#first_name}}, {{first_name}}{{/first_name}}! We''ll see you on {{appointment_date}} at {{appointment_time}}. Reply to this text if anything changes.', true),

    (p_config_id, 'Wrong Number', 'wrong_number',
     'No problem! Looks like you have the wrong number. Have a great day!', true),

    (p_config_id, 'Opt Out Confirmation', 'opt_out',
     'You''ve been unsubscribed from {{business_name}} messages. Reply START to resubscribe. Have a great day!', true)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DEFAULT RULES FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION seed_nevermiss_rules(p_config_id UUID)
RETURNS void AS $$
DECLARE
  v_emergency_template_id UUID;
  v_after_hours_template_id UUID;
  v_bot_check_template_id UUID;
  v_angry_template_id UUID;
  v_wrong_number_template_id UUID;
BEGIN
  -- Get template IDs
  SELECT id INTO v_emergency_template_id FROM nevermiss_templates WHERE config_id = p_config_id AND template_key = 'emergency' LIMIT 1;
  SELECT id INTO v_after_hours_template_id FROM nevermiss_templates WHERE config_id = p_config_id AND template_key = 'after_hours' LIMIT 1;
  SELECT id INTO v_bot_check_template_id FROM nevermiss_templates WHERE config_id = p_config_id AND template_key = 'bot_check' LIMIT 1;
  SELECT id INTO v_angry_template_id FROM nevermiss_templates WHERE config_id = p_config_id AND template_key = 'angry_customer' LIMIT 1;
  SELECT id INTO v_wrong_number_template_id FROM nevermiss_templates WHERE config_id = p_config_id AND template_key = 'wrong_number' LIMIT 1;

  INSERT INTO nevermiss_rules (config_id, name, description, priority, conditions, actions, is_system)
  VALUES
    -- Rule 1: Emergency after hours
    (p_config_id, 'Emergency After Hours', 'Respond immediately to emergencies outside business hours', 10,
     '{"operator": "AND", "conditions": [{"field": "intent", "operator": "equals", "value": "emergency"}, {"field": "time", "operator": "is", "value": "outside_hours"}]}',
     jsonb_build_object('send_template', v_emergency_template_id, 'include_phone', true, 'notify', jsonb_build_object('recipients', ARRAY['owner', 'oncall'], 'methods', ARRAY['sms', 'push'], 'urgency', 'immediate'), 'ask_followup', false),
     true),

    -- Rule 2: Emergency during hours
    (p_config_id, 'Emergency During Hours', 'Respond to emergencies during business hours', 11,
     '{"operator": "AND", "conditions": [{"field": "intent", "operator": "equals", "value": "emergency"}]}',
     jsonb_build_object('send_template', v_emergency_template_id, 'include_phone', true, 'notify', jsonb_build_object('recipients', ARRAY['owner'], 'methods', ARRAY['sms', 'push'], 'urgency', 'immediate'), 'ask_followup', false),
     true),

    -- Rule 3: Angry customer
    (p_config_id, 'Angry Customer', 'Escalate angry customers to human', 20,
     '{"operator": "OR", "conditions": [{"field": "sentiment", "operator": "equals", "value": "angry"}, {"field": "message_contains", "operator": "any", "value": ["terrible", "awful", "horrible", "sue", "lawyer", "attorney", "BBB", "report"]}]}',
     jsonb_build_object('send_template', v_angry_template_id, 'stop_ai', true, 'escalate_to_human', true, 'notify', jsonb_build_object('recipients', ARRAY['owner'], 'methods', ARRAY['sms', 'push', 'email'], 'urgency', 'immediate')),
     true),

    -- Rule 4: Bot check
    (p_config_id, 'Bot Check', 'Handle questions about being a bot', 30,
     '{"operator": "OR", "conditions": [{"field": "intent", "operator": "equals", "value": "bot_check"}, {"field": "message_contains", "operator": "any", "value": ["are you a bot", "real person", "talking to AI", "automated"]}]}',
     jsonb_build_object('send_template', v_bot_check_template_id, 'notify', jsonb_build_object('recipients', ARRAY['owner'], 'methods', ARRAY['push'], 'urgency', 'normal')),
     true),

    -- Rule 5: After hours (non-emergency)
    (p_config_id, 'After Hours', 'Respond to non-emergency messages outside business hours', 50,
     '{"operator": "AND", "conditions": [{"field": "time", "operator": "is", "value": "outside_hours"}, {"field": "intent", "operator": "not_equals", "value": "emergency"}]}',
     jsonb_build_object('send_template', v_after_hours_template_id, 'include_booking_link', true),
     true),

    -- Rule 6: Wrong number
    (p_config_id, 'Wrong Number', 'Handle wrong number messages', 60,
     '{"operator": "AND", "conditions": [{"field": "intent", "operator": "equals", "value": "wrong_number"}]}',
     jsonb_build_object('send_template', v_wrong_number_template_id, 'stop_ai', true),
     true),

    -- Rule 7: Spam
    (p_config_id, 'Spam Filter', 'Do not respond to spam/solicitation', 70,
     '{"operator": "OR", "conditions": [{"field": "intent", "operator": "equals", "value": "spam"}, {"field": "message_contains", "operator": "any", "value": ["SEO", "marketing services", "boost your", "grow your business", "lead generation"]}]}',
     '{"do_not_respond": true, "add_tag": "spam"}',
     true),

    -- Rule 8: Legal keywords
    (p_config_id, 'Legal Escalation', 'Escalate messages with legal keywords', 15,
     '{"operator": "AND", "conditions": [{"field": "message_contains", "operator": "any", "value": ["lawyer", "attorney", "sue", "lawsuit", "court", "legal action"]}]}',
     '{"stop_ai": true, "escalate_to_human": true, "notify": {"recipients": ["owner"], "methods": ["sms", "push", "email"], "urgency": "immediate"}, "do_not_respond": true}',
     true)
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Auto-update updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_nevermiss_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to config table
DROP TRIGGER IF EXISTS trigger_nevermiss_config_updated_at ON nevermiss_config;
CREATE TRIGGER trigger_nevermiss_config_updated_at
  BEFORE UPDATE ON nevermiss_config
  FOR EACH ROW EXECUTE FUNCTION update_nevermiss_updated_at();

-- Apply trigger to templates table
DROP TRIGGER IF EXISTS trigger_nevermiss_templates_updated_at ON nevermiss_templates;
CREATE TRIGGER trigger_nevermiss_templates_updated_at
  BEFORE UPDATE ON nevermiss_templates
  FOR EACH ROW EXECUTE FUNCTION update_nevermiss_updated_at();

-- Apply trigger to rules table
DROP TRIGGER IF EXISTS trigger_nevermiss_rules_updated_at ON nevermiss_rules;
CREATE TRIGGER trigger_nevermiss_rules_updated_at
  BEFORE UPDATE ON nevermiss_rules
  FOR EACH ROW EXECUTE FUNCTION update_nevermiss_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE nevermiss_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevermiss_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevermiss_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevermiss_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevermiss_price_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevermiss_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevermiss_conversations_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevermiss_messages_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevermiss_training ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevermiss_audit_log ENABLE ROW LEVEL SECURITY;

-- Config policies
CREATE POLICY "Users can view own business config" ON nevermiss_config
  FOR SELECT USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can update own business config" ON nevermiss_config
  FOR UPDATE USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert own business config" ON nevermiss_config
  FOR INSERT WITH CHECK (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));

-- Intents policies
CREATE POLICY "Users can manage own intents" ON nevermiss_intents
  FOR ALL USING (config_id IN (SELECT id FROM nevermiss_config WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())));

-- Templates policies
CREATE POLICY "Users can manage own templates" ON nevermiss_templates
  FOR ALL USING (config_id IN (SELECT id FROM nevermiss_config WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())));

-- Rules policies
CREATE POLICY "Users can manage own rules" ON nevermiss_rules
  FOR ALL USING (config_id IN (SELECT id FROM nevermiss_config WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())));

-- Price list policies
CREATE POLICY "Users can manage own price list" ON nevermiss_price_list
  FOR ALL USING (config_id IN (SELECT id FROM nevermiss_config WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())));

-- Notifications policies
CREATE POLICY "Users can manage own notifications" ON nevermiss_notifications
  FOR ALL USING (config_id IN (SELECT id FROM nevermiss_config WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())));

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON nevermiss_conversations_v2
  FOR SELECT USING (config_id IN (SELECT id FROM nevermiss_config WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())));

CREATE POLICY "Users can update own conversations" ON nevermiss_conversations_v2
  FOR UPDATE USING (config_id IN (SELECT id FROM nevermiss_config WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())));

-- Messages policies
CREATE POLICY "Users can view own messages" ON nevermiss_messages_v2
  FOR SELECT USING (conversation_id IN (SELECT id FROM nevermiss_conversations_v2 WHERE config_id IN (SELECT id FROM nevermiss_config WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid()))));

CREATE POLICY "Users can insert messages" ON nevermiss_messages_v2
  FOR INSERT WITH CHECK (conversation_id IN (SELECT id FROM nevermiss_conversations_v2 WHERE config_id IN (SELECT id FROM nevermiss_config WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid()))));

-- Training policies
CREATE POLICY "Users can manage own training" ON nevermiss_training
  FOR ALL USING (config_id IN (SELECT id FROM nevermiss_config WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())));

-- Audit log policies (read-only for users)
CREATE POLICY "Users can view own audit log" ON nevermiss_audit_log
  FOR SELECT USING (config_id IN (SELECT id FROM nevermiss_config WHERE business_id IN (SELECT business_id FROM users WHERE id = auth.uid())));

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON nevermiss_config TO authenticated;
GRANT ALL ON nevermiss_intents TO authenticated;
GRANT ALL ON nevermiss_templates TO authenticated;
GRANT ALL ON nevermiss_rules TO authenticated;
GRANT ALL ON nevermiss_price_list TO authenticated;
GRANT ALL ON nevermiss_notifications TO authenticated;
GRANT ALL ON nevermiss_conversations_v2 TO authenticated;
GRANT ALL ON nevermiss_messages_v2 TO authenticated;
GRANT ALL ON nevermiss_training TO authenticated;
GRANT SELECT ON nevermiss_audit_log TO authenticated;

-- Service role needs full access for webhooks
GRANT ALL ON nevermiss_config TO service_role;
GRANT ALL ON nevermiss_intents TO service_role;
GRANT ALL ON nevermiss_templates TO service_role;
GRANT ALL ON nevermiss_rules TO service_role;
GRANT ALL ON nevermiss_price_list TO service_role;
GRANT ALL ON nevermiss_notifications TO service_role;
GRANT ALL ON nevermiss_conversations_v2 TO service_role;
GRANT ALL ON nevermiss_messages_v2 TO service_role;
GRANT ALL ON nevermiss_training TO service_role;
GRANT ALL ON nevermiss_audit_log TO service_role;
