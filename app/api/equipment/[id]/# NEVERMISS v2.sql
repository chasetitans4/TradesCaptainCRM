# NEVERMISS v2.0 IMPLEMENTATION PROMPT

**For:** Trae AI / Development Team
**Project:** TradesCaptain NeverMiss v2.0 + CRM Integration
**Date:** December 28, 2025

---

## OVERVIEW

Implement NeverMiss v2.0 — a rules-first AI SMS response system for missed calls. This upgrade transforms NeverMiss from a simple "AI texts back" service into a configurable, predictable, auditable system where users control behavior through visual rules, not prompts.

**Core Principle:** The user does NOT write prompts. They configure rules, templates, boundaries, and escalation paths.

**Packages that include NeverMiss:**
- NeverMiss standalone ($29/mo)
- Silver Bundle ($199-449/mo)
- Gold Bundle ($249-549/mo)

---

## SYSTEM ARCHITECTURE

```
Missed Call (Twilio webhook)
        ↓
Initial SMS sent ("Hey, we missed your call...")
        ↓
Customer replies
        ↓
┌─────────────────────────────────────┐
│         MESSAGE PROCESSOR           │
├─────────────────────────────────────┤
│ 1. Message Normalizer               │
│    → Clean text, detect language    │
│                                     │
│ 2. Intent Classifier                │
│    → Classify intent + confidence   │
│                                     │
│ 3. Context Builder                  │
│    → Customer history, thread,      │
│      business state (hours, etc.)   │
│                                     │
│ 4. Rule Engine                      │
│    → Check rules in priority order  │
│    → First match wins               │
│                                     │
│ 5. AI Layer (ONLY if no rule match) │
│    → Constrained by guardrails      │
│                                     │
│ 6. Response Guardrails              │
│    → Length, compliance, tone       │
└─────────────────────────────────────┘
        ↓
Send SMS / Escalate / Log
```

---

## DATABASE SCHEMA

Create the following tables in Supabase/PostgreSQL:

