// =====================================================
// ROLE-BASED ACCESS CONTROL & PERMISSIONS
// =====================================================

import type { UserRole, User, Job } from '@/types';

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

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Check if a role can access a specific route/page
 */
export function canAccessRoute(role: UserRole, route: string): boolean {
  const restrictedRoutes: Record<string, Permission[]> = {
    '/leads': ['view_leads'],
    '/leads/[id]': ['view_leads'],
    '/reports': ['view_reports'],
    '/quotes': ['view_quotes', 'manage_quotes'],
    '/quotes/new': ['manage_quotes'],
    '/quotes/[id]': ['view_quotes'],
    '/invoices': ['view_invoices', 'manage_invoices'],
    '/invoices/new': ['manage_invoices'],
    '/invoices/[id]': ['view_invoices'],
    '/team': ['manage_team'],
    '/settings/team': ['view_team'],
    '/settings/team/invite': ['invite_team'],
    '/settings/billing': ['manage_billing'],
    '/settings/ai-sms': ['manage_ai_sms'],
    '/settings/phone': ['manage_phone_settings'],
    '/settings/calendar': ['manage_calendar'],
    '/settings/email-recipients': ['manage_email_recipients'],
    '/settings/services': ['manage_invoices'],
    '/calendar': ['view_calendar']
  };

  const requiredPermissions = restrictedRoutes[route];
  if (!requiredPermissions) return true;

  return requiredPermissions.some(p => hasPermission(role, p));
}

/**
 * Check if a user can view a specific job
 */
export function canViewJob(user: User, job: Job): boolean {
  if (user.role === 'owner' || user.role === 'admin') {
    return true;
  }
  // Technicians can only see assigned jobs
  return job.assigned_to === user.id;
}

/**
 * Check if a user can edit a specific job
 */
export function canEditJob(user: User, job: Job): boolean {
  if (user.role === 'owner' || user.role === 'admin') {
    return true;
  }
  // Technicians can only update status of assigned jobs
  return job.assigned_to === user.id;
}

/**
 * Check if a user can view a specific customer
 * Technicians can only view customers for their assigned jobs
 */
export function canViewCustomer(
  user: User, 
  customerId: string, 
  assignedJobs: Job[]
): boolean {
  if (user.role === 'owner' || user.role === 'admin') {
    return true;
  }
  // Technicians can only see customers for their assigned jobs
  return assignedJobs.some(job => job.customer_id === customerId);
}

/**
 * Get the navigation items available for a role
 */
export function getNavigationForRole(role: UserRole): Array<{
  name: string;
  href: string;
  icon: string;
}> {
  const baseNav = [
    { name: 'Home', href: '/dashboard', icon: 'Home' },
    { name: 'Jobs', href: '/jobs', icon: 'Calendar' },
    { name: 'Messages', href: '/messages', icon: 'MessageSquare' }
  ];

  if (role === 'owner' || role === 'admin') {
    return [
      { name: 'Home', href: '/dashboard', icon: 'Home' },
      { name: 'Leads', href: '/leads', icon: 'Users' },
      { name: 'Jobs', href: '/jobs', icon: 'Calendar' },
      { name: 'Messages', href: '/messages', icon: 'MessageSquare' },
      { name: 'More', href: '/more', icon: 'MoreHorizontal' }
    ];
  }

  // Technician nav
  return [
    { name: 'Home', href: '/dashboard', icon: 'Home' },
    { name: 'Jobs', href: '/jobs', icon: 'Calendar' },
    { name: 'Messages', href: '/messages', icon: 'MessageSquare' },
    { name: 'Help', href: '/help', icon: 'HelpCircle' },
    { name: 'Settings', href: '/settings', icon: 'Settings' }
  ];
}

/**
 * Check if a user can manage another user
 */
export function canManageUser(manager: User, target: User): boolean {
  // Can't manage yourself
  if (manager.id === target.id) return false;

  // Owner can manage everyone
  if (manager.role === 'owner') return true;

  // Admin can manage technicians
  if (manager.role === 'admin' && target.role === 'technician') return true;

  return false;
}

/**
 * Check if a user can invite team members
 */
export function canInviteTeam(role: UserRole): boolean {
  return hasPermission(role, 'invite_team');
}

/**
 * Check if a user can transfer ownership
 */
export function canTransferOwnership(role: UserRole): boolean {
  return hasPermission(role, 'transfer_ownership');
}

/**
 * Get roles that a user can assign when inviting
 */
export function getAssignableRoles(role: UserRole): UserRole[] {
  if (role === 'owner') {
    return ['admin', 'technician'];
  }
  if (role === 'admin') {
    return ['technician'];
  }
  return [];
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    owner: 'Owner',
    admin: 'Admin',
    technician: 'Technician'
  };
  return names[role];
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    owner: 'Full access to all features including billing',
    admin: 'Full access except billing and subscription',
    technician: 'View assigned jobs, add notes and photos, update status'
  };
  return descriptions[role];
}

/**
 * Dashboard sections by role
 */
export const DASHBOARD_SECTIONS: Record<UserRole, string[]> = {
  owner: [
    'stats',
    'reminders',
    'todayJobs',
    'tomorrowJobs',
    'leads',
    'needsFollowUp',
    'leadUsage'
  ],
  admin: [
    'stats',
    'reminders',
    'todayJobs',
    'tomorrowJobs',
    'leads',
    'needsFollowUp',
    'leadUsage'
  ],
  technician: [
    'reminders',
    'todayJobs',
    'tomorrowJobs'
  ]
};

/**
 * Check what dashboard sections a user can see
 */
export function getDashboardSections(role: UserRole): string[] {
  return DASHBOARD_SECTIONS[role] || [];
}
