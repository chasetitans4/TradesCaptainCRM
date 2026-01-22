// =====================================================
// REJECT EXPENSE API
// POST /api/expenses/:id/reject - Reject expense
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getExpense, rejectExpense } from '@/lib/expenses';
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

    // Only admins/owners can reject
    if (session.user.role === 'technician') {
      return NextResponse.json(
        { error: 'Only administrators can reject expenses' },
        { status: 403 }
      );
    }

    const expense = await getExpense(id, supabase);

    if (!expense || expense.business_id !== session.user.businessId) {
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

    const updatedExpense = await rejectExpense(id, session.user.id, reason);

    return NextResponse.json({ expense: updatedExpense });
  } catch (error) {
    apiLogger.error({ message: 'Error in POST /api/expenses/[id]/reject', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reject expense' },
      { status: 400 }
    );
  }
}
