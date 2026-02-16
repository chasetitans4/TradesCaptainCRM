// =====================================================
// CUSTOMER CLEANUP CRON JOB
// This endpoint is called by a scheduled task to clean up data
// Currently a no-op since we use hard deletes instead of soft deletes
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { cleanupLogger } from '@/lib/logger';
import { verifyCronAuth } from '@/lib/auth/cron-guard';

export async function GET(request: NextRequest) {
  // Strict cron auth — fail-closed in all environments
  const authError = verifyCronAuth(request);
  if (authError) return authError;

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
