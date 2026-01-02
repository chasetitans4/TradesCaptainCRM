import { NextResponse } from 'next/server';
import { getPendingAdminCalls } from '@/lib/outreach/scheduling';

/**
 * GET /api/outreach/calls/pending-admin
 * Get calls pending admin approval
 */
export async function GET() {
  try {
    const calls = await getPendingAdminCalls();

    return NextResponse.json({
      data: calls,
      total: calls.length,
    });
  } catch (error) {
    console.error('Error getting pending admin calls:', error);
    return NextResponse.json(
      { error: 'Failed to get pending calls' },
      { status: 500 }
    );
  }
}
