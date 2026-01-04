import { NextRequest, NextResponse } from 'next/server';
import { requirePortalSession } from '@/lib/portal/session';
import { getCustomerInvoices } from '@/lib/portal/data';
import { apiLogger } from '@/lib/logger';

// GET /api/portal/invoices - Get customer invoices
export async function GET(request: NextRequest) {
  try {
    const session = await requirePortalSession();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'all' | 'unpaid' | 'paid' | undefined;

    const invoices = await getCustomerInvoices(session.customerId, status);

    return NextResponse.json({ invoices });
  } catch (error) {
    if (error instanceof Error && error.message === 'Portal authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    apiLogger.error({ error, context: 'Portal invoices error' });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
