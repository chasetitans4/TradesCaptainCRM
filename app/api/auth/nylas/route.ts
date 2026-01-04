// =====================================================
// NYLAS OAUTH - START AUTHORIZATION
// GET /api/auth/nylas?provider=google
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl, type NylasProvider } from '@/lib/nylas';
import { getServerUserProfile } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

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
    apiLogger.error({ msg: 'Error starting Nylas OAuth', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.redirect(
      new URL('/settings/calendar?error=oauth_start_failed', request.url)
    );
  }
}
