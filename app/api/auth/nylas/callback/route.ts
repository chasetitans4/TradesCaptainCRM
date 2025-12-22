// =====================================================
// NYLAS OAUTH - CALLBACK HANDLER
// GET /api/auth/nylas/callback
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForGrant, listCalendars } from '@/lib/nylas';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const userId = request.nextUrl.searchParams.get('state');
  const errorParam = request.nextUrl.searchParams.get('error');

  // Handle OAuth errors from Nylas
  if (errorParam) {
    console.error('Nylas OAuth error:', errorParam);
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
    // Exchange authorization code for Nylas grant
    const { grantId, email, provider } = await exchangeCodeForGrant(code);

    // Get the user's calendars to find the primary one
    const calendars = await listCalendars(grantId);
    const primaryCalendar =
      calendars.find((c: any) => c.isPrimary) || calendars[0];

    // Save connection to database
    const supabase = await createServerSupabaseClient();

    const { error: upsertError } = await supabase
      .from('calendar_connections')
      .upsert(
        {
          user_id: userId,
          nylas_grant_id: grantId,
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
      console.error('Error saving calendar connection:', upsertError);
      return NextResponse.redirect(
        new URL('/settings/calendar?error=database_error', request.url)
      );
    }

    return NextResponse.redirect(
      new URL('/settings/calendar?success=connected', request.url)
    );
  } catch (error) {
    console.error('Nylas OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/settings/calendar?error=oauth_failed', request.url)
    );
  }
}
