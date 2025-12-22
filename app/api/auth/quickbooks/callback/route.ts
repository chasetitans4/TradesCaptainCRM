// =====================================================
// QUICKBOOKS OAUTH CALLBACK
// GET /api/auth/quickbooks/callback - Handle OAuth callback
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/quickbooks/client';

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
