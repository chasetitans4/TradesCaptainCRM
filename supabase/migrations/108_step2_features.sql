
-- Migration 108 Part 2: Trades Features Logic
-- RUN THIS AFTER STEP 1
-- This script creates new tables and policies assuming schema is ready.

-- ==========================================
-- 2. MAINTENANCE REMINDERS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.maintenance_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES customer_equipment(id) ON DELETE SET NULL,
    reminder_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'scheduled', 'completed', 'dismissed')),
    sent_at TIMESTAMPTZ,
    scheduled_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    notification_method TEXT DEFAULT 'email' CHECK (notification_method IN ('email', 'sms', 'both', 'portal_only')),
    recurrence TEXT CHECK (recurrence IN ('once', 'monthly', 'quarterly', 'biannual', 'annual')),
    next_reminder_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_business_id ON maintenance_reminders(business_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_customer_id ON maintenance_reminders(customer_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_reminders_status ON maintenance_reminders(status);

ALTER TABLE maintenance_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view their maintenance reminders" ON maintenance_reminders;
CREATE POLICY "Business owners can view their maintenance reminders"
ON maintenance_reminders FOR ALL
USING (business_id IN (SELECT business_id FROM public.users WHERE auth_user_id = auth.uid()));

-- ==========================================
-- 4. WARRANTIES EXTENSIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.warranty_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warranty_id UUID NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    claim_date TIMESTAMPTZ DEFAULT NOW(),
    claim_reason TEXT NOT NULL,
    claim_description TEXT,
    status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'denied', 'completed')),
    resolution TEXT,
    resolution_date TIMESTAMPTZ,
    repair_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warranty_claims_warranty_id ON warranty_claims(warranty_id);
CREATE INDEX IF NOT EXISTS idx_warranty_claims_business_id ON warranty_claims(business_id);

ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view their warranty claims" ON warranty_claims;
CREATE POLICY "Business owners can view their warranty claims"
ON warranty_claims FOR ALL
USING (business_id IN (SELECT business_id FROM public.users WHERE auth_user_id = auth.uid()));

