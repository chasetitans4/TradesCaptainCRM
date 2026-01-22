-- =====================================================
-- CLEANUP SCRIPT
-- Run this BEFORE running 099_project_wide_audit.sql if you encounter "policy already exists" errors.
-- This script explicitly removes all policies that might conflict.
-- =====================================================

-- Inventory Policies
DROP POLICY IF EXISTS "Users can view their business inventory" ON business_inventory;
DROP POLICY IF EXISTS "Users can manage their business inventory" ON business_inventory;
DROP POLICY IF EXISTS "Users can view their business categories" ON inventory_categories;
DROP POLICY IF EXISTS "Users can view their business inventory categories" ON inventory_categories; -- Variant from 032
DROP POLICY IF EXISTS "Users can manage their business inventory categories" ON inventory_categories; -- Variant from 032
DROP POLICY IF EXISTS "Users can view job inventory usage" ON job_inventory_usage;
DROP POLICY IF EXISTS "Users can manage job inventory usage" ON job_inventory_usage;
DROP POLICY IF EXISTS "Service role full access inventory_categories" ON inventory_categories;
DROP POLICY IF EXISTS "Service role full access business_inventory" ON business_inventory;
DROP POLICY IF EXISTS "Service role full access job_inventory_usage" ON job_inventory_usage;

-- Documents Policies
DROP POLICY IF EXISTS "Users can view their business documents" ON documents;
DROP POLICY IF EXISTS "Users can manage their business documents" ON documents;
DROP POLICY IF EXISTS "Documents Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Documents Authenticated Upload" ON storage.objects;

-- Support Tickets Policies
DROP POLICY IF EXISTS "Users can view their business tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can create tickets for their business" ON support_tickets;

-- Checklists Policies
DROP POLICY IF EXISTS "Users can view their business checklists" ON client_checklist_status;
DROP POLICY IF EXISTS "Users can manage their business checklists" ON client_checklist_status;

-- Leads Captain Insights Policies
DROP POLICY IF EXISTS "Users can view their business insights" ON leads_captain_insights;
DROP POLICY IF EXISTS "insights_read_own_business" ON leads_captain_insights; -- Variant from 036
DROP POLICY IF EXISTS "insights_insert_own_business" ON leads_captain_insights; -- Variant from 036
DROP POLICY IF EXISTS "insights_service_role" ON leads_captain_insights; -- Variant from 036

-- Leads Captain Photo Analysis Policies
DROP POLICY IF EXISTS "Users can view their photo analysis" ON leads_captain_photo_analysis;

-- Storage Policies
DROP POLICY IF EXISTS "Public Access portal-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload portal-uploads" ON storage.objects;
