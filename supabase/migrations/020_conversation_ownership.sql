-- =====================================================
-- CONVERSATION OWNERSHIP & COLLISION PREVENTION
-- Per Section 5.1 and 5.2 of Product Identity
-- =====================================================

-- Add owner_id to outreach_conversations
ALTER TABLE outreach_conversations
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now();

-- Add owner_id to leads_captain_conversations_v2
ALTER TABLE leads_captain_conversations_v2
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now();

-- Create index for ownership queries
CREATE INDEX IF NOT EXISTS idx_outreach_conv_owner ON outreach_conversations(owner_id);
CREATE INDEX IF NOT EXISTS idx_outreach_conv_claimed ON outreach_conversations(claimed_by) WHERE claimed_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lc_conv_owner ON leads_captain_conversations_v2(owner_id);
CREATE INDEX IF NOT EXISTS idx_lc_conv_claimed ON leads_captain_conversations_v2(claimed_by) WHERE claimed_by IS NOT NULL;

-- Draft messages table for collision prevention (Section 5.2)
CREATE TABLE IF NOT EXISTS message_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  conversation_type VARCHAR(50) NOT NULL, -- 'outreach' or 'leads_captain'
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Only one draft per user per conversation
  UNIQUE(conversation_id, conversation_type, user_id)
);

-- Index for draft lookups
CREATE INDEX IF NOT EXISTS idx_drafts_conv ON message_drafts(conversation_id, conversation_type);
CREATE INDEX IF NOT EXISTS idx_drafts_user ON message_drafts(user_id);

-- Function to auto-update owner when message is sent
CREATE OR REPLACE FUNCTION update_conversation_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update for outbound messages with an actor
  IF NEW.direction = 'outbound' AND NEW.actor_id IS NOT NULL THEN
    -- Update outreach_conversations if applicable
    UPDATE outreach_conversations
    SET owner_id = NEW.actor_id,
        last_activity_at = now()
    WHERE id = NEW.conversation_id;

    -- Update leads_captain_conversations_v2 if applicable
    UPDATE leads_captain_conversations_v2
    SET owner_id = NEW.actor_id,
        last_activity_at = now()
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for outreach_messages
DROP TRIGGER IF EXISTS trg_update_owner_outreach ON outreach_messages;
CREATE TRIGGER trg_update_owner_outreach
  AFTER INSERT ON outreach_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_owner();

-- Trigger for leads_captain_messages_v2
DROP TRIGGER IF EXISTS trg_update_owner_lc ON leads_captain_messages_v2;
CREATE TRIGGER trg_update_owner_lc
  AFTER INSERT ON leads_captain_messages_v2
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_owner();

-- Function to expire claimed status after 30 minutes (Section 5.2)
CREATE OR REPLACE FUNCTION expire_conversation_claims()
RETURNS void AS $$
BEGIN
  -- Expire claims older than 30 minutes
  UPDATE outreach_conversations
  SET claimed_by = NULL, claimed_at = NULL
  WHERE claimed_at < now() - interval '30 minutes';

  UPDATE leads_captain_conversations_v2
  SET claimed_by = NULL, claimed_at = NULL
  WHERE claimed_at < now() - interval '30 minutes';
END;
$$ LANGUAGE plpgsql;

-- View for conversation ownership info
CREATE OR REPLACE VIEW conversation_ownership AS
SELECT
  c.id,
  'outreach' as conversation_type,
  c.owner_id,
  owner.raw_user_meta_data->>'full_name' as owner_name,
  c.claimed_by,
  claimer.raw_user_meta_data->>'full_name' as claimed_by_name,
  c.claimed_at,
  c.last_activity_at,
  CASE
    WHEN c.claimed_at > now() - interval '30 minutes' THEN true
    ELSE false
  END as is_claimed
FROM outreach_conversations c
LEFT JOIN auth.users owner ON owner.id = c.owner_id
LEFT JOIN auth.users claimer ON claimer.id = c.claimed_by

UNION ALL

SELECT
  c.id,
  'leads_captain' as conversation_type,
  c.owner_id,
  owner.raw_user_meta_data->>'full_name' as owner_name,
  c.claimed_by,
  claimer.raw_user_meta_data->>'full_name' as claimed_by_name,
  c.claimed_at,
  c.last_activity_at,
  CASE
    WHEN c.claimed_at > now() - interval '30 minutes' THEN true
    ELSE false
  END as is_claimed
FROM leads_captain_conversations_v2 c
LEFT JOIN auth.users owner ON owner.id = c.owner_id
LEFT JOIN auth.users claimer ON claimer.id = c.claimed_by;

-- Comment for documentation
COMMENT ON TABLE message_drafts IS 'Stores message drafts for collision prevention per Section 5.2';
COMMENT ON COLUMN outreach_conversations.owner_id IS 'User who last sent a message in this conversation (Section 5.1)';
COMMENT ON COLUMN outreach_conversations.claimed_by IS 'User who claimed this conversation (expires after 30min)';
