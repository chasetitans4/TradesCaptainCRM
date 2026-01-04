// =====================================================
// REJECT EXPENSE API
// POST /api/expenses/:id/reject - Reject expense
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getExpense, rejectExpense } from '@/lib/expenses';
import { apiLogger } from '@/lib/logger';

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

    // Only admins/owners can reject
    if (profile.role === 'technician') {
      return NextResponse.json(
        { error: 'Only administrators can reject expenses' },
        { status: 403 }
      );
    }

    const expense = await getExpense(id);

    if (!expense || expense.business_id !== profile.business_id) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    if (expense.status === 'rejected') {
      return NextResponse.json(
        { error: 'Expense is already rejected' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || '';

    const updatedExpense = await rejectExpense(id, profile.id, reason);

    return NextResponse.json({ expense: updatedExpense });
  } catch (error) {
    apiLogger.error({ message: 'Error in POST /api/expenses/[id]/reject', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reject expense' },
      { status: 400 }
    );
  }
}
