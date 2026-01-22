import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { getPendingEstimates, getCustomerEstimates } from '@/lib/portal/estimates';
import { apiLogger } from '@/lib/logger';

// GET /api/portal/estimates - Get customer's estimates
export async function GET(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    let estimates;

    if (status === 'pending') {
      estimates = await getPendingEstimates(session.customerId, session.businessId);
    } else {
      estimates = await getCustomerEstimates(session.customerId, session.businessId, limit);
    }

    return NextResponse.json({ estimates });
  } catch (error) {
    apiLogger.error({
      msg: 'Portal estimates GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to fetch estimates' }, { status: 500 });
  }
}