```sql
-- =====================================================
-- NEVERMISS v2.0 DATABASE SCHEMA
-- =====================================================

-- Business configuration
CREATE TABLE nevermiss_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL, -- References your existing clients table
  
  -- Business context
  business_name VARCHAR(200) NOT NULL,
  business_type VARCHAR(50), -- plumbing, hvac, electrical, roofing, etc.
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
  
  UNIQUE(client_id)
);

-- Enabled intents (user selects which to recognize)
CREATE TABLE nevermiss_intents (
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

-- Seed default intents for each new config
-- Intent codes: new_lead, pricing, availability, emergency, schedule, reschedule, 
-- cancel, existing_customer, followup, complaint, refund, wrong_number, spam, bot_check, general

-- Response templates
CREATE TABLE nevermiss_templates (
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

-- Automation rules (IF/THEN logic)
CREATE TABLE nevermiss_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES nevermiss_config(id) ON DELETE CASCADE NOT NULL,
  
  name VARCHAR(100) NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 100, -- Lower number = higher priority
  
  -- Conditions (JSONB)
  conditions JSONB NOT NULL,
  /*
  Example structure:
  {
    "operator": "AND", // or "OR"
    "conditions": [
      {"field": "intent", "operator": "equals", "value": "emergency"},
      {"field": "time", "operator": "is", "value": "outside_hours"},
      {"field": "message_contains", "operator": "any", "value": ["urgent", "asap", "emergency"]},
      {"field": "sentiment", "operator": "equals", "value": "negative"},
      {"field": "confidence", "operator": "less_than", "value": 70},
      {"field": "customer_status", "operator": "equals", "value": "new"},
      {"field": "conversation_length", "operator": "greater_than", "value": 3}
    ]
  }
  */
  
  -- Actions (JSONB)
  actions JSONB NOT NULL,
  /*
  Example structure:
  {
    "send_template": "template-uuid",
    "include_phone": true,
    "include_booking_link": false,
    "notify": {
      "recipients": ["owner", "oncall"],
      "methods": ["sms", "push", "email"],
      "urgency": "immediate"
    },
    "ask_followup": false,
    "stop_ai": false,
    "escalate_to_human": false,
    "add_tag": "hot_lead",
    "create_crm_task": false,
    "do_not_respond": false,
    "block_number": false
  }
  */
  
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price list (for AI pricing discussions)
CREATE TABLE nevermiss_price_list (
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

-- Notification recipients
CREATE TABLE nevermiss_notifications (
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

-- Conversations (threads)
CREATE TABLE nevermiss_conversations (
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
  /*
  {
    "name": "John Smith",
    "address": "123 Main St",
    "service_requested": "water heater repair",
    "preferred_time": "evenings",
    "tags": ["hot_lead", "repeat_customer"]
  }
  */
  
  -- Counters
  message_count INTEGER DEFAULT 0,
  ai_message_count INTEGER DEFAULT 0,
  
  -- CRM Integration
  crm_lead_id UUID, -- Link to CRM lead if created
  crm_contact_id UUID, -- Link to CRM contact if exists
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  last_customer_message_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE nevermiss_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES nevermiss_conversations(id) ON DELETE CASCADE NOT NULL,
  
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
  rule_matched UUID REFERENCES nevermiss_rules(id),
  template_used UUID REFERENCES nevermiss_templates(id),
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

-- Training examples (good/bad responses)
CREATE TABLE nevermiss_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES nevermiss_config(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES nevermiss_messages(id) ON DELETE SET NULL,
  
  incoming_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  
  rating VARCHAR(10), -- good, bad
  feedback_reasons TEXT[], -- too_long, too_formal, wrong_info, etc.
  better_response TEXT, -- User-provided correction
  
  processed BOOLEAN DEFAULT false, -- Whether used for training
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log (every action)
CREATE TABLE nevermiss_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES nevermiss_config(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES nevermiss_conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES nevermiss_messages(id) ON DELETE SET NULL,
  
  action VARCHAR(50) NOT NULL,
  /*
  Actions: message_received, message_sent, rule_matched, ai_invoked, 
  escalated, human_takeover, config_changed, rule_created, rule_updated,
  template_created, opt_out, blocked, unblocked
  */
  
  actor VARCHAR(100), -- system, ai, user email/name
  details JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_nevermiss_config_client ON nevermiss_config(client_id);
CREATE INDEX idx_nevermiss_intents_config ON nevermiss_intents(config_id);
CREATE INDEX idx_nevermiss_templates_config ON nevermiss_templates(config_id);
CREATE INDEX idx_nevermiss_rules_config_priority ON nevermiss_rules(config_id, priority);
CREATE INDEX idx_nevermiss_conversations_config ON nevermiss_conversations(config_id);
CREATE INDEX idx_nevermiss_conversations_phone ON nevermiss_conversations(customer_phone);
CREATE INDEX idx_nevermiss_conversations_status ON nevermiss_conversations(status);
CREATE INDEX idx_nevermiss_conversations_last_message ON nevermiss_conversations(last_message_at DESC);
CREATE INDEX idx_nevermiss_messages_conversation ON nevermiss_messages(conversation_id);
CREATE INDEX idx_nevermiss_messages_created ON nevermiss_messages(created_at DESC);
CREATE INDEX idx_nevermiss_messages_approval ON nevermiss_messages(approval_status) WHERE approval_required = true;
CREATE INDEX idx_nevermiss_audit_config ON nevermiss_audit_log(config_id);
CREATE INDEX idx_nevermiss_audit_created ON nevermiss_audit_log(created_at DESC);

-- =====================================================
-- SEED DEFAULT INTENTS (Run after creating config)
-- =====================================================

-- Function to seed intents for new config
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
    (p_config_id, 'general', 'General Question', 'other', ARRAY['Question', 'Info', 'Wondering'], true);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DEFAULT TEMPLATES (Run after creating config)
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
     'No problem! Looks like you have the wrong number. Have a great day! 👋', true),
     
    (p_config_id, 'Opt Out Confirmation', 'opt_out',
     'You''ve been unsubscribed from {{business_name}} messages. Reply START to resubscribe. Have a great day!', true);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SEED DEFAULT RULES (Run after creating config)
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
  SELECT id INTO v_emergency_template_id FROM nevermiss_templates WHERE config_id = p_config_id AND template_key = 'emergency';
  SELECT id INTO v_after_hours_template_id FROM nevermiss_templates WHERE config_id = p_config_id AND template_key = 'after_hours';
  SELECT id INTO v_bot_check_template_id FROM nevermiss_templates WHERE config_id = p_config_id AND template_key = 'bot_check';
  SELECT id INTO v_angry_template_id FROM nevermiss_templates WHERE config_id = p_config_id AND template_key = 'angry_customer';
  SELECT id INTO v_wrong_number_template_id FROM nevermiss_templates WHERE config_id = p_config_id AND template_key = 'wrong_number';

  INSERT INTO nevermiss_rules (config_id, name, description, priority, conditions, actions, is_system)
  VALUES
    -- Rule 1: Emergency after hours
    (p_config_id, 'Emergency After Hours', 'Respond immediately to emergencies outside business hours', 10,
     '{"operator": "AND", "conditions": [{"field": "intent", "operator": "equals", "value": "emergency"}, {"field": "time", "operator": "is", "value": "outside_hours"}]}',
     format('{"send_template": "%s", "include_phone": true, "notify": {"recipients": ["owner", "oncall"], "methods": ["sms", "push"], "urgency": "immediate"}, "ask_followup": false}', v_emergency_template_id)::jsonb,
     true),
    
    -- Rule 2: Emergency during hours
    (p_config_id, 'Emergency During Hours', 'Respond to emergencies during business hours', 11,
     '{"operator": "AND", "conditions": [{"field": "intent", "operator": "equals", "value": "emergency"}]}',
     format('{"send_template": "%s", "include_phone": true, "notify": {"recipients": ["owner"], "methods": ["sms", "push"], "urgency": "immediate"}, "ask_followup": false}', v_emergency_template_id)::jsonb,
     true),
    
    -- Rule 3: Angry customer
    (p_config_id, 'Angry Customer', 'Escalate angry customers to human', 20,
     '{"operator": "OR", "conditions": [{"field": "sentiment", "operator": "equals", "value": "angry"}, {"field": "message_contains", "operator": "any", "value": ["terrible", "awful", "horrible", "sue", "lawyer", "attorney", "BBB", "report"]}]}',
     format('{"send_template": "%s", "stop_ai": true, "escalate_to_human": true, "notify": {"recipients": ["owner"], "methods": ["sms", "push", "email"], "urgency": "immediate"}}', v_angry_template_id)::jsonb,
     true),
    
    -- Rule 4: Bot check
    (p_config_id, 'Bot Check', 'Handle questions about being a bot', 30,
     '{"operator": "OR", "conditions": [{"field": "intent", "operator": "equals", "value": "bot_check"}, {"field": "message_contains", "operator": "any", "value": ["are you a bot", "real person", "talking to AI", "automated"]}]}',
     format('{"send_template": "%s", "notify": {"recipients": ["owner"], "methods": ["push"], "urgency": "normal"}}', v_bot_check_template_id)::jsonb,
     true),
    
    -- Rule 5: After hours (non-emergency)
    (p_config_id, 'After Hours', 'Respond to non-emergency messages outside business hours', 50,
     '{"operator": "AND", "conditions": [{"field": "time", "operator": "is", "value": "outside_hours"}, {"field": "intent", "operator": "not_equals", "value": "emergency"}]}',
     format('{"send_template": "%s", "include_booking_link": true}', v_after_hours_template_id)::jsonb,
     true),
    
    -- Rule 6: Wrong number
    (p_config_id, 'Wrong Number', 'Handle wrong number messages', 60,
     '{"operator": "AND", "conditions": [{"field": "intent", "operator": "equals", "value": "wrong_number"}]}',
     format('{"send_template": "%s", "stop_ai": true}', v_wrong_number_template_id)::jsonb,
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
     true);
END;
$$ LANGUAGE plpgsql;
```

