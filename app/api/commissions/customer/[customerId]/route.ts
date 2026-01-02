// =====================================================
// CUSTOMER COMMISSION DETAIL API
// GET /api/commissions/customer/:customerId
// Get detailed commission history for a customer
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAgentOrHigher } from '@/lib/admin/auth';
import { getCustomerCommissionDetail } from '@/lib/admin/commission-tracker';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const admin = await requireAgentOrHigher();

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customerId } = await params;

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }

    const detail = await getCustomerCommissionDetail(admin.id, customerId);

    if (!detail) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error: any) {
    console.error('Error in GET /api/commissions/customer/:customerId:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get customer commission detail' },
      { status: 500 }
    );
  }
}
