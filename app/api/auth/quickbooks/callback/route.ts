// =====================================================
// QUICKBOOKS OAUTH CALLBACK
// GET /api/auth/quickbooks/callback - Handle OAuth callback
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/quickbooks/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get('code');
  const state = searchParams.get('state'); // businessId
  const realmId = searchParams.get('realmId');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    apiLogger.error({ msg: 'QuickBooks OAuth error', error });
    return NextResponse.redirect(
      new URL('/settings/integrations?error=quickbooks_denied', request.url)
    );
  }

  if (!code || !state || !realmId) {
    return NextResponse.redirect(
      new URL('/settings/integrations?error=missing_params', request.url)
    );
  }

  try {
    const supabase = await createServerSupabaseClient();

    // SECURITY: Verify the logged-in user is an owner of the business in the state parameter
    // This prevents attackers from connecting their QuickBooks to another business
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      apiLogger.error({ msg: 'QuickBooks callback: No authenticated user', error: 'No authenticated user' });
      return NextResponse.redirect(
        new URL('/settings/integrations?error=unauthorized', request.url)
      );
    }

    // Get the user's profile and verify they're an owner of the business
    const { data: profile } = await supabase
      .from('users')
      .select('business_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile || profile.business_id !== state) {
      apiLogger.error({ msg: 'QuickBooks callback: Business mismatch - possible CSRF attack', error: 'Business mismatch' });
      return NextResponse.redirect(
        new URL('/settings/integrations?error=state_mismatch', request.url)
      );
    }

    // Only owners can connect QuickBooks (financial integration)
    if (profile.role !== 'owner') {
      apiLogger.error({ msg: 'QuickBooks callback: Non-owner attempted to connect', error: 'Permission denied' });
      return NextResponse.redirect(
        new URL('/settings/integrations?error=permission_denied', request.url)
      );
    }

    await exchangeCodeForTokens(code, realmId, state);

    return NextResponse.redirect(
      new URL('/settings/integrations?success=quickbooks_connected', request.url)
    );
  } catch (error) {
    apiLogger.error({ msg: 'QuickBooks token exchange error', error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.redirect(
      new URL('/settings/integrations?error=quickbooks_failed', request.url)
    );
  }
}
