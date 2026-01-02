// =====================================================
// PERMISSION CHECK FUNCTIONS
// =====================================================

import type { UserRole, User, Job } from '@/types';
import { ROLE_PERMISSIONS, type Permission } from './roles';

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
