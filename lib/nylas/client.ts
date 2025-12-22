// =====================================================
// NYLAS CLIENT SETUP
// =====================================================

import Nylas from 'nylas';

// Initialize Nylas client
export const nylas = new Nylas({
  apiKey: process.env.NYLAS_API_KEY!,
  apiUri: process.env.NYLAS_API_URI || 'https://api.us.nylas.com',
});

// Configuration for OAuth flows
export const nylasConfig = {
  clientId: process.env.NYLAS_CLIENT_ID!,
  clientSecret: process.env.NYLAS_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/nylas/callback`,
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
