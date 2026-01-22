-- =====================================================
-- 101_service_checklists.sql
-- Persistence for Service Onboarding Checklists (removing in-memory debt)
-- =====================================================

-- Table to store progress for client onboarding checklists
-- Corresponds to ClientChecklistStatus interface in lib/onboarding/service-checklists.ts
CREATE TABLE IF NOT EXISTS service_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- The client identifier (can reference businesses.id or web_customers.id depending on context)
  -- We don't enforce FK here to allow flexibility across different client types
  client_id UUID NOT NULL,
  
  -- The type of checklist (e.g., 'seo', 'gold', 'web', 'blue')
  checklist_type TEXT NOT NULL,
  
  -- JSONB storage for the checklist items and their status
  -- Structure: Array of { item_id, completed, completed_at, notes, sub_items: [...] }
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  overall_progress INTEGER DEFAULT 0, -- 0-100 percentage
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one active checklist per client per type
  UNIQUE(client_id, checklist_type)
);

-- Enable RLS
ALTER TABLE service_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Policies
-- Admins have full access
DROP POLICY IF EXISTS "Admins can manage all onboarding progress" ON service_onboarding_progress;
CREATE POLICY "Admins can manage all onboarding progress" ON service_onboarding_progress
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid() 
      AND (role = 'admin' OR role = 'super_admin' OR role = 'manager')
    )
  );

-- Business users can view their own progress (if client_id matches business_id)
DROP POLICY IF EXISTS "Businesses can view their own onboarding progress" ON service_onboarding_progress;
CREATE POLICY "Businesses can view their own onboarding progress" ON service_onboarding_progress
  FOR SELECT USING (
    client_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_onboarding_client ON service_onboarding_progress(client_id);
CREATE INDEX IF NOT EXISTS idx_service_onboarding_type ON service_onboarding_progress(checklist_type);
