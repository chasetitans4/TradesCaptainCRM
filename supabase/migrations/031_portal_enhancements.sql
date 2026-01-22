-- =====================================================
-- PORTAL ENHANCEMENTS MIGRATION
-- Migration: 031_portal_enhancements.sql
-- Features: Escalation helper, Service Request Photos, SMS Conversation fields
-- =====================================================

-- 1. Helper function for JSONB updates (used by escalation API)
-- Allows updating a specific key in a JSONB column via RPC
CREATE OR REPLACE FUNCTION jsonb_set_key(target jsonb, key text, value jsonb)
RETURNS jsonb AS $$
BEGIN
    -- jsonb_set(target, path, new_value, create_missing)
    RETURN jsonb_set(target, ARRAY[key], value, true);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Add photos column to service_requests
ALTER TABLE service_requests 
ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- 3. Add missing columns to sms_conversations for escalation logic
-- The code uses these specific column names which might differ from original schema
ALTER TABLE sms_conversations
ADD COLUMN IF NOT EXISTS requires_human_attention BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS human_requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Sync existing 'needs_human_attention' to 'requires_human_attention' if it exists and is true
-- (This ensures legacy data is respected if using the new column)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sms_conversations' AND column_name = 'needs_human_attention') THEN
        UPDATE sms_conversations 
        SET requires_human_attention = true 
        WHERE needs_human_attention = true AND requires_human_attention = false;
    END IF;
END $$;

-- 4. Create storage bucket for portal uploads if it doesn't exist
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

    -- Public read policy (for displaying photos)
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
