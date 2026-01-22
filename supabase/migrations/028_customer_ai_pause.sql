-- =====================================================
-- MIGRATION 028: Customer AI Pause Control
-- Adds ability for portal customers to pause AI responses
-- =====================================================

-- Add AI pause state to customer_portal_access
ALTER TABLE customer_portal_access
ADD COLUMN IF NOT EXISTS ai_paused BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_paused_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_paused_reason TEXT;

-- Add index for efficient lookups of paused customers
CREATE INDEX IF NOT EXISTS idx_portal_access_ai_paused
ON customer_portal_access(business_id, customer_id)
WHERE ai_paused = TRUE;

-- Add column to link sms_conversations to portal customer
-- This helps efficiently query conversations for a portal user
ALTER TABLE sms_conversations
ADD COLUMN IF NOT EXISTS portal_customer_id UUID REFERENCES customers(id);

-- Create index for portal customer lookups
CREATE INDEX IF NOT EXISTS idx_sms_conversations_portal_customer
ON sms_conversations(business_id, portal_customer_id)
WHERE portal_customer_id IS NOT NULL;

-- Backfill existing conversations with customer links
UPDATE sms_conversations sc
SET portal_customer_id = sc.customer_id
WHERE sc.customer_id IS NOT NULL
  AND sc.portal_customer_id IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN customer_portal_access.ai_paused IS 'When true, AI will not auto-respond to this customer messages';
COMMENT ON COLUMN customer_portal_access.ai_paused_at IS 'Timestamp when AI was paused';
COMMENT ON COLUMN customer_portal_access.ai_paused_reason IS 'Reason for pausing AI (customer requested, etc)';
COMMENT ON COLUMN sms_conversations.portal_customer_id IS 'Links conversation to portal customer for efficient lookup';
