// =====================================================
// MARK REIMBURSED API
// POST /api/expenses/:id/mark-reimbursed - Mark expense as reimbursed
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getExpense, markReimbursed } from '@/lib/expenses';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const expense = await getExpense(id);

    if (!expense || expense.business_id !== profile.business_id) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    if (!expense.is_reimbursable) {
      return NextResponse.json(
        { error: 'Expense is not marked as reimbursable' },
        { status: 400 }
      );
    }

    if (expense.is_reimbursed) {
      return NextResponse.json(
        { error: 'Expense is already reimbursed' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const amount = body.amount; // Optional: custom reimbursement amount

    const updatedExpense = await markReimbursed(id, amount);

    return NextResponse.json({ expense: updatedExpense });
  } catch (error: any) {
    console.error('Error in POST /api/expenses/[id]/mark-reimbursed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to mark expense as reimbursed' },
      { status: 400 }
    );
  }
}
