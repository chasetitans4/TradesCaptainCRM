// =====================================================
// Leads Captain - Conversation Analysis Cron
// Runs every 5 minutes to analyze completed conversations
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { processConversationsForAnalysis } from '@/lib/leads-captain/async-processor';
import { jobLogger } from '@/lib/logger';
import { verifyCronAuth } from '@/lib/auth/cron-guard';

// Vercel cron configuration
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 second timeout

/**
 * GET /api/cron/leads-captain/conversation-analysis
 *
 * This endpoint is called by Vercel Cron every 5 minutes.
 * It processes conversations that have been closed in the last 10 minutes.
 *
 * Cron configuration (add to vercel.json):
 * crons: [{ path: "/api/cron/leads-captain/conversation-analysis", schedule: "every 5 minutes" }]
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Strict cron auth — fail-closed
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  try {
    jobLogger.info({
      msg: 'Starting conversation analysis cron job',
    });

    // Process conversations closed in the last 10 minutes
    const result = await processConversationsForAnalysis({
      minutesSinceClosed: 10,
      limit: 50, // Process up to 50 conversations per run
    });

    const processingTime = Date.now() - startTime;

    jobLogger.info({
      msg: 'Conversation analysis cron job completed',
      processed: result.processed,
      failed: result.failed,
      skipped: result.skipped,
      processingTimeMs: processingTime,
    });

    return NextResponse.json({
      success: true,
      processed: result.processed,
      failed: result.failed,
      skipped: result.skipped,
      processingTimeMs: processingTime,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    jobLogger.error({
      msg: 'Conversation analysis cron job failed',
      error: error instanceof Error ? error.message : String(error),
      processingTimeMs: processingTime,
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs: processingTime,
    }, { status: 500 });
  }
}

/**
 * POST /api/cron/leads-captain/conversation-analysis
 *
 * Manual trigger for conversation analysis.
 * Useful for testing or processing specific conversations.
 */
export async function POST(request: NextRequest) {
  // Strict cron auth — same guard for manual triggers
  const authError = verifyCronAuth(request);
  if (authError) return authError;

  const startTime = Date.now();

  try {
    const body = await request.json().catch(() => ({}));

    const {
      minutesSinceClosed = 60, // Default to last hour for manual runs
      limit = 100,
      configId,
    } = body;

    jobLogger.info({
      msg: 'Starting manual conversation analysis',
      minutesSinceClosed,
      limit,
      configId,
    });

    const result = await processConversationsForAnalysis({
      minutesSinceClosed,
      limit,
      configId,
    });

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      processed: result.processed,
      failed: result.failed,
      skipped: result.skipped,
      processingTimeMs: processingTime,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;

    jobLogger.error({
      msg: 'Manual conversation analysis failed',
      error: error instanceof Error ? error.message : String(error),
      processingTimeMs: processingTime,
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs: processingTime,
    }, { status: 500 });
  }
}
