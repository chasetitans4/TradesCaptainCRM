-- Feature Requests System
-- Migration 100_feature_requests.sql

-- Create sequence for request numbers if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS feature_request_seq START 1000;

CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_seq_id INTEGER DEFAULT nextval('feature_request_seq'),
  request_number TEXT GENERATED ALWAYS AS ('FR-' || request_seq_id::text) STORED,
  
  -- Submitter info
  source TEXT NOT NULL CHECK (source IN ('client', 'admin')),
  submitter_id UUID NOT NULL, -- Can be auth.users.id or admin_users.id
  submitter_name TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  business_name TEXT,
  crm_account_id UUID REFERENCES crm_accounts(id) ON DELETE SET NULL,
  
  -- Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  use_case TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'leads_customers', 
    'jobs_scheduling', 
    'quotes_invoices', 
    'communication', 
    'reporting', 
    'integrations', 
    'mobile_app', 
    'admin_settings', 
    'other'
  )),
  priority TEXT NOT NULL DEFAULT 'low' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted', 
    'under_review', 
    'planned', 
    'in_progress', 
    'completed', 
    'declined'
  )),
  
  -- Stats (denormalized for performance, maintained by triggers)
  upvotes INTEGER DEFAULT 0,
  
  -- Admin fields
  admin_notes TEXT,
  estimated_timeline TEXT,
  assigned_to UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS feature_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(feature_request_id, user_id)
);

CREATE TABLE IF NOT EXISTS feature_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  commenter_type TEXT NOT NULL CHECK (commenter_type IN ('client', 'admin')),
  commenter_id UUID NOT NULL,
  commenter_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  is_official_response BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_category ON feature_requests(category);
CREATE INDEX IF NOT EXISTS idx_feature_requests_submitter ON feature_requests(submitter_id);
CREATE INDEX IF NOT EXISTS idx_feature_votes_request ON feature_votes(feature_request_id);
CREATE INDEX IF NOT EXISTS idx_feature_comments_request ON feature_comments(feature_request_id);

-- RLS
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_comments ENABLE ROW LEVEL SECURITY;

-- Policies
-- Requests: Everyone can read
DROP POLICY IF EXISTS "Everyone can view feature requests" ON feature_requests;
CREATE POLICY "Everyone can view feature requests" 
  ON feature_requests FOR SELECT 
  USING (true);

-- Requests: Authenticated can insert
DROP POLICY IF EXISTS "Authenticated can create feature requests" ON feature_requests;
CREATE POLICY "Authenticated can create feature requests" 
  ON feature_requests FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Requests: Admins can update (We'll assume specific admin roles or just generic authenticated for now, but strictly admins should be controlled via app logic or a more complex policy)
-- For simplicity in this CRM, we often rely on app-side checks for admin status, or a custom claim.
-- Let's allow update if you are the submitter (limited fields usually, but here we open it up) OR if you are an admin.
DROP POLICY IF EXISTS "Submitters can update their own requests" ON feature_requests;
CREATE POLICY "Submitters can update their own requests" 
  ON feature_requests FOR UPDATE
  USING (auth.uid() = submitter_id);

-- Votes: Authenticated can vote
DROP POLICY IF EXISTS "Authenticated can vote" ON feature_votes;
CREATE POLICY "Authenticated can vote" 
  ON feature_votes FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can remove their own votes" ON feature_votes;
CREATE POLICY "Users can remove their own votes" 
  ON feature_votes FOR DELETE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Everyone can view votes" ON feature_votes;
CREATE POLICY "Everyone can view votes" 
  ON feature_votes FOR SELECT 
  USING (true);

-- Comments: Authenticated can comment
DROP POLICY IF EXISTS "Authenticated can comment" ON feature_comments;
CREATE POLICY "Authenticated can comment" 
  ON feature_comments FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Everyone can view comments" ON feature_comments;
CREATE POLICY "Everyone can view comments" 
  ON feature_comments FOR SELECT 
  USING (true);


-- Triggers for Upvote Count
CREATE OR REPLACE FUNCTION update_feature_upvotes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE feature_requests
    SET upvotes = upvotes + 1
    WHERE id = NEW.feature_request_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE feature_requests
    SET upvotes = upvotes - 1
    WHERE id = OLD.feature_request_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_feature_upvotes_trigger ON feature_votes;
CREATE TRIGGER update_feature_upvotes_trigger
AFTER INSERT OR DELETE ON feature_votes
FOR EACH ROW EXECUTE FUNCTION update_feature_upvotes();

-- Trigger for Updated At
CREATE OR REPLACE FUNCTION update_feature_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_feature_request_timestamp_trigger ON feature_requests;
CREATE TRIGGER update_feature_request_timestamp_trigger
BEFORE UPDATE ON feature_requests
FOR EACH ROW EXECUTE FUNCTION update_feature_request_timestamp();
