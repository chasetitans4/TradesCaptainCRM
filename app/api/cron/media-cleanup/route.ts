// =====================================================
// MEDIA CLEANUP CRON JOB
// GET /api/cron/media-cleanup
// Runs daily to delete expired customer media
// Protected by CRON_SECRET
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { runMediaCleanup } from '@/lib/jobs/media-cleanup';
import { apiLogger } from '@/lib/logger';
import { verifyCronAuth } from '@/lib/auth/cron-guard';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
  try {
    // Strict cron auth — fail-closed
    const authError = verifyCronAuth(request);
    if (authError) return authError;

    // Run cleanup
    const result = await runMediaCleanup(100);

    apiLogger.info({
      msg: 'Media cleanup cron completed',
      ...result,
    });

    return NextResponse.json({
      success: result.success,
      imagesDeleted: result.imagesDeleted,
      issueMediaDeleted: result.issueMediaDeleted,
      storageFreedMB: (result.storageFreedBytes / 1024 / 1024).toFixed(2),
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Media cleanup cron failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
