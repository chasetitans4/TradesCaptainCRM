-- =====================================================
-- 137: STORAGE SECURITY HARDENING
-- Tighten storage bucket policies:
-- 1. Make sensitive buckets private (voice-notes, receipts, signatures)
-- 2. Scope authenticated-user policies to business tenant paths
-- 3. Convert public-read buckets to signed-URL access where appropriate
-- =====================================================

-- =====================================================
-- 1. Tighten voice-notes, receipts, signatures buckets
--    Replace blanket "authenticated can read/write" with
--    path-scoped policies so users can only access their
--    own business's files. Path convention: {business_id}/...
-- =====================================================

-- voice-notes: drop overly-broad policies
DROP POLICY IF EXISTS "Authenticated users can upload voice-notes" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view voice-notes" ON storage.objects;

-- voice-notes: INSERT scoped to user's business path
CREATE POLICY "voice-notes tenant insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'voice-notes'
    AND (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- voice-notes: SELECT scoped to user's business path
CREATE POLICY "voice-notes tenant select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'voice-notes'
    AND (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- receipts: drop overly-broad policies
DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view receipts" ON storage.objects;

-- receipts: INSERT scoped to user's business path
CREATE POLICY "receipts tenant insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- receipts: SELECT scoped to user's business path
CREATE POLICY "receipts tenant select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- signatures: drop overly-broad policies
DROP POLICY IF EXISTS "Authenticated users can upload signatures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view signatures" ON storage.objects;

-- signatures: INSERT scoped to user's business path
CREATE POLICY "signatures tenant insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'signatures'
    AND (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- signatures: SELECT scoped to user's business path
CREATE POLICY "signatures tenant select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'signatures'
    AND (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 2. Convert documents bucket from public to private
--    Documents should not be publicly readable.
--    Access via signed URLs generated server-side.
-- =====================================================

-- Make the documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'documents';

-- Drop public-read policy
DROP POLICY IF EXISTS "Documents Public Access" ON storage.objects;

-- Add tenant-scoped read policy
CREATE POLICY "documents tenant select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 3. Convert issue-media bucket from public to private
--    Issue photos/videos should not be publicly readable.
-- =====================================================

UPDATE storage.buckets SET public = false WHERE id = 'issue-media';

-- Drop public-read policy
DROP POLICY IF EXISTS "Public Access issue-media" ON storage.objects;
DROP POLICY IF EXISTS "issue-media public select" ON storage.objects;

-- Add tenant-scoped read policy
CREATE POLICY "issue-media tenant select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'issue-media'
    AND (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 4. portal-uploads: keep public for portal access
--    but scope uploads to business path
-- =====================================================

-- Drop broad insert policy (if exists)
DROP POLICY IF EXISTS "Authenticated Upload portal-uploads" ON storage.objects;

-- Scoped insert (authenticated users only to their business path)
CREATE POLICY "portal-uploads tenant insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'portal-uploads'
    AND (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 5. platform-assets: keep public (logos, branding)
--    These are intentionally public-facing assets.
--    No changes needed — already restricted to service_role writes.
-- =====================================================
-- (No changes)
