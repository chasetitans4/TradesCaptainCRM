// =====================================================
// ROLE-BASED ACCESS CONTROL - TYPE DEFINITIONS & CONSTANTS
// =====================================================

import type { UserRole } from '@/types';

// All possible permissions in the system
export type Permission =
  // Jobs
  | 'view_all_jobs'
  | 'view_assigned_jobs'
  | 'create_jobs'
  | 'manage_jobs'
  | 'assign_jobs'
  | 'update_job_status'
  | 'add_job_notes'
  | 'add_job_photos'
  // Leads
  | 'view_leads'
  | 'create_leads'
  | 'edit_leads'
  | 'manage_leads'
  // Customers
  | 'view_customers'
  | 'view_customer_for_job'
  | 'manage_customers'
  // Quotes & Invoices
  | 'view_quotes'
  | 'manage_quotes'
  | 'view_invoices'
  | 'manage_invoices'
  // Reports
  | 'view_reports'
  // Messages & SMS
  | 'view_messages'
  | 'manage_messages'
  | 'send_sms_to_job_customer'
  | 'manage_phone_settings'
  // Team & Settings
  | 'view_team'
  | 'invite_team'
  | 'manage_team'
  | 'transfer_ownership'
  | 'manage_billing'
  | 'manage_settings'
  | 'manage_ai_sms'
  | 'manage_email_recipients'
  // Calendar
  | 'manage_calendar'
  | 'view_calendar'
  // Bookings
  | 'view_bookings'
  | 'manage_bookings'
  | 'manage_booking_settings'
  // Reminders
  | 'view_reminders'
  | 'manage_own_reminders'
  // Call Logs
  | 'view_calls'
  | 'create_calls'
  | 'log_calls'
  // Knowledge Base
  | 'view_knowledge_base'
  // Time & Expenses
  | 'view_timesheets'
  | 'manage_timesheets'
  | 'approve_timesheets'
  | 'view_expenses'
  | 'manage_expenses'
  | 'approve_expenses'
  // Inventory
  | 'view_inventory'
  | 'manage_inventory'
  // Checklists
  | 'view_checklists'
  | 'manage_checklists'
  // Feature Requests
 | 'view_feature_requests'
  | 'manage_feature_requests'
  // Onboarding
  | 'view_onboarding'
  | 'manage_onboarding'
  | 'view_leads_captain'
  | 'manage_leads_captain'
  // Admin & Support
  | 'view_admin_support'
  | 'manage_admin_support'
  | 'view_admin_accounts'
  | 'manage_admin_accounts'
  | 'view_admin_leads'
  | 'manage_admin_leads'
  | 'view_admin_commissions'
  | 'manage_admin_commissions'
  // Voice Receptionist
  | 'view_voice_receptionist'
  | 'manage_voice_receptionist';

