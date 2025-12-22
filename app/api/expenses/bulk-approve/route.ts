// =====================================================
// BULK APPROVE EXPENSES API
// POST /api/expenses/bulk-approve - Approve multiple expenses
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { bulkApproveExpenses } from '@/lib/expenses';

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

    // Only admins/owners can bulk approve
    if (profile.role === 'technician') {
      return NextResponse.json(
        { error: 'Only administrators can approve expenses' },
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

    // Verify all expenses belong to this business
    const { data: expenses } = await supabase
      .from('expenses')
      .select('id')
      .eq('business_id', profile.business_id)
      .in('id', expense_ids);

    if (!expenses || expenses.length !== expense_ids.length) {
      return NextResponse.json(
        { error: 'Some expenses not found or do not belong to your business' },
        { status: 400 }
      );
    }

    const result = await bulkApproveExpenses(expense_ids, profile.id);

    return NextResponse.json({
      success: true,
      approved: result.count,
    });
  } catch (error: any) {
    console.error('Error in POST /api/expenses/bulk-approve:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to bulk approve expenses' },
      { status: 400 }
    );
  }
}