---

## API ENDPOINTS

Implement the following API routes:

```typescript
// =====================================================
// NEVERMISS v2.0 API ROUTES
// =====================================================

// ----- CONFIGURATION -----
GET    /api/nevermiss/config                    // Get business config
PUT    /api/nevermiss/config                    // Update business config
GET    /api/nevermiss/config/hours              // Get business hours
PUT    /api/nevermiss/config/hours              // Update business hours

// ----- INTENTS -----
GET    /api/nevermiss/intents                   // List all intents
PUT    /api/nevermiss/intents                   // Bulk update enabled intents
PUT    /api/nevermiss/intents/:code             // Toggle single intent

// ----- TEMPLATES -----
GET    /api/nevermiss/templates                 // List all templates
POST   /api/nevermiss/templates                 // Create template
GET    /api/nevermiss/templates/:id             // Get single template
PUT    /api/nevermiss/templates/:id             // Update template
DELETE /api/nevermiss/templates/:id             // Delete template (non-system only)
POST   /api/nevermiss/templates/:id/preview     // Preview with sample variables

// ----- RULES -----
GET    /api/nevermiss/rules                     // List all rules (sorted by priority)
POST   /api/nevermiss/rules                     // Create rule
GET    /api/nevermiss/rules/:id                 // Get single rule
PUT    /api/nevermiss/rules/:id                 // Update rule
DELETE /api/nevermiss/rules/:id                 // Delete rule (non-system only)
PUT    /api/nevermiss/rules/reorder             // Reorder rule priorities
POST   /api/nevermiss/rules/test                // Test rule against sample message

// ----- AI SETTINGS -----
GET    /api/nevermiss/ai-settings               // Get AI settings
PUT    /api/nevermiss/ai-settings               // Update AI settings

// ----- PRICE LIST -----
GET    /api/nevermiss/price-list                // Get price list
POST   /api/nevermiss/price-list                // Add service price
PUT    /api/nevermiss/price-list/:id            // Update service price
DELETE /api/nevermiss/price-list/:id            // Delete service price

// ----- NOTIFICATIONS -----
GET    /api/nevermiss/notifications             // Get notification settings
POST   /api/nevermiss/notifications             // Add notification recipient
PUT    /api/nevermiss/notifications/:id         // Update recipient
DELETE /api/nevermiss/notifications/:id         // Delete recipient
POST   /api/nevermiss/notifications/test        // Send test notification

// ----- CONVERSATIONS -----
GET    /api/nevermiss/conversations             // List conversations (with filters)
GET    /api/nevermiss/conversations/:id         // Get conversation with messages
POST   /api/nevermiss/conversations/:id/takeover // Human takeover
POST   /api/nevermiss/conversations/:id/release // Release back to AI
POST   /api/nevermiss/conversations/:id/close   // Close conversation
POST   /api/nevermiss/conversations/:id/block   // Block customer number
GET    /api/nevermiss/conversations/:id/audit   // Get audit log for conversation

// ----- MESSAGES -----
GET    /api/nevermiss/conversations/:id/messages // List messages in conversation
POST   /api/nevermiss/conversations/:id/messages // Send manual message
GET    /api/nevermiss/messages/:id/explain       // Get response explanation

// ----- APPROVAL QUEUE -----
GET    /api/nevermiss/approvals                 // Get pending approvals
POST   /api/nevermiss/approvals/:id/approve     // Approve message
POST   /api/nevermiss/approvals/:id/reject      // Reject message
POST   /api/nevermiss/approvals/:id/edit        // Edit and approve
POST   /api/nevermiss/approvals/bulk            // Bulk approve/reject

// ----- TRAINING -----
GET    /api/nevermiss/training                  // List training examples
POST   /api/nevermiss/training                  // Add training example
DELETE /api/nevermiss/training/:id              // Delete training example

// ----- ANALYTICS -----
GET    /api/nevermiss/analytics/overview        // Dashboard stats
GET    /api/nevermiss/analytics/conversations   // Conversation metrics
GET    /api/nevermiss/analytics/responses       // Response effectiveness
GET    /api/nevermiss/analytics/rules           // Rule hit rates

// ----- ADMIN -----
POST   /api/nevermiss/admin/pause               // Pause all AI globally
POST   /api/nevermiss/admin/resume              // Resume AI
PUT    /api/nevermiss/admin/mode                // Set global mode
GET    /api/nevermiss/admin/audit               // Full audit log

// ----- WEBHOOKS (Twilio) -----
POST   /api/nevermiss/webhook/voice             // Missed call webhook
POST   /api/nevermiss/webhook/sms               // Incoming SMS webhook
POST   /api/nevermiss/webhook/status            // Message status callback
```

