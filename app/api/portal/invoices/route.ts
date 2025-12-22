import { NextRequest, NextResponse } from 'next/server';
import { requirePortalSession } from '@/lib/portal/session';
import { getCustomerInvoices } from '@/lib/portal/data';

// GET /api/portal/invoices - Get customer invoices
export async function GET(request: NextRequest) {
  try {
    const session = await requirePortalSession();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as 'all' | 'unpaid' | 'paid' | undefined;

    const invoices = await getCustomerInvoices(session.customerId, status);

    return NextResponse.json({ invoices });
  } catch (error: any) {
    if (error.message === 'Portal authentication required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Portal invoices error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
