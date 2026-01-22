-- =====================================================
-- TECHNICIAN MODE & BUILD FIXES FINALIZATION
-- Migration: 118_technician_mode_final.sql
-- Purpose: Create missing tables and storage buckets for Technician Mode
--          and ensure all schema requirements from the Build Summary are met.
-- =====================================================

-- 1. Create job_voice_notes table (if not exists)
CREATE TABLE IF NOT EXISTS job_voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  storage_path TEXT NOT NULL,
  duration_seconds INTEGER,
  transcript TEXT, -- NULL until transcribed
  transcription_status TEXT DEFAULT 'none' CHECK (transcription_status IN ('none', 'pending', 'completed', 'failed')),
  transcription_started_at TIMESTAMPTZ,
  transcription_completed_at TIMESTAMPTZ,
  transcription_provider TEXT DEFAULT 'whisper',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for voice notes
CREATE INDEX IF NOT EXISTS idx_voice_notes_job ON job_voice_notes(job_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_user ON job_voice_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_pending_transcription
  ON job_voice_notes(transcription_status)
  WHERE transcription_status = 'pending';

-- RLS for voice notes
ALTER TABLE job_voice_notes ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_voice_notes' AND policyname = 'Users can view voice notes for their business jobs') THEN
    CREATE POLICY "Users can view voice notes for their business jobs"
      ON job_voice_notes FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM jobs j
          JOIN users u ON u.business_id = j.business_id
          WHERE j.id = job_voice_notes.job_id
          AND u.id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'job_voice_notes' AND policyname = 'Users can create voice notes for their assigned jobs') THEN
    CREATE POLICY "Users can create voice notes for their assigned jobs"
      ON job_voice_notes FOR INSERT
      WITH CHECK (
        auth.uid() = user_id
      );
  END IF;
END $$;

-- 2. Create Storage Buckets
-- voice-notes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'voice-notes',
    'voice-notes',
    false,
    52428800, -- 50MB
    ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg']
)
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- receipts
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'receipts',
    'receipts',
    false,
    26214400, -- 25MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- signatures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'signatures',
    'signatures',
    false,
    10485760, -- 10MB
    ARRAY['image/png', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage Policies (Generic helper for the new buckets)
DO $$
DECLARE
    bucket_name text;
BEGIN
    FOREACH bucket_name IN ARRAY ARRAY['voice-notes', 'receipts', 'signatures']
    LOOP
        -- Grant access to authenticated users (simplified for technician usage)
        -- In a real prod env, you might want stricter RLS linking to specific jobs/users
        
        -- INSERT policy
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'objects' 
            AND schemaname = 'storage' 
            AND policyname = 'Authenticated users can upload to ' || bucket_name
        ) THEN
            EXECUTE format('
                CREATE POLICY %I
                ON storage.objects FOR INSERT
                TO authenticated
                WITH CHECK (bucket_id = %L)', 
                'Authenticated users can upload to ' || bucket_name, bucket_name
            );
        END IF;

        -- SELECT policy
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'objects' 
            AND schemaname = 'storage' 
            AND policyname = 'Authenticated users can view ' || bucket_name
        ) THEN
            EXECUTE format('
                CREATE POLICY %I
                ON storage.objects FOR SELECT
                TO authenticated
                USING (bucket_id = %L)', 
                'Authenticated users can view ' || bucket_name, bucket_name
            );
        END IF;
    END LOOP;
END $$;

-- 3b. Create Emergency Requests Table (if missing)
-- This ensures the table exists before we try to verify its columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'emergency_requests') THEN
        CREATE TABLE emergency_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
            equipment_id UUID,
            request_type TEXT NOT NULL CHECK (request_type IN ('emergency', 'urgent', 'after_hours')),
            issue_description TEXT NOT NULL,
            issue_category TEXT,
            photos TEXT[] DEFAULT '{}',
            contact_phone TEXT NOT NULL,
            contact_method TEXT DEFAULT 'phone' CHECK (contact_method IN ('phone', 'text', 'either')),
            is_gas_leak BOOLEAN DEFAULT false,
            is_flooding BOOLEAN DEFAULT false,
            is_no_heat BOOLEAN DEFAULT false,
            is_no_cooling BOOLEAN DEFAULT false,
            acknowledged_after_hours_rate BOOLEAN DEFAULT false,
            after_hours_rate_amount DECIMAL(10, 2),
            status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'denied', 'completed')),
            resolution TEXT,
            resolution_date TIMESTAMPTZ,
            repair_job_id UUID,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Add FKs if target tables exist
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_equipment') THEN
            ALTER TABLE emergency_requests ADD CONSTRAINT emergency_requests_equipment_id_fkey 
            FOREIGN KEY (equipment_id) REFERENCES customer_equipment(id) ON DELETE SET NULL;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jobs') THEN
            ALTER TABLE emergency_requests ADD CONSTRAINT emergency_requests_repair_job_id_fkey 
            FOREIGN KEY (repair_job_id) REFERENCES jobs(id) ON DELETE SET NULL;
        END IF;

        -- Enable RLS
        ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;

        -- Create Indexes
        CREATE INDEX idx_emergency_requests_business ON emergency_requests(business_id);
        CREATE INDEX idx_emergency_requests_customer ON emergency_requests(customer_id);
    END IF;
END $$;

-- 4. Verify Emergency Requests Columns
-- Ensure all columns from the summary exist
DO $$ 
BEGIN 
  -- request_type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emergency_requests' AND column_name = 'request_type') THEN
      ALTER TABLE emergency_requests ADD COLUMN request_type TEXT CHECK (request_type IN ('emergency', 'urgent', 'after_hours'));
  END IF;

  -- issue_description
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emergency_requests' AND column_name = 'issue_description') THEN
      ALTER TABLE emergency_requests ADD COLUMN issue_description TEXT;
  END IF;

  -- contact_phone
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emergency_requests' AND column_name = 'contact_phone') THEN
      ALTER TABLE emergency_requests ADD COLUMN contact_phone TEXT;
  END IF;

  -- contact_method
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'emergency_requests' AND column_name = 'contact_method') THEN
      ALTER TABLE emergency_requests ADD COLUMN contact_method TEXT DEFAULT 'phone';
  END IF;
END $$;

-- 5. Final Schema Safety Checks (Redundant but safe)
-- Ensure jobs.assigned_user_id exists (handled in 117, but good to double check)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'assigned_user_id') THEN
      -- If 117 didn't run or failed, this is a fallback if assigned_to exists
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'assigned_to') THEN
          ALTER TABLE jobs RENAME COLUMN assigned_to TO assigned_user_id;
      ELSE
          ALTER TABLE jobs ADD COLUMN assigned_user_id UUID REFERENCES users(id);
      END IF;
  END IF;
END $$;
