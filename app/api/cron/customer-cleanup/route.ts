// =====================================================
// CUSTOMER CLEANUP CRON JOB
// This endpoint is called by a scheduled task to clean up data
// Currently a no-op since we use hard deletes instead of soft deletes
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { cleanupLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  // Check for authorized header (cron secret)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // In production, strictly enforce this
    if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // Note: Since we now use hard deletes for customers (no deleted_at column),
    // this cleanup job is a no-op. It's kept for future use if soft-delete is enabled.
    cleanupLogger.info({
      msg: 'Customer cleanup skipped - using hard deletes',
    });

    return NextResponse.json({
      success: true,
      results: {
        customersDeleted: 0,
        message: 'Cleanup skipped - hard delete is enabled, no soft-deleted customers to clean up',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    cleanupLogger.error({
      msg: 'Cleanup failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Cleanup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
