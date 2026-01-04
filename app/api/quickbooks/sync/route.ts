// =====================================================
// QUICKBOOKS SYNC API
// POST /api/quickbooks/sync - Trigger sync to QuickBooks
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { syncAllToQuickBooks } from '@/lib/quickbooks/sync';
import { apiLogger } from '@/lib/logger';

export async function POST(_request: NextRequest) {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owner and admin can sync
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const results = await syncAllToQuickBooks(profile.business_id);

    return NextResponse.json({
      success: true,
      results,
      message: `Synced ${results.customers} customers, ${results.invoices} invoices, ${results.payments} payments, ${results.expenses} expenses`,
    });
  } catch (error) {
    apiLogger.error({ error, context: 'Error syncing to QuickBooks' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync to QuickBooks' },
      { status: 500 }
    );
  }
}
