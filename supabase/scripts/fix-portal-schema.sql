-- =====================================================
-- FIX PORTAL SCHEMA
-- Ensures all tables and columns required for the customer portal exist
-- =====================================================

-- 1. Ensure customer_feedback table exists
CREATE TABLE IF NOT EXISTS customer_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  would_recommend BOOLEAN,
  
  source TEXT DEFAULT 'portal',
  status TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'published'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for customer_feedback
CREATE INDEX IF NOT EXISTS idx_customer_feedback_job ON customer_feedback(job_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_customer ON customer_feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_feedback_business ON customer_feedback(business_id);

-- RLS for customer_feedback
ALTER TABLE customer_feedback ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customer_feedback' 
        AND policyname = 'Business users manage feedback'
    ) THEN
        CREATE POLICY "Business users manage feedback" ON customer_feedback
          FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'customer_feedback' 
        AND policyname = 'Service role full access feedback'
    ) THEN
        CREATE POLICY "Service role full access feedback" ON customer_feedback
          FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- 2. Ensure portal_notifications table exists
CREATE TABLE IF NOT EXISTS portal_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  type TEXT NOT NULL, -- 'appointment', 'invoice', 'quote', 'message', 'system'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  data JSONB DEFAULT '{}'::jsonb, -- Store link, entity_id, etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for portal_notifications
CREATE INDEX IF NOT EXISTS idx_portal_notifications_customer ON portal_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_portal_notifications_business ON portal_notifications(business_id);
CREATE INDEX IF NOT EXISTS idx_portal_notifications_unread ON portal_notifications(customer_id, read) WHERE read = false;

-- RLS for portal_notifications
ALTER TABLE portal_notifications ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'portal_notifications' 
        AND policyname = 'Business users manage notifications'
    ) THEN
        CREATE POLICY "Business users manage notifications" ON portal_notifications
          FOR ALL USING (business_id IN (SELECT business_id FROM users WHERE id = auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'portal_notifications' 
        AND policyname = 'Service role full access notifications'
    ) THEN
        CREATE POLICY "Service role full access notifications" ON portal_notifications
          FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- 3. Update customer_portal_access table
DO $$ 
BEGIN 
  -- Add ai_paused columns if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_portal_access' AND column_name = 'ai_paused') THEN
    ALTER TABLE customer_portal_access ADD COLUMN ai_paused BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_portal_access' AND column_name = 'ai_paused_at') THEN
    ALTER TABLE customer_portal_access ADD COLUMN ai_paused_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_portal_access' AND column_name = 'ai_paused_reason') THEN
    ALTER TABLE customer_portal_access ADD COLUMN ai_paused_reason TEXT;
  END IF;

  -- Add last_login_at if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_portal_access' AND column_name = 'last_login_at') THEN
    ALTER TABLE customer_portal_access ADD COLUMN last_login_at TIMESTAMPTZ;
  END IF;

  -- Add password_hash if missing (for non-magic link auth)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_portal_access' AND column_name = 'password_hash') THEN
    ALTER TABLE customer_portal_access ADD COLUMN password_hash TEXT;
  END IF;
END $$;

-- 4. Ensure storage bucket for portal uploads
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('portal-uploads', 'portal-uploads', true)
    ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if storage schema is not accessible
    NULL;
END $$;

-- 5. Storage Policies for portal-uploads
DO $$
BEGIN
    -- Service role policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Service role full access portal-uploads'
    ) THEN
        CREATE POLICY "Service role full access portal-uploads" 
        ON storage.objects 
        FOR ALL 
        TO service_role 
        USING (bucket_id = 'portal-uploads')
        WITH CHECK (bucket_id = 'portal-uploads');
    END IF;

    -- Public read policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND schemaname = 'storage' 
        AND policyname = 'Public read portal-uploads'
    ) THEN
        CREATE POLICY "Public read portal-uploads" 
        ON storage.objects 
        FOR SELECT 
        TO public 
        USING (bucket_id = 'portal-uploads');
    END IF;
END $$;
