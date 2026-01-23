/**
 * Centralized status color definitions for admin portal
 * Use these classes consistently across all admin pages for status badges
 */

// Lead status colors
export const leadStatusColors: Record<string, string> = {
  new: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
  contacted: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
  qualified: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
  proposal: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
  negotiation: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  won: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30',
  lost: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
  nurturing: 'bg-muted text-muted-foreground border-muted',
};

// Agent status colors
export const agentStatusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600 dark:text-green-400',
  inactive: 'bg-muted text-muted-foreground',
  pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  suspended: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

// Coupon status colors
export const couponStatusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600 dark:text-green-400',
  redeemed: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  expired: 'bg-muted text-muted-foreground',
  revoked: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

// Commission status colors
export const commissionStatusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  approved: 'bg-green-500/10 text-green-600 dark:text-green-400',
  paid: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  rejected: 'bg-red-500/10 text-red-600 dark:text-red-400',
  voided: 'bg-muted text-muted-foreground',
};

// Account/Subscription status colors
export const accountStatusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600 dark:text-green-400',
  trial: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  churned: 'bg-red-500/10 text-red-600 dark:text-red-400',
  paused: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  canceled: 'bg-muted text-muted-foreground',
  expired: 'bg-muted text-muted-foreground',
};

// Expense/Timesheet status colors
export const approvalStatusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  approved: 'bg-green-500/10 text-green-600 dark:text-green-400',
  rejected: 'bg-red-500/10 text-red-600 dark:text-red-400',
  submitted: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
};

// Ticket/Support status colors
export const ticketStatusColors: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  in_progress: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  waiting: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  resolved: 'bg-green-500/10 text-green-600 dark:text-green-400',
  closed: 'bg-muted text-muted-foreground',
};

// Priority colors
export const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  urgent: 'bg-red-500/10 text-red-600 dark:text-red-400',
  critical: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

// Onboarding status colors
export const onboardingStatusColors: Record<string, string> = {
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  completed: 'bg-green-500/10 text-green-600 dark:text-green-400',
  stalled: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

// Plan/Tier colors
export const planColors: Record<string, string> = {
  starter: 'bg-muted text-muted-foreground',
  gold: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  nevermiss: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  enterprise: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
};

// Admin role colors
export const roleColors: Record<string, string> = {
  super_admin: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  admin: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  agent: 'bg-green-500/10 text-green-600 dark:text-green-400',
  support: 'bg-muted text-muted-foreground',
  finance: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
};

/**
 * Get status color with fallback
 */
export function getStatusColor(
  colors: Record<string, string>,
  status: string,
  fallback = 'bg-muted text-muted-foreground'
): string {
  return colors[status.toLowerCase()] || fallback;
}
