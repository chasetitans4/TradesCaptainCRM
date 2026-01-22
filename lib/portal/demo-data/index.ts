'use client';

// Demo mode localStorage key
export const DEMO_MODE_KEY = 'portal-demo-mode';
export const DEMO_BANNER_DISMISSED_KEY = 'portal-demo-banner-dismissed';

/**
 * Check if demo mode is currently active
 */
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEMO_MODE_KEY) === 'true';
}

/**
 * Enable demo mode - shows mock data throughout the portal
 */
export function enableDemoMode(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_MODE_KEY, 'true');
  // Reset banner dismissal when enabling
  localStorage.removeItem(DEMO_BANNER_DISMISSED_KEY);
}

/**
 * Disable demo mode - removes all mock data from view
 */
export function disableDemoMode(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DEMO_MODE_KEY);
  localStorage.removeItem(DEMO_BANNER_DISMISSED_KEY);
}

/**
 * Check if demo banner has been dismissed for this session
 */
export function isDemoBannerDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(DEMO_BANNER_DISMISSED_KEY) === 'true';
}

/**
 * Dismiss the demo banner for this session only
 */
export function dismissDemoBanner(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(DEMO_BANNER_DISMISSED_KEY, 'true');
}

// Demo data counts for display
export const DEMO_DATA_COUNTS = {
  appointments: 4,
  invoices: 3,
  equipment: 3,
  messages: 9,
  documents: 3,
  quotes: 2,
};

// Export all mock data
export * from './mock-appointments';
export * from './mock-invoices';
export * from './mock-equipment';
export * from './mock-messages';
export * from './mock-documents';
export * from './mock-quotes';
