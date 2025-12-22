// =====================================================
// NYLAS OAUTH - START AUTHORIZATION
// GET /api/auth/nylas?provider=google
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl, type NylasProvider } from '@/lib/nylas';
import { getServerUserProfile } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check if user has Pro tier for calendar access
    if (profile.business?.plan_tier !== 'pro') {
      return NextResponse.redirect(
        new URL('/settings?error=upgrade_required', request.url)
      );
    }

    // Get optional provider from query params
    const provider = request.nextUrl.searchParams.get('provider') as
      | NylasProvider
      | undefined;

    // Generate Nylas OAuth URL with user ID in state
    const authUrl = getAuthUrl(profile.id, provider);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error starting Nylas OAuth:', error);
    return NextResponse.redirect(
      new URL('/settings/calendar?error=oauth_start_failed', request.url)
    );
  }
}
