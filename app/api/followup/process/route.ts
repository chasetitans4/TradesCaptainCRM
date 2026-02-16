import { NextRequest, NextResponse } from 'next/server';
import { processScheduledFollowUps } from '@/lib/followup/engine';
import { apiLogger } from '@/lib/logger';
import { verifyCronAuth } from '@/lib/auth/cron-guard';

// POST /api/followup/process - Process scheduled follow-ups
// This endpoint should be called by a cron job (e.g., every 5 minutes)
export async function POST(request: NextRequest) {
  try {
    // Strict cron auth — fail-closed
    const authError = verifyCronAuth(request);
    if (authError) return authError;

    const result = await processScheduledFollowUps();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    apiLogger.error({ message: 'Error processing follow-ups', error });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to process follow-ups' }, { status: 500 });
  }
}

// GET /api/followup/process - Health check for cron job
export async function GET(request: NextRequest) {
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  return NextResponse.json({
    status: 'ok',
    message: 'Follow-up processor is ready',
  });
}
