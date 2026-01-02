import { NextRequest, NextResponse } from 'next/server';
import { getAvailableCallSlots } from '@/lib/outreach/scheduling';

/**
 * GET /api/outreach/availability
 * Get available call slots for scheduling
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timezone = searchParams.get('timezone') || undefined;
    const agentId = searchParams.get('agent_id') || undefined;

    const result = await getAvailableCallSlots(timezone, agentId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting availability:', error);
    return NextResponse.json(
      { error: 'Failed to get availability' },
      { status: 500 }
    );
  }
}
