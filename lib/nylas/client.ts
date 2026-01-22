// =====================================================
// NYLAS CLIENT SETUP
// =====================================================

import Nylas from 'nylas';

// Check if Nylas is configured
export function isNylasConfigured(): boolean {
  return !!(
    process.env.NYLAS_API_KEY &&
    process.env.NYLAS_CLIENT_ID &&
    process.env.NYLAS_CLIENT_SECRET
  );
}

// Initialize Nylas client (lazy initialization to handle missing env vars)
let _nylas: Nylas | null = null;

export function getNylasClient(): Nylas | null {
  if (!isNylasConfigured()) {
    return null;
  }
  if (!_nylas) {
    _nylas = new Nylas({
      apiKey: process.env.NYLAS_API_KEY!,
      apiUri: process.env.NYLAS_API_URI || 'https://api.us.nylas.com',
    });
  }
  return _nylas;
}

// Legacy export for backward compatibility (throws if not configured)
export const nylas = new Proxy({} as Nylas, {
  get(_, prop) {
    const client = getNylasClient();
    if (!client) {
      // Return a no-op for common methods to fail gracefully
      if (prop === 'calendars' || prop === 'events') {
        return {
          list: async () => ({ data: [] }),
          create: async () => ({ data: null }),
          update: async () => ({ data: null }),
          destroy: async () => ({}),
        };
      }
      throw new Error('Nylas is not configured. Set NYLAS_API_KEY, NYLAS_CLIENT_ID, and NYLAS_CLIENT_SECRET.');
    }
    return (client as any)[prop];
  },
});

// Configuration for OAuth flows
export const nylasConfig = {
  clientId: process.env.NYLAS_CLIENT_ID || '',
  clientSecret: process.env.NYLAS_CLIENT_SECRET || '',
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/auth/nylas/callback`,
};

// Provider display names
export const CALENDAR_PROVIDERS = {
  google: {
    name: 'Google Calendar',
    icon: 'google',
  },
  icloud: {
    name: 'Apple iCloud',
    icon: 'apple',
  },
  microsoft: {
    name: 'Outlook / Microsoft 365',
    icon: 'microsoft',
  },
} as const;

export type NylasProvider = keyof typeof CALENDAR_PROVIDERS;
