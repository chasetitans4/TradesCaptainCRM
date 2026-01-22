import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

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
 * Safely format a date, returning fallback for invalid/null dates
 */
export function safeFormatDate(
  date: string | Date | null | undefined,
  formatStr: string = 'MMM d, yyyy',
  fallback: string = '-'
): string {
  if (!date) return fallback;
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(d.getTime())) return fallback;
    return format(d, formatStr);
  } catch {
    return fallback;
  }
}

/**
 * Check if a date string/Date is valid
 */
export function isValidDate(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return !isNaN(d.getTime());
  } catch {
    return false;
  }
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
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
