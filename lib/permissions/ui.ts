// =====================================================
// UI-RELATED PERMISSION HELPERS
// =====================================================

import type { UserRole } from '@/types';

/**
 * Get the navigation items available for a role
 */
export function getNavigationForRole(role: UserRole): Array<{
  name: string;
  href: string;
  icon: string;
}> {
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
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    owner: 'Owner',
    admin: 'Admin',
    technician: 'Technician',
    super_admin: 'Super Admin',
    finance: 'Finance',
    manager: 'Manager',
    agent: 'Agent'
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
    technician: 'View assigned jobs, add notes and photos, update status',
    super_admin: 'Full platform administration access',
    finance: 'Access to reports, billing, and commissions',
    manager: 'Team management, onboarding, and leads oversight',
    agent: 'View assigned leads and submit feature requests'
  };
  return descriptions[role];
}

/**
 * Dashboard sections by role
 */
export const DASHBOARD_SECTIONS: Record<UserRole, string[]> = {
  owner: [
    'stats',
    'messages',
    'reminders',
    'todayJobs',
    'tomorrowJobs',
    'leads',
    'needsFollowUp',
    'leadUsage'
  ],
  admin: [
    'stats',
    'messages',
    'reminders',
    'todayJobs',
    'tomorrowJobs',
    'leads',
    'needsFollowUp',
    'leadUsage'
  ],
  super_admin: [
    'stats',
    'messages',
    'reminders',
    'todayJobs',
    'tomorrowJobs',
    'leads',
    'needsFollowUp',
    'leadUsage'
  ],
  manager: [
    'stats',
    'messages',
    'reminders',
    'todayJobs',
    'tomorrowJobs',
    'leads',
    'needsFollowUp',
    'leadUsage'
  ],
  finance: [
    'stats',
    'leadUsage'
  ],
  agent: [
    'stats',
    'messages',
    'reminders',
    'leads',
    'needsFollowUp'
  ],
  technician: ['reminders', 'todayJobs', 'tomorrowJobs']
};

/**
 * Check what dashboard sections a user can see
 */
export function getDashboardSections(role: UserRole): string[] {
  return DASHBOARD_SECTIONS[role] || [];
}
