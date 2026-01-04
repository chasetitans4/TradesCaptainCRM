-- =====================================================
-- Migration 019: Audit Fields for Compliance
-- Implements Section 6.1 of Product Identity spec
-- Every message must answer: Who triggered? Why sent? What rule? What consent?
-- =====================================================

-- Add audit fields to outreach_messages table
ALTER TABLE outreach_messages
ADD COLUMN IF NOT EXISTS trigger_event VARCHAR(100),
ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES admin_users(id),
ADD COLUMN IF NOT EXISTS rule_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS consent_state_at_send VARCHAR(30) DEFAULT 'unknown';

-- Add comment documentation
COMMENT ON COLUMN outreach_messages.trigger_event IS 'What triggered this message: missed_call, user_manual, automation_invoice_overdue, etc.';
COMMENT ON COLUMN outreach_messages.actor_id IS 'User ID who triggered/approved the message, NULL for fully automated';
COMMENT ON COLUMN outreach_messages.rule_id IS 'Automation rule ID that sent this, or manual for user-initiated';
COMMENT ON COLUMN outreach_messages.consent_state_at_send IS 'Consent state at time of send: unknown, inbound, established, explicit, opted_out';

-- Add relationship_state to outreach_contacts for consent tracking
ALTER TABLE outreach_contacts
ADD COLUMN IF NOT EXISTS relationship_state VARCHAR(30) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS relationship_state_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ;

COMMENT ON COLUMN outreach_contacts.relationship_state IS 'Consent state machine: unknown -> inbound -> established -> explicit -> opted_out';
COMMENT ON COLUMN outreach_contacts.relationship_state_updated_at IS 'When the relationship state last changed';
COMMENT ON COLUMN outreach_contacts.muted_until IS 'Per-conversation mute - no automations sent until this time';

-- Add relationship_state to leads table for consistency
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS relationship_state VARCHAR(30) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS relationship_state_updated_at TIMESTAMPTZ;

-- Add relationship_state to customers table
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS relationship_state VARCHAR(30) DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS relationship_state_updated_at TIMESTAMPTZ;

-- Create indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_outreach_messages_trigger_event
ON outreach_messages(trigger_event) WHERE trigger_event IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outreach_messages_actor_id
ON outreach_messages(actor_id) WHERE actor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outreach_messages_rule_id
ON outreach_messages(rule_id) WHERE rule_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_outreach_messages_consent_state
ON outreach_messages(consent_state_at_send);

CREATE INDEX IF NOT EXISTS idx_outreach_contacts_relationship_state
ON outreach_contacts(relationship_state);

CREATE INDEX IF NOT EXISTS idx_outreach_contacts_muted
ON outreach_contacts(muted_until) WHERE muted_until IS NOT NULL;

-- Create audit log export view for easier querying
CREATE OR REPLACE VIEW outreach_audit_log AS
SELECT
    om.id,
    om.created_at,
    om.conversation_id,
    om.contact_id,
    oc.phone_number AS contact_phone,
    oc.first_name || ' ' || COALESCE(oc.last_name, '') AS contact_name,
    om.direction,
    om.message_text,
    om.trigger_event,
    om.actor_id,
    au.name AS actor_name,
    om.rule_id,
    om.consent_state_at_send,
    om.sender_type,
    om.delivery_status
FROM outreach_messages om
LEFT JOIN outreach_contacts oc ON om.contact_id = oc.id
LEFT JOIN admin_users au ON om.actor_id = au.id
ORDER BY om.created_at DESC;

COMMENT ON VIEW outreach_audit_log IS 'Audit log view answering: Who triggered? Why sent? What rule? What consent?';

-- Create function to update relationship state
CREATE OR REPLACE FUNCTION update_relationship_state(
    p_contact_id UUID,
    p_new_state VARCHAR(30),
    p_table_name VARCHAR(50) DEFAULT 'outreach_contacts'
)
RETURNS VOID AS $$
BEGIN
    IF p_table_name = 'outreach_contacts' THEN
        UPDATE outreach_contacts
        SET relationship_state = p_new_state,
            relationship_state_updated_at = NOW()
        WHERE id = p_contact_id;
    ELSIF p_table_name = 'leads' THEN
        UPDATE leads
        SET relationship_state = p_new_state,
            relationship_state_updated_at = NOW()
        WHERE id = p_contact_id;
    ELSIF p_table_name = 'customers' THEN
        UPDATE customers
        SET relationship_state = p_new_state,
            relationship_state_updated_at = NOW()
        WHERE id = p_contact_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update relationship state on inbound message
CREATE OR REPLACE FUNCTION auto_update_relationship_on_inbound()
RETURNS TRIGGER AS $$
BEGIN
    -- If inbound message and contact is in 'unknown' state, upgrade to 'inbound'
    IF NEW.direction = 'inbound' THEN
        UPDATE outreach_contacts
        SET relationship_state = CASE
            WHEN relationship_state = 'unknown' THEN 'inbound'
            ELSE relationship_state
        END,
        relationship_state_updated_at = CASE
            WHEN relationship_state = 'unknown' THEN NOW()
            ELSE relationship_state_updated_at
        END
        WHERE id = NEW.contact_id;
    -- If outbound message and contact is in 'inbound' state, upgrade to 'established'
    ELSIF NEW.direction = 'outbound' THEN
        UPDATE outreach_contacts
        SET relationship_state = CASE
            WHEN relationship_state = 'inbound' THEN 'established'
            ELSE relationship_state
        END,
        relationship_state_updated_at = CASE
            WHEN relationship_state = 'inbound' THEN NOW()
            ELSE relationship_state_updated_at
        END
        WHERE id = NEW.contact_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to outreach_messages
DROP TRIGGER IF EXISTS trg_auto_update_relationship ON outreach_messages;
CREATE TRIGGER trg_auto_update_relationship
    AFTER INSERT ON outreach_messages
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_relationship_on_inbound();

-- Add chain_depth to automation rules for limiting automation chains
ALTER TABLE leads_captain_config
ADD COLUMN IF NOT EXISTS max_chain_depth INTEGER DEFAULT 2;

COMMENT ON COLUMN leads_captain_config.max_chain_depth IS 'Maximum depth of automation chains (Section 3.3 - default 2)';

-- Add muted_until to leads_captain_conversations_v2 for per-conversation mute (Section 7.3)
ALTER TABLE leads_captain_conversations_v2
ADD COLUMN IF NOT EXISTS muted_until TIMESTAMPTZ;

COMMENT ON COLUMN leads_captain_conversations_v2.muted_until IS 'Per-conversation mute - no automations sent until this time';

-- Create index for efficient mute checking
CREATE INDEX IF NOT EXISTS idx_leads_captain_conversations_muted
ON leads_captain_conversations_v2(muted_until) WHERE muted_until IS NOT NULL;
