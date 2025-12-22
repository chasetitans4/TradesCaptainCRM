// =====================================================
// QUICKBOOKS OAUTH START
// GET /api/auth/quickbooks - Get OAuth authorization URL
// =====================================================

import { NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { getAuthUrl } from '@/lib/quickbooks/client';

export async function GET() {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owner can connect QuickBooks
    if (profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only the business owner can connect QuickBooks' },
        { status: 403 }
      );
    }

    const authUrl = getAuthUrl(profile.business_id);

    return NextResponse.json({ url: authUrl });
  } catch (error: any) {
    console.error('Error generating QuickBooks auth URL:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate authorization URL' },
      { status: 500 }
    );
  }
}
