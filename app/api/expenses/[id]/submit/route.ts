// =====================================================
// SUBMIT EXPENSE API
// POST /api/expenses/:id/submit - Submit expense for approval
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getExpense, submitExpense } from '@/lib/expenses';
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
      .select('id, business_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const expense = await getExpense(id);

    if (!expense || expense.business_id !== profile.business_id) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Users can only submit their own expenses
    if (expense.user_id !== profile.id) {
      return NextResponse.json(
        { error: 'You can only submit your own expenses' },
        { status: 403 }
      );
    }

    if (expense.status !== 'pending' && expense.status !== 'rejected') {
      return NextResponse.json(
        { error: 'Can only submit pending or rejected expenses' },
        { status: 400 }
      );
    }

    const updatedExpense = await submitExpense(id);

    return NextResponse.json({ expense: updatedExpense });
  } catch (error) {
    apiLogger.error({ message: 'Error in POST /api/expenses/[id]/submit', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit expense' },
      { status: 400 }
    );
  }
}
