-- =====================================================
-- MEDIA RETENTION POLICY
-- Auto-delete customer media 21 days after invoice sent
-- Unless archived by the business
-- =====================================================

-- Add retention tracking columns to customer_images
ALTER TABLE customer_images
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add index for cleanup job
CREATE INDEX IF NOT EXISTS idx_customer_images_retention
ON customer_images(retention_expires_at)
WHERE deleted_at IS NULL AND archived = FALSE;

-- Add archived column to issue media in customer_issue_reports
-- (media_urls is JSONB, so we track archival at issue level)
ALTER TABLE customer_issue_reports
ADD COLUMN IF NOT EXISTS media_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS media_retention_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS media_deleted_at TIMESTAMPTZ;

-- Index for issue media cleanup
CREATE INDEX IF NOT EXISTS idx_issue_reports_media_retention
ON customer_issue_reports(media_retention_expires_at)
WHERE media_deleted_at IS NULL AND media_archived = FALSE;

-- =====================================================
-- MEDIA RETENTION LOG
-- Track what was deleted for auditing
-- =====================================================

CREATE TABLE IF NOT EXISTS media_deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  media_type TEXT NOT NULL, -- 'image', 'video', 'issue_media'
  media_id UUID,
  entity_type TEXT, -- 'issue', 'job', etc.
  entity_id UUID,
  original_size_bytes BIGINT,
  reason TEXT NOT NULL, -- 'retention_expired', 'manual', 'customer_deleted'
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_by UUID -- NULL for automated cleanup
);

CREATE INDEX IF NOT EXISTS idx_media_deletion_log_business
ON media_deletion_log(business_id, deleted_at DESC);

-- =====================================================
-- FUNCTION: Set retention expiry when invoice is sent
-- Called by trigger on invoices table
-- =====================================================

