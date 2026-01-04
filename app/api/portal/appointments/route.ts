import { NextRequest, NextResponse } from 'next/server';
import { requirePortalSession } from '@/lib/portal/session';
import { getCustomerAppointments, getCustomerJobHistory } from '@/lib/portal/data';
import { apiLogger } from '@/lib/logger';

// GET /api/portal/appointments - Get customer appointments
export async function GET(request: NextRequest) {
  try {
    const session = await requirePortalSession();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'upcoming';
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (type === 'upcoming') {
      const appointments = await getCustomerAppointments(session.customerId);
      return NextResponse.json({ appointments });
    }

    // Get job history
    const result = await getCustomerJobHistory(session.customerId, { limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Portal authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    apiLogger.error({ error, context: 'Portal appointments error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