-- ==========================================
-- 5. EMERGENCY REQUESTS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.emergency_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES customer_equipment(id) ON DELETE SET NULL,
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
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'dispatched', 'resolved', 'cancelled')),
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES public.users(id),
    dispatched_job_id UUID REFERENCES jobs(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_requests_business_id ON emergency_requests(business_id);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_customer_id ON emergency_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_emergency_requests_status ON emergency_requests(status);

ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view their emergency requests" ON emergency_requests;
CREATE POLICY "Business owners can view their emergency requests"
ON emergency_requests FOR ALL
USING (business_id IN (SELECT business_id FROM public.users WHERE auth_user_id = auth.uid()));

-- ==========================================
-- 6. DOCUMENT MANAGEMENT
-- ==========================================

CREATE TABLE IF NOT EXISTS public.customer_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    equipment_id UUID REFERENCES customer_equipment(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    file_path TEXT, -- Storage path
    file_url TEXT, -- Public or signed URL
    file_type TEXT,
    file_size INTEGER,
    category TEXT NOT NULL CHECK (category IN ('contract', 'permit', 'license', 'insurance', 'manual', 'other')),
    document_type TEXT,
    tags TEXT[] DEFAULT '{}',
    expires_at TIMESTAMPTZ,
    issued_date TIMESTAMPTZ,
    portal_visible BOOLEAN DEFAULT true,
    uploaded_by UUID REFERENCES public.users(id),
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_documents_business_id ON customer_documents(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_customer_id ON customer_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_job_id ON customer_documents(job_id);

ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view their documents" ON customer_documents;
CREATE POLICY "Business owners can view their documents"
ON customer_documents FOR ALL
USING (business_id IN (SELECT business_id FROM public.users WHERE auth_user_id = auth.uid()));

-- ==========================================
-- 7. MEMBERSHIP / SERVICE AGREEMENTS
-- ==========================================

CREATE TABLE IF NOT EXISTS public.membership_benefits_used (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_agreement_id UUID NOT NULL REFERENCES service_agreements(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    benefit_type TEXT NOT NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    amount_saved DECIMAL(10, 2),
    used_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_benefits_used_agreement ON membership_benefits_used(service_agreement_id);
CREATE INDEX IF NOT EXISTS idx_membership_benefits_used_business ON membership_benefits_used(business_id);

ALTER TABLE membership_benefits_used ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view benefit usage" ON membership_benefits_used;
CREATE POLICY "Business owners can view benefit usage"
ON membership_benefits_used FOR ALL
USING (business_id IN (SELECT business_id FROM public.users WHERE auth_user_id = auth.uid()));

-- ==========================================
-- 8. ESTIMATE APPROVAL WORKFLOW
-- ==========================================

CREATE TABLE IF NOT EXISTS public.quote_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    author_type TEXT NOT NULL CHECK (author_type IN ('customer', 'business')),
    author_name TEXT,
    author_user_id UUID REFERENCES public.users(id), -- Null if customer
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quote_comments_quote_id ON quote_comments(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_comments_business_id ON quote_comments(business_id);

ALTER TABLE quote_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view quote comments" ON quote_comments;
CREATE POLICY "Business owners can view quote comments"
ON quote_comments FOR ALL
USING (business_id IN (SELECT business_id FROM public.users WHERE auth_user_id = auth.uid()));

-- ==========================================
-- 9. ISSUE REPORTING
-- ==========================================

CREATE TABLE IF NOT EXISTS public.customer_issue_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES customer_equipment(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    issue_type TEXT CHECK (issue_type IN ('not_working', 'strange_noise', 'leak', 'performance', 'other')),
    urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'emergency')),
    location_notes TEXT,
    media_urls JSONB DEFAULT '[]',
    preferred_contact_method TEXT DEFAULT 'phone',
    preferred_times TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'scheduled', 'resolved', 'closed')),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.users(id),
    scheduled_job_id UUID REFERENCES jobs(id),
    response_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_issue_reports_business ON customer_issue_reports(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_issue_reports_customer ON customer_issue_reports(customer_id);

ALTER TABLE customer_issue_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view issue reports" ON customer_issue_reports;
CREATE POLICY "Business owners can view issue reports"
ON customer_issue_reports FOR ALL
USING (business_id IN (SELECT business_id FROM public.users WHERE auth_user_id = auth.uid()));

-- ==========================================
-- 10. REFERRAL PROGRAM
-- ==========================================

CREATE TABLE IF NOT EXISTS public.referral_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    referrer_reward_type TEXT NOT NULL CHECK (referrer_reward_type IN ('cash', 'credit', 'discount_percent', 'discount_fixed', 'gift_card', 'free_service')),
    referrer_reward_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    referee_reward_type TEXT CHECK (referee_reward_type IN ('cash', 'credit', 'discount_percent', 'discount_fixed', 'gift_card', 'free_service')),
    referee_reward_amount DECIMAL(10, 2) DEFAULT 0,
    minimum_job_value DECIMAL(10, 2) DEFAULT 0,
    valid_services TEXT[] DEFAULT '{}',
    terms_and_conditions TEXT,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    max_referrals_per_customer INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_programs_business_id ON referral_programs(business_id);

ALTER TABLE referral_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can manage referral programs" ON referral_programs;
CREATE POLICY "Business owners can manage referral programs"
ON referral_programs FOR ALL
USING (business_id IN (SELECT business_id FROM public.users WHERE auth_user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.customer_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES referral_programs(id) ON DELETE CASCADE,
    referrer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,
    referred_name TEXT,
    referred_email TEXT,
    referred_phone TEXT,
    referred_address TEXT,
    referred_customer_id UUID REFERENCES customers(id), -- If they become a customer
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('code_generated', 'pending', 'contacted', 'quoted', 'completed', 'reward_issued', 'expired', 'invalid')),
    contacted_at TIMESTAMPTZ,
    quoted_at TIMESTAMPTZ,
    completed_job_id UUID REFERENCES jobs(id),
    completed_at TIMESTAMPTZ,
    job_value DECIMAL(10, 2),
    referrer_reward_status TEXT DEFAULT 'pending' CHECK (referrer_reward_status IN ('pending', 'eligible', 'issued', 'redeemed', 'expired')),
    referrer_reward_issued_at TIMESTAMPTZ,
    referrer_reward_redeemed_at TIMESTAMPTZ,
    referrer_reward_notes TEXT,
    referee_reward_status TEXT,
    referee_reward_issued_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_referrals_business_id ON customer_referrals(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_referrals_referrer_id ON customer_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_customer_referrals_code ON customer_referrals(referral_code);

ALTER TABLE customer_referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can view referrals" ON customer_referrals;
CREATE POLICY "Business owners can view referrals"
ON customer_referrals FOR ALL
USING (business_id IN (SELECT business_id FROM public.users WHERE auth_user_id = auth.uid()));

-- ==========================================
-- ADD FUNCTION FOR DOWNLOAD COUNT IF NOT EXISTS
-- ==========================================

CREATE OR REPLACE FUNCTION increment_download_count(doc_id UUID)
RETURNS INTEGER AS $$
DECLARE
    new_count INTEGER;
BEGIN
    UPDATE customer_documents
    SET download_count = COALESCE(download_count, 0) + 1,
        last_downloaded_at = NOW()
    WHERE id = doc_id
    RETURNING download_count INTO new_count;
    
    RETURN new_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 12. STORAGE BUCKETS
-- ==========================================

-- Create storage bucket for issue media if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'issue-media',
    'issue-media',
    true,
    52428800, -- 50MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for customer documents if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
    'customer-documents',
    'customer-documents',
    false,
    104857600 -- 100MB
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for issue-media
DROP POLICY IF EXISTS "Authenticated users can upload issue media" ON storage.objects;
CREATE POLICY "Authenticated users can upload issue media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'issue-media');

DROP POLICY IF EXISTS "Anyone can view issue media" ON storage.objects;
CREATE POLICY "Anyone can view issue media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'issue-media');

DROP POLICY IF EXISTS "Service role can manage issue media" ON storage.objects;
CREATE POLICY "Service role can manage issue media"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'issue-media');

-- Storage policies for customer-documents
DROP POLICY IF EXISTS "Service role can manage customer documents" ON storage.objects;
CREATE POLICY "Service role can manage customer documents"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'customer-documents');
