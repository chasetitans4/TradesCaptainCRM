// =====================================================
// MEDIA CLEANUP CRON JOB
// GET /api/cron/media-cleanup
// Runs daily to delete expired customer media
// Protected by CRON_SECRET
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { runMediaCleanup } from '@/lib/jobs/media-cleanup';
import { apiLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      apiLogger.error({ msg: 'CRON_SECRET not configured' });
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