---

## MESSAGE PROCESSING LOGIC

Implement the following message processing flow:

```typescript
// /lib/nevermiss/processor.ts

interface ProcessMessageInput {
  configId: string;
  conversationId: string;
  message: string;
  customerPhone: string;
}

interface ProcessMessageResult {
  response: string | null;
  shouldSend: boolean;
  requiresApproval: boolean;
  ruleMatched: string | null;
  templateUsed: string | null;
  aiUsed: boolean;
  explanation: string;
  actions: {
    notify: NotifyAction[];
    escalate: boolean;
    stopAi: boolean;
    addTag: string | null;
    createCrmLead: boolean;
  };
}

async function processMessage(input: ProcessMessageInput): Promise<ProcessMessageResult> {
  const config = await getConfig(input.configId);
  const conversation = await getConversation(input.conversationId);
  
  // Step 1: Normalize message
  const normalizedMessage = normalizeMessage(input.message);
  
  // Step 2: Classify intent
  const intentResult = await classifyIntent(normalizedMessage, config.enabledIntents);
  // Returns: { intent: 'emergency', confidence: 94, sentiment: 'negative' }
  
  // Step 3: Build context
  const context = await buildContext({
    config,
    conversation,
    message: normalizedMessage,
    intent: intentResult,
  });
  // Context includes: isBusinessHours, customerStatus, conversationLength, etc.
  
  // Step 4: Check rules in priority order
  const rules = await getRulesByPriority(input.configId);
  let matchedRule = null;
  
  for (const rule of rules) {
    if (evaluateConditions(rule.conditions, context)) {
      matchedRule = rule;
      break; // First match wins
    }
  }
  
  // Step 5: Determine response
  if (matchedRule) {
    // Use rule-defined response
    return executeRuleActions(matchedRule, context);
  }
  
  // Step 6: AI fallback (if enabled and no rule matched)
  if (config.ai_enabled && intentResult.confidence >= config.ai_confidence_threshold) {
    return generateAiResponse(context, config);
  }
  
  // Step 7: Default behavior
  return executeDefaultBehavior(config, context);
}

// Intent classification using GPT-4
async function classifyIntent(message: string, enabledIntents: string[]): Promise<IntentResult> {
  const prompt = `
Classify the following message into one of these intents: ${enabledIntents.join(', ')}

Message: "${message}"

