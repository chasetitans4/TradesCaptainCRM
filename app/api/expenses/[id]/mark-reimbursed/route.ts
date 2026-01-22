// =====================================================
// MARK REIMBURSED API
// POST /api/expenses/:id/mark-reimbursed - Mark expense as reimbursed
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getExpense, markReimbursed } from '@/lib/expenses';
import { apiLogger } from '@/lib/logger';
import { getServerSession } from '@/lib/permissions/check-permission';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let supabase;
    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      supabase = createAdminClient();
    } else {
      supabase = await createClient();
    }

    // Only admins/owners can mark reimbursed
    if (session.user.role === 'technician') {
      return NextResponse.json(
        { error: 'Only administrators can mark expenses as reimbursed' },
        { status: 403 }
      );
    }

    const expense = await getExpense(id, supabase);

    if (!expense || expense.business_id !== session.user.businessId) {
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

    const updatedExpense = await markReimbursed(id, amount, supabase);

    return NextResponse.json({ expense: updatedExpense });
  } catch (error) {
    apiLogger.error({ message: 'Error in POST /api/expenses/[id]/mark-reimbursed', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to mark expense as reimbursed' },
      { status: 400 }
    );
  }
}
