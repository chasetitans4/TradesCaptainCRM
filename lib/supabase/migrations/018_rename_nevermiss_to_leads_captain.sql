-- =====================================================
-- Migration 018: Rename NeverMiss to Leads Captain
-- This migration renames all nevermiss_* tables and references
-- to leads_captain_* to match the new product branding.
-- =====================================================

-- =====================================================
-- PART 1: Rename Core Tables
-- =====================================================

-- V2 Tables (current)
ALTER TABLE IF EXISTS nevermiss_config RENAME TO leads_captain_config;
ALTER TABLE IF EXISTS nevermiss_intents RENAME TO leads_captain_intents;
ALTER TABLE IF EXISTS nevermiss_templates RENAME TO leads_captain_templates;
ALTER TABLE IF EXISTS nevermiss_rules RENAME TO leads_captain_rules;
ALTER TABLE IF EXISTS nevermiss_price_list RENAME TO leads_captain_price_list;
ALTER TABLE IF EXISTS nevermiss_notifications RENAME TO leads_captain_notifications;
ALTER TABLE IF EXISTS nevermiss_conversations_v2 RENAME TO leads_captain_conversations_v2;
ALTER TABLE IF EXISTS nevermiss_messages_v2 RENAME TO leads_captain_messages_v2;
ALTER TABLE IF EXISTS nevermiss_training RENAME TO leads_captain_training;
ALTER TABLE IF EXISTS nevermiss_audit_log RENAME TO leads_captain_audit_log;

-- Legacy Tables (v1)
ALTER TABLE IF EXISTS nevermiss_conversations RENAME TO leads_captain_conversations;
ALTER TABLE IF EXISTS nevermiss_messages RENAME TO leads_captain_messages;
ALTER TABLE IF EXISTS nevermiss_events RENAME TO leads_captain_events;
ALTER TABLE IF EXISTS nevermiss_settings RENAME TO leads_captain_settings;

-- Plan Features Table
ALTER TABLE IF EXISTS plan_nevermiss_features RENAME TO plan_leads_captain_features;

-- =====================================================
-- PART 2: Rename Indexes
-- =====================================================

-- V2 Indexes
ALTER INDEX IF EXISTS idx_nevermiss_config_account RENAME TO idx_leads_captain_config_account;
ALTER INDEX IF EXISTS idx_nevermiss_intents_account RENAME TO idx_leads_captain_intents_account;
ALTER INDEX IF EXISTS idx_nevermiss_templates_account RENAME TO idx_leads_captain_templates_account;
ALTER INDEX IF EXISTS idx_nevermiss_rules_account RENAME TO idx_leads_captain_rules_account;
ALTER INDEX IF EXISTS idx_nevermiss_rules_active RENAME TO idx_leads_captain_rules_active;
ALTER INDEX IF EXISTS idx_nevermiss_price_list_account RENAME TO idx_leads_captain_price_list_account;
ALTER INDEX IF EXISTS idx_nevermiss_notifications_account RENAME TO idx_leads_captain_notifications_account;
ALTER INDEX IF EXISTS idx_nevermiss_conversations_v2_account RENAME TO idx_leads_captain_conversations_v2_account;
ALTER INDEX IF EXISTS idx_nevermiss_conversations_v2_phone RENAME TO idx_leads_captain_conversations_v2_phone;
ALTER INDEX IF EXISTS idx_nevermiss_messages_v2_conversation RENAME TO idx_leads_captain_messages_v2_conversation;
ALTER INDEX IF EXISTS idx_nevermiss_training_account RENAME TO idx_leads_captain_training_account;
ALTER INDEX IF EXISTS idx_nevermiss_audit_log_account RENAME TO idx_leads_captain_audit_log_account;

-- Legacy Indexes
ALTER INDEX IF EXISTS idx_nevermiss_events_twilio_sid RENAME TO idx_leads_captain_events_twilio_sid;
ALTER INDEX IF EXISTS idx_nevermiss_events_unprocessed RENAME TO idx_leads_captain_events_unprocessed;
ALTER INDEX IF EXISTS idx_nevermiss_events_business RENAME TO idx_leads_captain_events_business;
ALTER INDEX IF EXISTS idx_nevermiss_messages_twilio_sid RENAME TO idx_leads_captain_messages_twilio_sid;
ALTER INDEX IF EXISTS idx_nevermiss_messages_conversation RENAME TO idx_leads_captain_messages_conversation;
ALTER INDEX IF EXISTS idx_nevermiss_messages_business RENAME TO idx_leads_captain_messages_business;
ALTER INDEX IF EXISTS idx_nevermiss_conversations_business RENAME TO idx_leads_captain_conversations_business;
ALTER INDEX IF EXISTS idx_nevermiss_conversations_customer RENAME TO idx_leads_captain_conversations_customer;
ALTER INDEX IF EXISTS uniq_nevermiss_conversation_phones RENAME TO uniq_leads_captain_conversation_phones;