Respond in JSON format:
{
  "intent": "intent_code",
  "confidence": 0-100,
  "sentiment": "positive|neutral|negative|angry",
  "entities": {
    "name": "extracted name or null",
    "service": "extracted service or null",
    "time": "extracted time reference or null",
    "address": "extracted address or null"
  }
}
`;

  // Call OpenAI API
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    response_format: { type: 'json_object' },
  });
  
  return JSON.parse(response.choices[0].message.content);
}

// Evaluate rule conditions
function evaluateConditions(conditions: RuleConditions, context: MessageContext): boolean {
  const { operator, conditions: conditionList } = conditions;
  
  const results = conditionList.map(condition => {
    switch (condition.field) {
      case 'intent':
        return evaluateIntentCondition(condition, context.intent);
      case 'time':
        return evaluateTimeCondition(condition, context.isBusinessHours);
      case 'message_contains':
        return evaluateContainsCondition(condition, context.message);
      case 'sentiment':
        return context.sentiment === condition.value;
      case 'confidence':
        return evaluateNumericCondition(condition, context.confidence);
      case 'customer_status':
        return context.customerStatus === condition.value;
      case 'conversation_length':
        return evaluateNumericCondition(condition, context.messageCount);
      default:
        return false;
    }
  });
  
  return operator === 'AND' 
    ? results.every(r => r) 
    : results.some(r => r);
}

// AI response generation with guardrails
async function generateAiResponse(
  context: MessageContext, 
  config: NevermissConfig
): Promise<ProcessMessageResult> {
  
  const systemPrompt = buildAiSystemPrompt(config);
  const guardrails = getGuardrails(config);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      ...context.conversationHistory,
      { role: 'user', content: context.message },
    ],
    temperature: getTemperature(config.ai_creativity_level),
    max_tokens: 150,
  });
  
  let aiResponse = response.choices[0].message.content;
  
  // Apply guardrails
  aiResponse = applyGuardrails(aiResponse, guardrails, config);
  
  return {
    response: aiResponse,
    shouldSend: true,
    requiresApproval: config.require_approval !== 'never',
    ruleMatched: null,
    templateUsed: null,
    aiUsed: true,
    explanation: 'No rule matched. AI generated response with guardrails.',
    actions: { notify: [], escalate: false, stopAi: false, addTag: null, createCrmLead: false },
  };
}

function buildAiSystemPrompt(config: NevermissConfig): string {
  return `
You are responding to SMS messages for ${config.business_name}, a ${config.business_type} business.

RULES YOU MUST FOLLOW:
- Keep responses under ${config.ai_creativity_level === 'none' ? 100 : 160} characters
- Use a ${config.tone} tone
- ${config.use_emojis ? 'You may use occasional emojis' : 'Do NOT use emojis'}
- Ask only ONE question at a time
- Sound human, not robotic

