import { NextRequest, NextResponse } from 'next/server';
import { getAvailableCallSlots } from '@/lib/outreach/scheduling';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { apiLogger } from '@/lib/logger';

/**
 * GET /api/outreach/availability
 * Get available call slots for scheduling
 */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAgentOrHigher();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
    const timezone = searchParams.get('timezone') || undefined;
    const agentId = searchParams.get('agent_id') || undefined;

    const result = await getAvailableCallSlots(timezone, agentId);

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({ message: 'Error getting availability', error });
    return NextResponse.json(
      { error: 'Failed to get availability' },
      { status: 500 }
    );
  }
}
