import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

/**
 * Merge Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date relative to now
 */
export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  
  if (isToday(d)) {
    return format(d, 'h:mm a');
  }
  
  if (isYesterday(d)) {
    return 'Yesterday';
  }
  
  if (isTomorrow(d)) {
    return 'Tomorrow';
  }
  
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 7) {
    return formatDistanceToNow(d, { addSuffix: true });
  }
  
  // Same year
  if (d.getFullYear() === now.getFullYear()) {
    return format(d, 'MMM d');
  }
  
  return format(d, 'MMM d, yyyy');
}

/**
 * Format a date for display
 */
export function formatDate(date: string | Date, formatStr: string = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
}

/**
 * Format time
 */
export function formatTime(time: string): string {
  // Convert "HH:mm:ss" or "HH:mm" to "h:mm a"
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return format(date, 'h:mm a');
}

/**
 * Format a date in a specific timezone
 */
export function formatInTimezone(
  date: string | Date,
  timezone: string,
  formatStr: string = 'MMM d, yyyy h:mm a'
): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(d, timezone, formatStr);
}

/**
 * Get today's date as ISO string (date only)
 */
export function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
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
 * Format an address for display
 */
export function formatAddress(
  line1?: string | null,
  city?: string | null,
  state?: string | null,
  zip?: string | null
): string {
  const parts = [line1, city, state && zip ? `${state} ${zip}` : state || zip].filter(Boolean);
  return parts.join(', ');
}

/**
 * Generate Google Maps navigation URL
 */
export function getNavigationUrl(address: string): string {
  const encoded = encodeURIComponent(address);
  return `https://maps.google.com/?q=${encoded}`;
}

/**
 * Generate tel: link
 */
export function getTelLink(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  return `tel:+1${cleaned}`;
}

/**
 * Generate sms: link
 */
export function getSmsLink(phone: string, body?: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const base = `sms:+1${cleaned}`;
  if (body) {
    return `${base}?body=${encodeURIComponent(body)}`;
  }
  return base;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
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

/**
 * Check if running as PWA
 */
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  return Notification.requestPermission();
}

/**
 * Vibrate device (if supported)
 */
export function vibrate(pattern: number | number[] = 50): void {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Parse query string parameters
 */
export function parseQueryString(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
}

/**
 * Safely parse JSON
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Sleep/delay utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
