-- =====================================================
-- Migration: Business Accent Colors
-- Adds secondary_color for business branding customization
-- =====================================================

-- Add secondary_color column with cyan default (matches existing design system)
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#0EA5E9';

-- Add comment for documentation
COMMENT ON COLUMN businesses.secondary_color IS 'Secondary accent color for business branding (hex format). Used alongside primary_color for gradients and UI accents.';
