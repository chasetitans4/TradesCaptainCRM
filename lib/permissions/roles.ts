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
  | 'approve_expenses';

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
    'approve_expenses'
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
    'approve_expenses'
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
    'manage_expenses'
  ]
};
