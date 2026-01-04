// =====================================================
// QUICKBOOKS API
// GET /api/quickbooks - Get connection info and sync status
// DELETE /api/quickbooks - Disconnect QuickBooks
// =====================================================

import { NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { getQuickBooksConnectionInfo, disconnectQuickBooks } from '@/lib/quickbooks/client';
import { getSyncStatus } from '@/lib/quickbooks/sync';
import { apiLogger } from '@/lib/logger';

export async function GET() {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owner and admin can view QuickBooks info
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const connectionInfo = await getQuickBooksConnectionInfo(profile.business_id);

    if (!connectionInfo?.connected) {
      return NextResponse.json({ connected: false });
    }

    // Get sync status
    const syncStatus = await getSyncStatus(profile.business_id);

    return NextResponse.json({
      ...connectionInfo,
      syncStatus,
    });
  } catch (error) {
    apiLogger.error({ error, context: 'Error fetching QuickBooks info' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch QuickBooks info' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const profile = await getServerUserProfile();

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owner can disconnect
    if (profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only the business owner can disconnect QuickBooks' },
        { status: 403 }
      );
    }

    await disconnectQuickBooks(profile.business_id);

    return NextResponse.json({
      success: true,
      message: 'QuickBooks disconnected successfully',
    });
  } catch (error) {
    apiLogger.error({ error, context: 'Error disconnecting QuickBooks' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to disconnect QuickBooks' },
      { status: 500 }
    );
  }
}
