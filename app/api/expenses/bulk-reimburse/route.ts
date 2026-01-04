// =====================================================
// BULK REIMBURSE EXPENSES API
// POST /api/expenses/bulk-reimburse - Mark multiple expenses as reimbursed
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { bulkMarkReimbursed } from '@/lib/expenses';

export async function POST(request: NextRequest) {
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

    // Only admins/owners can mark reimbursed
    if (profile.role === 'technician') {
      return NextResponse.json(
        { error: 'Only administrators can mark expenses as reimbursed' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { expense_ids } = body;

    if (!expense_ids || !Array.isArray(expense_ids) || expense_ids.length === 0) {
      return NextResponse.json(
        { error: 'expense_ids array is required' },
        { status: 400 }
      );
    }

    // Verify all expenses belong to this business and are reimbursable
    const { data: expenses } = await supabase
      .from('expenses')
      .select('id')
      .eq('business_id', profile.business_id)
      .eq('is_reimbursable', true)
      .eq('is_reimbursed', false)
      .in('id', expense_ids);

    if (!expenses || expenses.length !== expense_ids.length) {
      return NextResponse.json(
        { error: 'Some expenses not found, not reimbursable, or already reimbursed' },
        { status: 400 }
      );
    }

    const result = await bulkMarkReimbursed(expense_ids);

    return NextResponse.json({
      success: true,
      reimbursed: result.count,
    });
  } catch (error) {
    apiLogger.error({ error, route: 'POST /api/expenses/bulk-reimburse' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to bulk reimburse expenses' },
      { status: 400 }
    );
  }
}
