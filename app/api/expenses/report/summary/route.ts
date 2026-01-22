// =====================================================
// EXPENSE SUMMARY REPORT API
// GET /api/expenses/report/summary - Get expense summary
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { getExpenseSummary } from '@/lib/expenses';
import { parseISO, startOfMonth, endOfMonth } from 'date-fns';

import { getServerSession } from '@/lib/permissions/check-permission';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query params (need to do this first to get businessId potentially)
    const searchParamsObj = request.nextUrl.searchParams;
    const startDate = searchParamsObj.get('start_date');
    const endDate = searchParamsObj.get('end_date');
    const userId = searchParamsObj.get('user_id');

    let businessId = session.user.businessId;
    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      const queryBusinessId = searchParamsObj.get('businessId');
      if (queryBusinessId) businessId = queryBusinessId;
    }

    if (!businessId) {
        if (session.user.role === 'admin' || session.user.role === 'super_admin') {
             // Return empty summary or error? Summary function might need businessId.
             // Let's return error for now as summary without business context is ambiguous.
             return NextResponse.json({ error: 'Business ID required' }, { status: 400 });
        }
        return NextResponse.json({ error: 'User business not found' }, { status: 404 });
    }

    // Default to current month
    const start = startDate ? parseISO(startDate) : startOfMonth(new Date());
    const end = endDate ? parseISO(endDate) : endOfMonth(new Date());

    // Technicians can only see their own summary
    const targetUserId = session.user.role === 'technician' ? session.user.id : userId || undefined;

    const summary = await getExpenseSummary(
      businessId,
      start,
      end,
      targetUserId
    );

    return NextResponse.json({ summary });
  } catch (error) {
    apiLogger.error({ error, route: 'GET /api/expenses/report/summary' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get expense summary' },
      { status: 500 }
    );
  }
}
