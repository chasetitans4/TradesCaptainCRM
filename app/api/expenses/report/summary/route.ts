// =====================================================
// EXPENSE SUMMARY REPORT API
// GET /api/expenses/report/summary - Get expense summary
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { getExpenseSummary } from '@/lib/expenses';
import { parseISO, startOfMonth, endOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('id, business_id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const userId = searchParams.get('user_id');

    // Default to current month
    const start = startDate ? parseISO(startDate) : startOfMonth(new Date());
    const end = endDate ? parseISO(endDate) : endOfMonth(new Date());

    // Technicians can only see their own summary
    const targetUserId = profile.role === 'technician' ? profile.id : userId || undefined;

    const summary = await getExpenseSummary(
      profile.business_id,
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