-- =====================================================
-- PART 3: Update plan_details table references
-- =====================================================

-- Update track references from 'nevermiss' to 'leads_captain'
UPDATE plan_details SET track = 'leads_captain' WHERE track = 'nevermiss';
UPDATE plan_details SET slug = REPLACE(slug, 'nevermiss', 'leads_captain') WHERE slug LIKE '%nevermiss%';
UPDATE plan_details SET name = REPLACE(name, 'NeverMiss', 'Leads Captain') WHERE name LIKE '%NeverMiss%';
UPDATE plan_details SET tagline = REPLACE(tagline, 'NeverMiss', 'Leads Captain') WHERE tagline LIKE '%NeverMiss%';

-- Update plan_features table
UPDATE plan_features SET plan_id = 'leads_captain' WHERE plan_id = 'nevermiss';
UPDATE plan_features SET name = REPLACE(name, 'NeverMiss', 'Leads Captain') WHERE name LIKE '%NeverMiss%';
UPDATE plan_features SET description = REPLACE(description, 'NeverMiss', 'Leads Captain') WHERE description LIKE '%NeverMiss%';

-- Update plan_upgrade_paths table
UPDATE plan_upgrade_paths SET from_plan = 'leads_captain' WHERE from_plan = 'nevermiss';
UPDATE plan_upgrade_paths SET description = REPLACE(description, 'NeverMiss', 'Leads Captain') WHERE description LIKE '%NeverMiss%';
UPDATE plan_upgrade_paths SET benefit_summary = REPLACE(benefit_summary, 'NeverMiss', 'Leads Captain') WHERE benefit_summary LIKE '%NeverMiss%';

-- Update commission_quick_reference table
UPDATE commission_quick_reference SET plan_slug = REPLACE(plan_slug, 'nevermiss', 'leads_captain') WHERE plan_slug LIKE '%nevermiss%';

-- =====================================================
-- PART 4: Update RLS Policies (Drop and Recreate)
-- =====================================================

-- Drop old policies for legacy tables
DROP POLICY IF EXISTS "Users can view their business events" ON leads_captain_events;
DROP POLICY IF EXISTS "System can insert events" ON leads_captain_events;
DROP POLICY IF EXISTS "System can update events" ON leads_captain_events;
DROP POLICY IF EXISTS "Users can view their business messages" ON leads_captain_messages;
DROP POLICY IF EXISTS "Users can insert messages for their business" ON leads_captain_messages;
DROP POLICY IF EXISTS "Users can update their business messages" ON leads_captain_messages;
DROP POLICY IF EXISTS "Users can view their business conversations" ON leads_captain_conversations;
DROP POLICY IF EXISTS "Users can insert conversations for their business" ON leads_captain_conversations;
DROP POLICY IF EXISTS "Users can update their business conversations" ON leads_captain_conversations;

-- Recreate policies with same logic (table names are already updated)
CREATE POLICY "Users can view their business events" ON leads_captain_events
  FOR SELECT USING (business_id = auth.uid());
CREATE POLICY "System can insert events" ON leads_captain_events
  FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update events" ON leads_captain_events
  FOR UPDATE USING (true);

CREATE POLICY "Users can view their business messages" ON leads_captain_messages
  FOR SELECT USING (business_id = auth.uid());
CREATE POLICY "Users can insert messages for their business" ON leads_captain_messages
  FOR INSERT WITH CHECK (business_id = auth.uid());
CREATE POLICY "Users can update their business messages" ON leads_captain_messages
  FOR UPDATE USING (business_id = auth.uid());

CREATE POLICY "Users can view their business conversations" ON leads_captain_conversations
  FOR SELECT USING (business_id = auth.uid());
CREATE POLICY "Users can insert conversations for their business" ON leads_captain_conversations
  FOR INSERT WITH CHECK (business_id = auth.uid());
CREATE POLICY "Users can update their business conversations" ON leads_captain_conversations
  FOR UPDATE USING (business_id = auth.uid());

-- =====================================================
-- PART 5: Add Comments for Documentation
-- =====================================================

COMMENT ON TABLE leads_captain_config IS 'Leads Captain (formerly NeverMiss) AI SMS configuration per business';
COMMENT ON TABLE leads_captain_intents IS 'Intent classification definitions for Leads Captain AI';
COMMENT ON TABLE leads_captain_templates IS 'Response templates for Leads Captain AI conversations';
COMMENT ON TABLE leads_captain_rules IS 'Automation rules for Leads Captain message handling';
COMMENT ON TABLE leads_captain_conversations_v2 IS 'Leads Captain conversation tracking (v2)';
COMMENT ON TABLE leads_captain_messages_v2 IS 'Individual messages in Leads Captain conversations (v2)';
COMMENT ON TABLE plan_leads_captain_features IS 'Leads Captain feature limits by plan tier';

-- =====================================================
-- Migration Complete
-- =====================================================
