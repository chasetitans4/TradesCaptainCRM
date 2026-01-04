// =====================================================
// APPROVE EXPENSE API
// POST /api/expenses/:id/approve - Approve expense
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getExpense, approveExpense } from '@/lib/expenses';
import { apiLogger } from '@/lib/logger';

export async function POST(
  _request: NextRequest,
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

    // Only admins/owners can approve
    if (profile.role === 'technician') {
      return NextResponse.json(
        { error: 'Only administrators can approve expenses' },
        { status: 403 }
      );
    }

    const expense = await getExpense(id);

    if (!expense || expense.business_id !== profile.business_id) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    if (expense.status === 'approved') {
      return NextResponse.json(
        { error: 'Expense is already approved' },
        { status: 400 }
      );
    }

    const updatedExpense = await approveExpense(id, profile.id);

    return NextResponse.json({ expense: updatedExpense });
  } catch (error) {
    apiLogger.error({ message: 'Error in POST /api/expenses/[id]/approve', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve expense' },
      { status: 400 }
    );
  }
}