// Permissions by role
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    // Full access to everything
    'view_all_jobs',
    'create_jobs',
    'manage_jobs',
    'assign_jobs',
    'update_job_status',
    'add_job_notes',
    'add_job_photos',
    'view_leads',
    'create_leads',
    'edit_leads',
    'manage_leads',
    'view_customers',
    'manage_customers',
    'view_quotes',
    'manage_quotes',
    'view_invoices',
    'manage_invoices',
    'view_reports',
    'view_messages',
    'manage_messages',
    'manage_phone_settings',
    'view_team',
    'invite_team',
    'manage_team',
    'transfer_ownership',
    'manage_billing',
    'manage_settings',
    'manage_ai_sms',
    'manage_email_recipients',
    'manage_calendar',
    'view_calendar',
    'view_bookings',
    'manage_bookings',
    'manage_booking_settings',
    'view_reminders',
    'manage_own_reminders',
    'view_calls',
    'create_calls',
    'log_calls',
    'view_knowledge_base',
    'view_timesheets',
    'manage_timesheets',
    'approve_timesheets',
    'view_expenses',
    'manage_expenses',
    'approve_expenses',
    'view_inventory',
    'manage_inventory',
    'view_checklists',
    'manage_checklists',
    'view_feature_requests',
    'manage_feature_requests',
    'view_onboarding',
    'manage_onboarding',
    'view_leads_captain',
    'manage_leads_captain',
    'view_admin_support',
    'manage_admin_support',
    'view_admin_accounts',
    'manage_admin_accounts',
    'view_admin_leads',
    'manage_admin_leads',
    'view_admin_commissions',
    'manage_admin_commissions',
    'view_voice_receptionist',
    'manage_voice_receptionist'
  ],
  admin: [
    // Everything except billing and ownership transfer
    'view_all_jobs',
    'create_jobs',
    'manage_jobs',
    'assign_jobs',
    'update_job_status',
    'add_job_notes',
    'add_job_photos',
    'view_leads',
    'create_leads',
    'edit_leads',
    'manage_leads',
    'view_customers',
    'manage_customers',
    'view_quotes',
    'manage_quotes',
    'view_invoices',
    'manage_invoices',
    'view_reports',
    'view_messages',
    'manage_messages',
    'manage_phone_settings',
    'view_team',
    'invite_team',
    'manage_team',
    'manage_settings',
    'manage_ai_sms',
    'manage_email_recipients',
    'manage_calendar',
    'view_calendar',
    'view_bookings',
    'manage_bookings',
    'manage_booking_settings',
    'view_reminders',
    'manage_own_reminders',
    'view_calls',
    'create_calls',
    'log_calls',
    'view_knowledge_base',
    'view_timesheets',
    'manage_timesheets',
    'approve_timesheets',
    'view_expenses',
    'manage_expenses',
    'approve_expenses',
    'view_inventory',
    'manage_inventory',
    'view_onboarding',
    'manage_onboarding',
    'view_leads_captain',
    'manage_leads_captain',
    'view_admin_support',
    'manage_admin_support',
    'view_admin_accounts',
    'manage_admin_accounts',
    'view_admin_leads',
    'manage_admin_leads',
    'view_admin_commissions', 'manage_admin_commissions',
    'view_voice_receptionist', 'manage_voice_receptionist'
  ],
  technician: [
    // Limited access - assigned jobs only
    'view_assigned_jobs',
    'update_job_status',
    'add_job_notes',
    'add_job_photos',
    'view_customer_for_job',
    'view_calls',
    'create_calls',
    'log_calls',
    'send_sms_to_job_customer',
    'view_calendar',
    'view_reminders',
    'manage_own_reminders',
    'view_knowledge_base',
    'view_timesheets',
    'manage_timesheets',
    'view_expenses',
    'manage_expenses',
    'view_inventory',
    'view_checklists',
    'view_feature_requests'
  ],
  // Admin Portal Roles
  super_admin: [
    // Full system access
    'view_all_jobs', 'create_jobs', 'manage_jobs', 'assign_jobs', 'update_job_status',
    'add_job_notes', 'add_job_photos',
    'view_leads', 'create_leads', 'edit_leads', 'manage_leads',
    'view_customers', 'manage_customers', 'view_customer_for_job',
    'view_quotes', 'manage_quotes',
    'view_invoices', 'manage_invoices',
    'view_reports',
    'view_messages', 'manage_messages', 'send_sms_to_job_customer', 'manage_phone_settings',
    'view_team', 'invite_team', 'manage_team', 'transfer_ownership',
    'manage_billing', 'manage_settings', 'manage_ai_sms', 'manage_email_recipients',
    'manage_calendar', 'view_calendar',
    'view_bookings', 'manage_bookings', 'manage_booking_settings',
    'view_reminders', 'manage_own_reminders',
    'view_calls', 'create_calls', 'log_calls',
    'view_knowledge_base',
    'view_timesheets', 'manage_timesheets', 'approve_timesheets',
    'view_expenses', 'manage_expenses', 'approve_expenses',
    'view_inventory', 'manage_inventory',
    'view_checklists', 'manage_checklists',
    'view_feature_requests', 'manage_feature_requests',
    'view_onboarding', 'manage_onboarding',
    'view_leads_captain', 'manage_leads_captain',
    'view_admin_support', 'manage_admin_support',
    'view_admin_accounts', 'manage_admin_accounts',
    'view_admin_leads', 'manage_admin_leads',
    'view_admin_commissions', 'manage_admin_commissions'
  ],
  finance: [
    'view_reports',
    'manage_billing',
    'view_admin_commissions', 'manage_admin_commissions',
    'view_admin_accounts'
  ],
  manager: [
    'view_reports',
    'view_team', 'manage_team',
    'view_onboarding', 'manage_onboarding',
    'view_leads_captain', 'manage_leads_captain',
    'view_admin_leads', 'manage_admin_leads',
    'view_feature_requests', 'manage_feature_requests',
    'view_admin_accounts'
  ],
  agent: [
    'view_reports', // Own reports restricted by API
    'view_admin_leads', // Assigned leads restricted by API
    'view_feature_requests',
    'view_knowledge_base'
  ]
};
