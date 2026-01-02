import { parseISO } from 'date-fns';

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Generate initials from a name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Get a greeting based on time of day
 */
export function getGreeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 17) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

/**
 * Convert status to display label
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    // Lead statuses
    new: 'New',
    contacted: 'Contacted',
    quoted: 'Quoted',
    scheduled: 'Scheduled',
    won: 'Won',
    lost: 'Lost',
    // Job statuses
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    no_show: 'No Show',
    // Quote/Invoice statuses
    draft: 'Draft',
    sent: 'Sent',
    viewed: 'Viewed',
    accepted: 'Accepted',
    declined: 'Declined',
    expired: 'Expired',
    paid: 'Paid',
    overdue: 'Overdue',
  };

  return labels[status] || capitalize(status.replace(/_/g, ' '));
}

/**
 * Get urgency color classes from urgency level
 */
export function getUrgencyColorFromLevel(urgency: string | null): string {
  switch (urgency) {
    case 'emergency':
      return 'text-danger bg-danger/10';
    case 'high':
      return 'text-warning bg-warning/10';
    case 'normal':
      return 'text-info bg-info/10';
    case 'low':
      return 'text-text-muted bg-muted';
    default:
      return 'text-text-muted bg-muted';
  }
}

/**
 * Get urgency color based on a date (for reminders)
 * Returns object with bg and text classes
 */
export function getUrgencyColor(date: string | Date): { bg: string; text: string } {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const now = new Date();
  const diffHours = (d.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours < 0) {
    // Overdue
    return { bg: 'bg-danger/10', text: 'text-danger' };
  }

  if (diffHours < 1) {
    // Due within an hour
    return { bg: 'bg-warning/10', text: 'text-warning' };
  }

  if (diffHours < 24) {
    // Due today
    return { bg: 'bg-info/10', text: 'text-info' };
  }

  // Due later
  return { bg: 'bg-muted', text: 'text-text-muted' };
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}
