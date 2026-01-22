-- Migration 108 Part 1: Schema Repair & Extension
-- RUN THIS FIRST
-- This script fixes missing columns and extends existing tables.

-- 1. Fix 'users' table (Critical Fix for Error 42703)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;

-- 2. Ensure 'customer_equipment' table exists (Base Schema)
CREATE TABLE IF NOT EXISTS public.customer_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    equipment_type TEXT NOT NULL,
    name TEXT,
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    location_in_property TEXT,
    install_date DATE,
    manufacture_date DATE,
    last_service_date TIMESTAMPTZ,
    next_service_due TIMESTAMPTZ,
    warranty_expires TIMESTAMPTZ,
    warranty_provider TEXT,
    warranty_details TEXT,
    specifications JSONB,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'needs_repair', 'replaced', 'removed')),
    condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
    photo_urls TEXT[] DEFAULT '{}',
    notes TEXT,
    portal_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Extend 'customer_equipment' (Idempotent checks for existing tables)
ALTER TABLE public.customer_equipment ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE public.customer_equipment ADD COLUMN IF NOT EXISTS portal_visible BOOLEAN DEFAULT true;
ALTER TABLE public.customer_equipment ADD COLUMN IF NOT EXISTS condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'poor'));
ALTER TABLE public.customer_equipment ADD COLUMN IF NOT EXISTS photo_urls TEXT[] DEFAULT '{}';
ALTER TABLE public.customer_equipment ADD COLUMN IF NOT EXISTS location_in_property TEXT;
ALTER TABLE public.customer_equipment ADD COLUMN IF NOT EXISTS warranty_expires TIMESTAMPTZ;
ALTER TABLE public.customer_equipment ADD COLUMN IF NOT EXISTS next_service_due TIMESTAMPTZ;
ALTER TABLE public.customer_equipment ADD COLUMN IF NOT EXISTS last_service_date TIMESTAMPTZ;
ALTER TABLE public.customer_equipment ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Extend 'jobs' table
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS portal_visible BOOLEAN DEFAULT true;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS customer_rating INTEGER CHECK (customer_rating BETWEEN 1 AND 5);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS customer_feedback TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS feedback_submitted_at TIMESTAMPTZ;

-- 5. Extend 'warranties' table
ALTER TABLE public.warranties ADD COLUMN IF NOT EXISTS portal_visible BOOLEAN DEFAULT true;

-- 6. Extend 'service_agreements' table
ALTER TABLE public.service_agreements ADD COLUMN IF NOT EXISTS portal_visible BOOLEAN DEFAULT true;
ALTER TABLE public.service_agreements ADD COLUMN IF NOT EXISTS membership_tier TEXT;
ALTER TABLE public.service_agreements ADD COLUMN IF NOT EXISTS benefits JSONB DEFAULT '[]';
ALTER TABLE public.service_agreements ADD COLUMN IF NOT EXISTS priority_scheduling BOOLEAN DEFAULT false;
ALTER TABLE public.service_agreements ADD COLUMN IF NOT EXISTS free_diagnostic BOOLEAN DEFAULT false;
ALTER TABLE public.service_agreements ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2) DEFAULT 0;
ALTER TABLE public.service_agreements ADD COLUMN IF NOT EXISTS renewal_reminder_days INTEGER DEFAULT 30;
ALTER TABLE public.service_agreements ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT false;

-- 7. Extend 'quotes' table
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT true;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'declined', 'changes_requested'));
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS approved_by_name TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS approved_by_email TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS approval_signature_url TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS decline_reason TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS change_request_notes TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS financing_available BOOLEAN DEFAULT false;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS financing_terms TEXT;

-- 8. Extend 'businesses' table
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS portal_features_enabled JSONB DEFAULT '{
    "equipment_registry": true,
    "maintenance_reminders": true,
    "service_history": true,
    "warranty_tracking": true,
    "emergency_requests": true,
    "document_storage": true,
    "membership_status": true,
    "estimate_approval": true,
    "photo_upload": true,
    "referral_program": false
}'::jsonb;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS emergency_contact_email TEXT;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS after_hours_rate_multiplier DECIMAL(3, 2) DEFAULT 1.5;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS after_hours_minimum DECIMAL(10, 2);
