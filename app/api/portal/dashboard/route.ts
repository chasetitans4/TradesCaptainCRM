import { NextResponse } from 'next/server';
import { requirePortalSession } from '@/lib/portal/session';
import { getCustomerDashboardSummary } from '@/lib/portal/data';
import { apiLogger } from '@/lib/logger';

// GET /api/portal/dashboard - Get customer dashboard data
export async function GET() {
  try {
    const session = await requirePortalSession();

    const summary = await getCustomerDashboardSummary(session.customerId);

    return NextResponse.json({
      customer: {
        name: session.customerName,
        email: session.email,
      },
      business: {
        name: session.businessName,
      },
      ...summary,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Portal authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    apiLogger.error({ error, context: 'Portal dashboard error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
