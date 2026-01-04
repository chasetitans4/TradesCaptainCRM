// =====================================================
// RECURRING INVOICES API
// POST /api/invoices/recurring - Generate recurring invoices
// GET /api/invoices/recurring - Get upcoming recurring invoices
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import {
  generateRecurringInvoices,
  getUpcomingRecurringInvoices,
} from '@/lib/invoices/recurring';
import { apiLogger } from '@/lib/logger';

// Verify cron secret for automated calls
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // SECURITY: Require CRON_SECRET to be configured - deny access if not set
  if (!cronSecret) {
    apiLogger.error({ message: 'CRON_SECRET not configured - denying cron access' });
    return false;
  }
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest) {
  try {
    // Check if this is a cron call or authenticated user
    const isCronCall = verifyCronSecret(request);
    const profile = await getServerUserProfile();

    if (!isCronCall && !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owner and admin can manually trigger
    if (profile && !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { daysAhead = 0 } = body;

    // If authenticated user, only process their business
    const businessId = profile?.business_id;

    const result = await generateRecurringInvoices({
      businessId,
      daysAhead,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    apiLogger.error({ message: 'Error generating recurring invoices', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate invoices' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '3', 10);

    const upcoming = await getUpcomingRecurringInvoices(
      profile.business_id,
      months
    );

    return NextResponse.json({ upcoming });
  } catch (error) {
    apiLogger.error({ message: 'Error fetching recurring invoices', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch upcoming invoices' },
      { status: 500 }
    );
  }
}
