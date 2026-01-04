// =====================================================
// NYLAS OAUTH - CALLBACK HANDLER
// GET /api/auth/nylas/callback
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForGrant, listCalendars } from '@/lib/nylas';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/crypto';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const userId = request.nextUrl.searchParams.get('state');
  const errorParam = request.nextUrl.searchParams.get('error');

  // Handle OAuth errors from Nylas
  if (errorParam) {
    apiLogger.error({ msg: 'Nylas OAuth error', error: errorParam });
    return NextResponse.redirect(
      new URL('/settings/calendar?error=oauth_denied', request.url)
    );
  }

  if (!code || !userId) {
    return NextResponse.redirect(
      new URL('/settings/calendar?error=missing_params', request.url)
    );
  }

  try {
    const supabase = await createServerSupabaseClient();

    // SECURITY: Verify the logged-in user matches the state parameter
    // This prevents attackers from using their OAuth code to hijack another user's account
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      apiLogger.error({ msg: 'Nylas callback: No authenticated user', error: 'No authenticated user' });
      return NextResponse.redirect(
        new URL('/settings/calendar?error=unauthorized', request.url)
      );
    }

    // Get the user's profile to verify against state
    const { data: profile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile || profile.id !== userId) {
      apiLogger.error({ msg: 'Nylas callback: State mismatch - possible CSRF attack', error: 'State mismatch' });
      return NextResponse.redirect(
        new URL('/settings/calendar?error=state_mismatch', request.url)
      );
    }

    // Exchange authorization code for Nylas grant
    const { grantId, email, provider } = await exchangeCodeForGrant(code);

    // Get the user's calendars to find the primary one
    const calendars = await listCalendars(grantId);
    const primaryCalendar =
      calendars.find((c: any) => c.isPrimary) || calendars[0];

    // Encrypt grant ID before storage (grants calendar access)
    const encryptedGrantId = encrypt(grantId);

    // Save connection to database with encrypted grant ID
    const { error: upsertError } = await supabase
      .from('calendar_connections')
      .upsert(
        {
          user_id: userId,
          nylas_grant_id: encryptedGrantId,
          provider,
          email,
          calendar_id: primaryCalendar?.id || null,
          sync_enabled: true,
          last_sync_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      );

    if (upsertError) {
      apiLogger.error({ msg: 'Error saving calendar connection', error: upsertError.message || 'Unknown error' });
      return NextResponse.redirect(
        new URL('/settings/calendar?error=database_error', request.url)
      );
    }

    return NextResponse.redirect(
      new URL('/settings/calendar?success=connected', request.url)
    );
  } catch (error) {
    apiLogger.error({ msg: 'Nylas OAuth callback error', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.redirect(
      new URL('/settings/calendar?error=oauth_failed', request.url)
    );
  }
}
