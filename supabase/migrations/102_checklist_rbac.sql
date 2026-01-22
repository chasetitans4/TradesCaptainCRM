-- =====================================================
-- 102_checklist_rbac.sql
-- RBAC and Persistence hardening for Checklists
-- =====================================================

-- 1. Ensure RLS is enabled on checklist_templates
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;

-- 2. Ensure RLS is enabled on job_checklists
ALTER TABLE job_checklists ENABLE ROW LEVEL SECURITY;

-- 3. Policies for checklist_templates
DROP POLICY IF EXISTS "Users can view their business checklist templates" ON checklist_templates;
CREATE POLICY "Users can view their business checklist templates" ON checklist_templates
  FOR SELECT USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage their business checklist templates" ON checklist_templates;
CREATE POLICY "Users can manage their business checklist templates" ON checklist_templates
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM users WHERE id = auth.uid()
    )
  );

-- 4. Policies for job_checklists
-- Access is determined by access to the parent job

DROP POLICY IF EXISTS "Users can view checklists for their jobs" ON job_checklists;
CREATE POLICY "Users can view checklists for their jobs" ON job_checklists
  FOR SELECT USING (
    job_id IN (
      SELECT id FROM jobs 
      WHERE business_id IN (
        SELECT business_id FROM users WHERE id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can manage checklists for their jobs" ON job_checklists;
CREATE POLICY "Users can manage checklists for their jobs" ON job_checklists
  FOR ALL USING (
    job_id IN (
      SELECT id FROM jobs 
      WHERE business_id IN (
        SELECT business_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- 5. Index for performance
CREATE INDEX IF NOT EXISTS idx_job_checklists_job_id ON job_checklists(job_id);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_business_id ON checklist_templates(business_id);
