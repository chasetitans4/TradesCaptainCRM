// =====================================================
// QUICKBOOKS OAUTH CALLBACK
// GET /api/auth/quickbooks/callback - Handle OAuth callback
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/quickbooks/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const code = searchParams.get('code');
  const state = searchParams.get('state'); // businessId
  const realmId = searchParams.get('realmId');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('QuickBooks OAuth error:', error);
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
      console.error('QuickBooks callback: No authenticated user');
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
      console.error('QuickBooks callback: Business mismatch - possible CSRF attack');
      return NextResponse.redirect(
        new URL('/settings/integrations?error=state_mismatch', request.url)
      );
    }

    // Only owners can connect QuickBooks (financial integration)
    if (profile.role !== 'owner') {
      console.error('QuickBooks callback: Non-owner attempted to connect');
      return NextResponse.redirect(
        new URL('/settings/integrations?error=permission_denied', request.url)
      );
    }

    await exchangeCodeForTokens(code, realmId, state);

    return NextResponse.redirect(
      new URL('/settings/integrations?success=quickbooks_connected', request.url)
    );
  } catch (err: any) {
    console.error('QuickBooks token exchange error:', err);
    return NextResponse.redirect(
      new URL('/settings/integrations?error=quickbooks_failed', request.url)
    );
  }
}