THINGS YOU MUST NEVER DO:
- Never promise specific pricing (say "depends on the job" or give ranges if allowed)
- Never confirm availability without real data
- Never make up information about the business
- Never negotiate discounts
- Never claim to be human if directly asked (say you're helping out for ${config.owner_name})
- Never respond to legal threats
- Never provide medical, legal, or safety advice

BUSINESS CONTEXT:
- Service area: ${config.service_area}
- Emergency line: ${config.emergency_phone || 'Not available'}
- Booking: ${config.booking_link || 'Call to schedule'}
- Owner: ${config.owner_name}

${config.ai_pricing_mode === 'ranges' ? `
PRICING (ranges only):
${config.priceList?.map(p => `- ${p.service_name}: $${p.price_min}-$${p.price_max}`).join('\n')}
` : ''}

Respond naturally as if you're ${config.owner_name} or their assistant.
`;
}
```

---

## UI COMPONENTS

Build the following UI pages/components:

### 1. NeverMiss Settings Page (`/nevermiss/settings`)

```
- Business Context Form
  - Business name, type, service area
  - Business hours (day/time picker)
  - Emergency service toggle + phone
  - Booking method (link, phone, SMS)
  - Response style (tone slider, emoji toggle)
  - Languages

- Intent Configuration
  - Checklist of intents to enable/disable
  - Each intent shows example phrases
  
- AI Settings
  - Confidence threshold slider
  - Creativity level selector
  - Max messages before human
  - Pricing mode selector
  - Price list editor (if enabled)
```

### 2. Rules Page (`/nevermiss/rules`)

```
- List of rules (draggable to reorder)
  - Rule name, description
  - Conditions summary
  - Actions summary
  - Active/Inactive toggle
  
- Rule Editor Modal
  - Name, description
  - Condition builder (visual)
    - Field selector
    - Operator selector
    - Value input
    - AND/OR toggle
    - Add/remove conditions
  - Action checkboxes
    - Template selector
    - Notification options
    - Flags (stop AI, escalate, etc.)
    
- Test Rule Panel
  - Input sample message
  - See which rule would match
  - See what response would be sent
```

### 3. Templates Page (`/nevermiss/templates`)

```
- List of templates
  - Name, preview
  - Used by (which rules)
  - Edit/Delete (non-system only)
  
- Template Editor Modal
  - Name
  - Content textarea with variable buttons
    - {{first_name}}, {{business_name}}, etc.
  - Settings
    - Max length
    - Emoji setting
    - AI personalization level
  - Live preview with sample data
```

### 4. Conversations Page (`/nevermiss/conversations`)

```
- Conversation list (filterable)
  - Customer name/phone
  - Status badge
  - Last message preview
  - Time since last message
  - Tags (hot lead, emergency, etc.)
  
- Conversation detail view
  - Message thread (SMS-style bubbles)
  - Each message shows:
    - Content
    - Timestamp
    - [Outbound] Rule/template/AI indicator
  - Actions:
    - Take over conversation
    - Send manual message
    - View customer memory
    - View audit log
    - Block number
    - Close conversation
```

### 5. Approval Queue (`/nevermiss/approvals`)

```
- List of pending messages
  - Customer info
  - Incoming message
  - Proposed response
  - Why this response (rule/AI)
  - Time remaining before auto-action
  
- Actions per message:
  - Approve (send as-is)
  - Edit and approve
  - Reject (don't send)
  
- Bulk actions
```

### 6. Analytics Dashboard (`/nevermiss/analytics`)

```
- Overview cards
  - Total conversations (today/week/month)
  - Response rate
  - Average response time
  - Hot leads captured
  - Escalation rate
  
- Charts
  - Conversations over time
  - Intent breakdown (pie chart)
  - Rule hit rates (bar chart)
  - AI vs template responses
  
- Recent activity feed
```

---

## CRM INTEGRATION

For packages that include NeverMiss (Silver, Gold):

### 1. Add NeverMiss to CRM Navigation

```typescript
// In sidebar navigation
{
  name: 'NeverMiss',
  icon: PhoneIcon,
  href: '/nevermiss',
  children: [
    { name: 'Dashboard', href: '/nevermiss' },
    { name: 'Conversations', href: '/nevermiss/conversations' },
    { name: 'Rules', href: '/nevermiss/rules' },
    { name: 'Templates', href: '/nevermiss/templates' },
    { name: 'Settings', href: '/nevermiss/settings' },
  ],
}
```

### 2. Dashboard Widget

Add NeverMiss widget to CRM dashboard:

```tsx
<NeverMissWidget>
  <StatsRow>
    <Stat label="Missed Calls" value={stats.missedCalls} />
    <Stat label="Conversations" value={stats.activeConversations} />
    <Stat label="Hot Leads" value={stats.hotLeads} />
    <Stat label="Need Human" value={stats.needsHuman} highlight />
  </StatsRow>
  <ActivityFeed items={recentActivity} limit={5} />
  <Link href="/nevermiss/conversations">View All →</Link>
</NeverMissWidget>
```

### 3. Contact Integration

Add NeverMiss tab to contact detail page:

```tsx
// /contacts/[id]/nevermiss tab
<NeverMissContactTab>
  <CustomerMemory memory={contact.nevermissMemory} editable />
  <ConversationHistory conversations={conversations} />
  <Actions>
    <Button onClick={blockNumber}>Block Number</Button>
    <Button onClick={clearMemory}>Clear Memory</Button>
  </Actions>
</NeverMissContactTab>
```

### 4. Auto-Create Leads

When NeverMiss starts a new conversation:

```typescript
async function onNewConversation(conversation: Conversation) {
  // Check if contact exists
  const existingContact = await findContactByPhone(conversation.customerPhone);
  
  if (!existingContact) {
    // Create new lead in CRM
    const lead = await createLead({
      phone: conversation.customerPhone,
      name: conversation.customerMemory?.name,
      source: 'nevermiss',
      notes: `Initial intent: ${conversation.initialIntent}`,
      tags: conversation.isHotLead ? ['hot_lead'] : [],
    });
    
    // Link to conversation
    await updateConversation(conversation.id, { crm_lead_id: lead.id });
  } else {
    // Link to existing contact
    await updateConversation(conversation.id, { crm_contact_id: existingContact.id });
  }
}
```

### 5. Appointment Sync

When booking is detected:

```typescript
async function onBookingDetected(conversation: Conversation, bookingDetails: BookingDetails) {
  // Create appointment in CRM
  const appointment = await createAppointment({
    contactId: conversation.crm_contact_id || conversation.crm_lead_id,
    date: bookingDetails.date,
    time: bookingDetails.time,
    service: bookingDetails.service,
    source: 'nevermiss',
    notes: 'Booked via NeverMiss SMS',
  });
  
  // Update conversation
  await updateConversation(conversation.id, {
    customerMemory: {
      ...conversation.customerMemory,
      lastAppointment: appointment.id,
    },
  });
}
```

---

## TWILIO WEBHOOKS

### Missed Call Webhook

```typescript
// POST /api/nevermiss/webhook/voice
export async function POST(request: Request) {
  const formData = await request.formData();
  const callStatus = formData.get('CallStatus');
  const from = formData.get('From');
  const to = formData.get('To');
  
  if (callStatus === 'no-answer' || callStatus === 'busy') {
    // Find config by phone number
    const config = await getConfigByPhone(to);
    
    if (config && config.global_mode !== 'paused') {
      // Create conversation
      const conversation = await createConversation({
        configId: config.id,
        customerPhone: from,
        status: 'active',
      });
      
      // Get missed call template
      const template = await getTemplate(config.id, 'missed_call_initial');
      const message = renderTemplate(template, { business_name: config.business_name });
      
      // Send initial SMS
      await sendSms(from, message, config);
      
      // Log
      await createMessage({
        conversationId: conversation.id,
        direction: 'outbound',
        content: message,
        templateUsed: template.id,
      });
    }
  }
  
  return new Response('<Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  });
}
```

### Incoming SMS Webhook

```typescript
// POST /api/nevermiss/webhook/sms
export async function POST(request: Request) {
  const formData = await request.formData();
  const from = formData.get('From');
  const to = formData.get('To');
  const body = formData.get('Body');
  
  // Check for opt-out
  if (['STOP', 'UNSUBSCRIBE', 'CANCEL', 'QUIT'].includes(body.toUpperCase().trim())) {
    return handleOptOut(from, to);
  }
  
  // Find config and conversation
  const config = await getConfigByPhone(to);
  let conversation = await findActiveConversation(config.id, from);
  
  if (!conversation) {
    conversation = await createConversation({
      configId: config.id,
      customerPhone: from,
      status: 'active',
    });
  }
  
  // Log incoming message
  const inboundMessage = await createMessage({
    conversationId: conversation.id,
    direction: 'inbound',
    content: body,
  });
  
  // Process message
  const result = await processMessage({
    configId: config.id,
    conversationId: conversation.id,
    message: body,
    customerPhone: from,
  });
  
  // Update message with analysis
  await updateMessage(inboundMessage.id, {
    detected_intent: result.intent,
    intent_confidence: result.confidence,
    detected_sentiment: result.sentiment,
    extracted_entities: result.entities,
  });
  
  // Handle response
  if (result.shouldSend && result.response) {
    if (result.requiresApproval) {
      // Queue for approval
      await createPendingApproval({
        conversationId: conversation.id,
        proposedResponse: result.response,
        ruleMatched: result.ruleMatched,
        templateUsed: result.templateUsed,
        aiUsed: result.aiUsed,
        explanation: result.explanation,
      });
    } else {
      // Send immediately
      await sendSms(from, result.response, config);
      
      await createMessage({
        conversationId: conversation.id,
        direction: 'outbound',
        content: result.response,
        ruleMatched: result.ruleMatched,
        templateUsed: result.templateUsed,
        aiUsed: result.aiUsed,
        decision_explanation: result.explanation,
      });
    }
  }
  
  // Execute actions
  if (result.actions.notify.length > 0) {
    await sendNotifications(result.actions.notify, conversation, body);
  }
  
  if (result.actions.escalate) {
    await updateConversation(conversation.id, { 
      status: 'human_takeover',
      requires_human: true,
    });
  }
  
  if (result.actions.addTag) {
    await addTagToConversation(conversation.id, result.actions.addTag);
  }
  
  if (result.actions.createCrmLead) {
    await createCrmLeadFromConversation(conversation);
  }
  
  return new Response('<Response></Response>', {
    headers: { 'Content-Type': 'text/xml' },
  });
}
```

---

## FEATURE GATING BY PLAN

```typescript
// /lib/nevermiss/features.ts

export const NEVERMISS_FEATURES = {
  standalone: {
    // NeverMiss $29/mo standalone
    basicConfig: true,
    templates: true,
    rules: 5, // Max 5 custom rules
    aiResponses: true,
    conversations: true,
    analytics: 'basic',
    crmIntegration: false,
    approvalQueue: false,
    training: false,
    priceList: false,
  },
  silver: {
    // Silver Bundle
    basicConfig: true,
    templates: true,
    rules: 15, // Max 15 custom rules
    aiResponses: true,
    conversations: true,
    analytics: 'standard',
    crmIntegration: true, // Basic: contacts sync
    approvalQueue: true,
    training: false,
    priceList: true,
  },
  gold: {
    // Gold Bundle
    basicConfig: true,
    templates: true,
    rules: 'unlimited',
    aiResponses: true,
    conversations: true,
    analytics: 'advanced',
    crmIntegration: true, // Full: contacts + appointments + leads
    approvalQueue: true,
    training: true,
    priceList: true,
  },
};

export function canAccessFeature(plan: string, feature: string): boolean {
  const planFeatures = NEVERMISS_FEATURES[plan];
  return planFeatures?.[feature] === true || planFeatures?.[feature] === 'unlimited';
}

export function getFeatureLimit(plan: string, feature: string): number | null {
  const planFeatures = NEVERMISS_FEATURES[plan];
  const value = planFeatures?.[feature];
  return typeof value === 'number' ? value : null;
}
```

---

## COMPLIANCE (TCPA)

Always enforce these compliance rules:

```typescript
// /lib/nevermiss/compliance.ts

const OPT_OUT_KEYWORDS = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
const HELP_KEYWORDS = ['HELP', 'INFO'];

export async function handleOptOut(customerPhone: string, businessPhone: string) {
  const config = await getConfigByPhone(businessPhone);
  
  // Mark all conversations as opted out
  await db.nevermiss_conversations.updateMany({
    where: { config_id: config.id, customer_phone: customerPhone },
    data: { opted_out: true, status: 'closed' },
  });
  
  // Send confirmation
  const template = await getTemplate(config.id, 'opt_out');
  const message = renderTemplate(template, { business_name: config.business_name });
  await sendSms(customerPhone, message, config);
  
  // Log
  await createAuditLog({
    configId: config.id,
    action: 'opt_out',
    details: { customerPhone },
  });
}

export async function handleHelp(customerPhone: string, businessPhone: string) {
  const config = await getConfigByPhone(businessPhone);
  
  const helpMessage = `${config.business_name}: For help, call ${config.main_phone}. Reply STOP to unsubscribe.`;
  await sendSms(customerPhone, helpMessage, config);
}

export function isOptedOut(conversation: Conversation): boolean {
  return conversation.opted_out === true;
}

export function checkCompliance(message: string): { isOptOut: boolean; isHelp: boolean } {
  const normalized = message.toUpperCase().trim();
  return {
    isOptOut: OPT_OUT_KEYWORDS.includes(normalized),
    isHelp: HELP_KEYWORDS.includes(normalized),
  };
}
```

---

## TESTING CHECKLIST

```
CONFIGURATION:
□ Business context form saves correctly
□ Business hours save with timezone
□ Emergency service toggle works
□ Tone/emoji settings apply to responses
□ Language selection works

INTENTS:
□ All default intents created on signup
□ Enable/disable intents works
□ Intent classification is accurate
□ Confidence scores are reasonable

TEMPLATES:
□ Default templates created on signup
□ Create/edit/delete templates works
□ Variables render correctly
□ Preview shows accurate output
□ Max length enforced

RULES:
□ Default rules created on signup
□ Create/edit/delete rules works
□ Drag to reorder updates priority
□ Conditions evaluate correctly
□ Actions execute correctly
□ Test rule feature works
□ First matching rule wins

AI:
□ AI only invoked when no rule matches
□ Confidence threshold respected
□ Creativity levels produce different outputs
□ Guardrails enforced (no pricing promises, etc.)
□ Max messages limit works

CONVERSATIONS:
□ Missed call creates conversation
□ Incoming SMS routes correctly
□ Human takeover pauses AI
□ Close conversation works
□ Block number works
□ Audit log captures all actions

APPROVAL QUEUE:
□ Messages queue when approval required
□ Approve sends message
□ Edit and approve works
□ Reject prevents sending
□ Timeout behavior works

NOTIFICATIONS:
□ Notification triggers fire correctly
□ SMS notifications send
□ Push notifications work
□ Email notifications send
□ Quiet hours respected

CRM INTEGRATION (Silver/Gold):
□ Dashboard widget shows data
□ Contact tab shows conversation history
□ Lead auto-creation works
□ Appointment sync works
□ Tags sync both ways

COMPLIANCE:
□ STOP immediately opts out
□ Opt-out confirmation sent
□ Opted-out numbers blocked
□ HELP sends info message
□ All messages logged with timestamps
```

---

## SUMMARY

This implementation adds NeverMiss v2.0 with:

1. **Rules-first architecture** — Predictable, user-controlled behavior
2. **Visual rule builder** — IF/THEN logic without code
3. **Smart templates** — Variables and conditional rendering
4. **Constrained AI** — Only used as fallback, heavily guardrailed
5. **Intent classification** — User selects what to recognize
6. **Automatic escalation** — Safety triggers for angry/legal/bot
7. **Approval queue** — Review AI responses before sending
8. **Full audit logs** — Explainability for every message
9. **TCPA compliance** — Built-in opt-out handling
10. **CRM integration** — Leads, contacts, appointments sync

**Core principle:** The user does NOT write prompts. They configure rules, templates, boundaries, and escalation paths.

---

# END OF IMPLEMENTATION PROMPT