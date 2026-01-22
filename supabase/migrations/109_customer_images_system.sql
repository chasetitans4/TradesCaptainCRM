-- =====================================================
-- CUSTOMER IMAGES SYSTEM
-- Storage buckets, metadata table, and RLS policies
-- For image compression and thumbnail management
-- =====================================================

-- Customer images metadata table
CREATE TABLE IF NOT EXISTS customer_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('issue', 'job', 'profile', 'document')),
  entity_id UUID, -- Optional: links to specific job, issue report, etc.

  -- File paths in storage
  original_filename TEXT NOT NULL,
  original_path TEXT NOT NULL,
  compressed_path TEXT NOT NULL,
  thumbnail_path TEXT NOT NULL,
  preview_path TEXT NOT NULL,

  -- Public URLs (for quick access)
  original_url TEXT NOT NULL,
  compressed_url TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  preview_url TEXT NOT NULL,

  -- Image metadata
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  original_size INTEGER NOT NULL, -- bytes
  compressed_size INTEGER NOT NULL, -- bytes
  compression_ratio DECIMAL(5,2), -- e.g., 2.5 = 2.5x compression
  format TEXT NOT NULL DEFAULT 'webp',
  processing_time_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_customer_images_business ON customer_images(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_images_customer ON customer_images(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_images_category ON customer_images(category);
CREATE INDEX IF NOT EXISTS idx_customer_images_entity ON customer_images(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_images_created ON customer_images(created_at DESC);

-- RLS policies
ALTER TABLE customer_images ENABLE ROW LEVEL SECURITY;

-- Business users can read their business's images
CREATE POLICY "business_users_can_read_images"
  ON customer_images FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- Business users can insert images for their business
CREATE POLICY "business_users_can_insert_images"
  ON customer_images FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- Business users can delete images for their business
CREATE POLICY "business_users_can_delete_images"
  ON customer_images FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- Service role can do everything (for API routes)
CREATE POLICY "service_role_full_access_images"
  ON customer_images FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_customer_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_images_updated_at
  BEFORE UPDATE ON customer_images
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_images_updated_at();

-- =====================================================
-- STORAGE BUCKETS
-- Note: Run these via Supabase Dashboard or supabase CLI
-- as SQL migrations can't create storage buckets directly
-- =====================================================

-- The following buckets need to be created:
-- 1. customer-images-original (private - original high-res files)
-- 2. customer-images (public - compressed web-optimized)
-- 3. customer-thumbnails (public - 150x150 thumbnails)
-- 4. customer-previews (public - 800x800 previews)

-- Storage policies will be set via Supabase Dashboard:
-- - customer-images-original: private, signed URLs only
-- - customer-images: public read, authenticated write
-- - customer-thumbnails: public read, authenticated write
-- - customer-previews: public read, authenticated write

-- =====================================================
-- IMAGE PROCESSING STATS VIEW
-- For monitoring compression effectiveness
-- =====================================================

CREATE OR REPLACE VIEW image_processing_stats AS
SELECT
  business_id,
  category,
  COUNT(*) as image_count,
  SUM(original_size) as total_original_bytes,
  SUM(compressed_size) as total_compressed_bytes,
  ROUND(AVG(compression_ratio), 2) as avg_compression_ratio,
  ROUND(AVG(processing_time_ms), 0) as avg_processing_ms,
  ROUND((1 - (SUM(compressed_size)::decimal / NULLIF(SUM(original_size), 0))) * 100, 1) as storage_savings_pct
FROM customer_images
GROUP BY business_id, category;

-- Grant access to the view
GRANT SELECT ON image_processing_stats TO authenticated;
GRANT SELECT ON image_processing_stats TO service_role;

-- =====================================================
-- HELPER FUNCTION: Get customer image gallery
-- =====================================================

CREATE OR REPLACE FUNCTION get_customer_gallery(
  p_customer_id UUID,
  p_business_id UUID,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  thumbnail_url TEXT,
  preview_url TEXT,
  compressed_url TEXT,
  width INTEGER,
  height INTEGER,
  category TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ci.id,
    ci.thumbnail_url,
    ci.preview_url,
    ci.compressed_url,
    ci.width,
    ci.height,
    ci.category,
    ci.created_at
  FROM customer_images ci
  WHERE ci.customer_id = p_customer_id
    AND ci.business_id = p_business_id
    AND (p_category IS NULL OR ci.category = p_category)
  ORDER BY ci.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
