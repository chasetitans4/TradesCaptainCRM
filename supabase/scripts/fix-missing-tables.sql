
-- ==============================================================================
-- FIX MISSING TABLES SCRIPT
-- This script ensures sms_conversations and sms_messages exist and have proper RLS
-- ==============================================================================

-- 1. Create sms_conversations if not exists
CREATE TABLE IF NOT EXISTS sms_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  lead_id UUID REFERENCES leads(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed', 'opted_out')),
  
  last_customer_message_at TIMESTAMPTZ,
  is_customer_initiated BOOLEAN DEFAULT FALSE,

  -- New columns for AI/Human handoff
  ai_response_count INTEGER DEFAULT 0,
  needs_human_attention BOOLEAN DEFAULT false,
  human_attention_reason TEXT,
  human_attention_at TIMESTAMPTZ
);

-- 2. Create sms_messages if not exists
CREATE TABLE IF NOT EXISTS sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES sms_conversations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender TEXT NOT NULL, -- 'customer', 'ai', 'staff'
  sender_user_id UUID REFERENCES users(id), -- If sent by staff
  body TEXT NOT NULL,
  
  status TEXT DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
  
  -- Twilio specific
  twilio_sid TEXT,
  is_ai_response BOOLEAN DEFAULT false,
  error_message TEXT
);

-- 3. Enable RLS
ALTER TABLE sms_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Drop first to avoid conflicts)

-- sms_conversations policies
DROP POLICY IF EXISTS "Owner/Admin can view conversations" ON sms_conversations;
CREATE POLICY "Owner/Admin can view conversations" ON sms_conversations
  FOR SELECT USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
    -- AND role check handled by application logic or separate function if needed
  );

DROP POLICY IF EXISTS "Users can view conversations" ON sms_conversations;
CREATE POLICY "Users can view conversations" ON sms_conversations
  FOR SELECT USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert conversations" ON sms_conversations;
CREATE POLICY "Users can insert conversations" ON sms_conversations
  FOR INSERT WITH CHECK (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can update conversations" ON sms_conversations;
CREATE POLICY "Users can update conversations" ON sms_conversations
  FOR UPDATE USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

-- sms_messages policies
DROP POLICY IF EXISTS "Users can view messages" ON sms_messages;
CREATE POLICY "Users can view messages" ON sms_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM sms_conversations 
      WHERE sms_conversations.id = sms_messages.conversation_id 
      AND sms_conversations.business_id = (SELECT business_id FROM users WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert messages" ON sms_messages;
CREATE POLICY "Users can insert messages" ON sms_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM sms_conversations 
      WHERE sms_conversations.id = sms_messages.conversation_id 
      AND sms_conversations.business_id = (SELECT business_id FROM users WHERE id = auth.uid())
    )
  );

-- 5. Fix Jobs Table Columns (Ensure scheduled_time_start exists)
-- This block checks if scheduled_time exists and scheduled_time_start does NOT, then renames it.
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'scheduled_time') 
     AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'scheduled_time_start') THEN
    ALTER TABLE jobs RENAME COLUMN scheduled_time TO scheduled_time_start;
  END IF;
END $$;

-- 6. Add scheduled_time_end if missing
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS scheduled_time_end TIME;

-- 7. Grant permissions
GRANT ALL ON sms_conversations TO authenticated;
GRANT ALL ON sms_conversations TO service_role;
GRANT ALL ON sms_messages TO authenticated;
GRANT ALL ON sms_messages TO service_role;
