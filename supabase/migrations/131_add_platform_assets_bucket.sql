-- Create storage bucket for platform assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-assets', 'platform-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policies

-- Public read access
CREATE POLICY "Public read platform-assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'platform-assets');

-- Service role full access (for admin API)
CREATE POLICY "Service role full access platform-assets"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'platform-assets')
WITH CHECK (bucket_id = 'platform-assets');
