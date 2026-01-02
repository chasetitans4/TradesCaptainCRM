import { NextRequest, NextResponse } from 'next/server';
import { processScheduledFollowUps } from '@/lib/followup/engine';

// POST /api/followup/process - Process scheduled follow-ups
// This endpoint should be called by a cron job (e.g., every 5 minutes)
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await processScheduledFollowUps();

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error processing follow-ups:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/followup/process - Health check for cron job
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Follow-up processor is ready',
  });
}
