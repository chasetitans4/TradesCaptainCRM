import { NextRequest, NextResponse } from 'next/server';
import { requirePortalSession } from '@/lib/portal/session';
import { getCustomerDashboardSummary } from '@/lib/portal/data';

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
  } catch (error: any) {
    if (error.message === 'Portal authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Portal dashboard error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