CREATE OR REPLACE FUNCTION set_customer_media_retention()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_retention_date TIMESTAMPTZ;
BEGIN
  -- Only process when invoice is sent (status changed to 'sent')
  IF NEW.status = 'sent' AND (OLD.status IS NULL OR OLD.status != 'sent') THEN
    v_customer_id := NEW.customer_id;
    v_retention_date := NOW() + INTERVAL '21 days';

    -- Update customer_images retention for this customer
    UPDATE customer_images
    SET retention_expires_at = v_retention_date
    WHERE customer_id = v_customer_id
      AND business_id = NEW.business_id
      AND archived = FALSE
      AND retention_expires_at IS NULL;

    -- Update issue reports media retention
    UPDATE customer_issue_reports
    SET media_retention_expires_at = v_retention_date
    WHERE customer_id = v_customer_id
      AND business_id = NEW.business_id
      AND media_archived = FALSE
      AND media_retention_expires_at IS NULL;

    -- Log the retention schedule
    INSERT INTO business_audit_log (business_id, user_id, action, entity_type, entity_id, details)
    VALUES (
      NEW.business_id,
      NEW.created_by,
      'media_retention_scheduled',
      'invoice',
      NEW.id,
      jsonb_build_object(
        'customer_id', v_customer_id,
        'expires_at', v_retention_date,
        'invoice_number', NEW.invoice_number
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on invoices
DROP TRIGGER IF EXISTS trigger_set_media_retention ON invoices;
CREATE TRIGGER trigger_set_media_retention
  AFTER INSERT OR UPDATE OF status ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_customer_media_retention();

-- =====================================================
-- FUNCTION: Archive customer media (prevent deletion)
-- =====================================================

CREATE OR REPLACE FUNCTION archive_customer_media(
  p_customer_id UUID,
  p_business_id UUID,
  p_archived_by UUID
)
RETURNS jsonb AS $$
DECLARE
  v_images_archived INT;
  v_issues_archived INT;
BEGIN
  -- Archive images
  UPDATE customer_images
  SET archived = TRUE,
      retention_expires_at = NULL
  WHERE customer_id = p_customer_id
    AND business_id = p_business_id
    AND archived = FALSE;
  GET DIAGNOSTICS v_images_archived = ROW_COUNT;

  -- Archive issue media
  UPDATE customer_issue_reports
  SET media_archived = TRUE,
      media_retention_expires_at = NULL
  WHERE customer_id = p_customer_id
    AND business_id = p_business_id
    AND media_archived = FALSE;
  GET DIAGNOSTICS v_issues_archived = ROW_COUNT;

  -- Log the action
  INSERT INTO business_audit_log (business_id, user_id, action, entity_type, entity_id, details)
  VALUES (
    p_business_id,
    p_archived_by,
    'customer_media_archived',
    'customer',
    p_customer_id,
    jsonb_build_object(
      'images_archived', v_images_archived,
      'issues_archived', v_issues_archived
    )
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'images_archived', v_images_archived,
    'issues_archived', v_issues_archived
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Get expired media for cleanup
-- Returns media that should be deleted
-- =====================================================

CREATE OR REPLACE FUNCTION get_expired_media(p_limit INT DEFAULT 100)
RETURNS TABLE (
  media_type TEXT,
  media_id UUID,
  business_id UUID,
  customer_id UUID,
  entity_type TEXT,
  entity_id UUID,
  storage_paths JSONB,
  size_bytes BIGINT
) AS $$
BEGIN
  -- Get expired customer_images
  RETURN QUERY
  SELECT
    'image'::TEXT as media_type,
    ci.id as media_id,
    ci.business_id,
    ci.customer_id,
    ci.category as entity_type,
    ci.entity_id,
    jsonb_build_object(
      'original', ci.original_path,
      'compressed', ci.compressed_path,
      'thumbnail', ci.thumbnail_path,
      'preview', ci.preview_path
    ) as storage_paths,
    (ci.original_size + ci.compressed_size)::BIGINT as size_bytes
  FROM customer_images ci
  WHERE ci.retention_expires_at < NOW()
    AND ci.archived = FALSE
    AND ci.deleted_at IS NULL
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Mark media as deleted (soft delete)
-- Actual storage deletion happens via API
-- =====================================================

CREATE OR REPLACE FUNCTION mark_media_deleted(
  p_media_ids UUID[],
  p_reason TEXT DEFAULT 'retention_expired'
)
RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  v_media RECORD;
BEGIN
  FOR v_media IN
    SELECT id, business_id, customer_id, category, entity_id, original_size
    FROM customer_images
    WHERE id = ANY(p_media_ids)
      AND deleted_at IS NULL
  LOOP
    -- Soft delete
    UPDATE customer_images
    SET deleted_at = NOW()
    WHERE id = v_media.id;

    -- Log deletion
    INSERT INTO media_deletion_log (
      business_id, customer_id, media_type, media_id,
      entity_type, entity_id, original_size_bytes, reason
    ) VALUES (
      v_media.business_id, v_media.customer_id, 'image', v_media.id,
      v_media.category, v_media.entity_id, v_media.original_size, p_reason
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEW: Media retention status
-- For business dashboard
-- =====================================================

CREATE OR REPLACE VIEW customer_media_retention_status AS
SELECT
  c.id as customer_id,
  c.name as customer_name,
  c.business_id,
  COUNT(DISTINCT ci.id) as total_images,
  COUNT(DISTINCT CASE WHEN ci.archived THEN ci.id END) as archived_images,
  COUNT(DISTINCT CASE WHEN ci.retention_expires_at IS NOT NULL AND ci.retention_expires_at > NOW() THEN ci.id END) as expiring_images,
  MIN(ci.retention_expires_at) FILTER (WHERE ci.retention_expires_at > NOW()) as earliest_expiry,
  SUM(ci.original_size + ci.compressed_size) as total_storage_bytes
FROM customers c
LEFT JOIN customer_images ci ON ci.customer_id = c.id AND ci.deleted_at IS NULL
GROUP BY c.id, c.name, c.business_id;

GRANT SELECT ON customer_media_retention_status TO authenticated;
GRANT SELECT ON customer_media_retention_status TO service_role;

-- =====================================================
-- RLS for media_deletion_log
-- =====================================================

ALTER TABLE media_deletion_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_users_can_view_deletion_log"
ON media_deletion_log FOR SELECT
TO authenticated
USING (
  business_id IN (SELECT business_id FROM users WHERE id = auth.uid())
);

CREATE POLICY "service_role_full_access_deletion_log"
ON media_deletion_log FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
