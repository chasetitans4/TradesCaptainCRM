// =====================================================
// BULK APPROVE EXPENSES API
// POST /api/expenses/bulk-approve - Approve multiple expenses
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { bulkApproveExpenses } from '@/lib/expenses';
import { getServerSession } from '@/lib/permissions/check-permission';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Determine correct Supabase client
    let supabase;
    if (session.user.role === 'admin' || session.user.role === 'super_admin') {
      supabase = createAdminClient();
    } else {
      supabase = await createClient();
    }

    // Only admins/owners can bulk approve
    if (session.user.role === 'technician') {
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
      .eq('business_id', session.user.businessId)
      .in('id', expense_ids);

    if (!expenses || expenses.length !== expense_ids.length) {
      return NextResponse.json(
        { error: 'Some expenses not found or do not belong to your business' },
        { status: 400 }
      );
    }

    const result = await bulkApproveExpenses(expense_ids, session.user.id);

    return NextResponse.json({
      success: true,
      approved: result.count,
    });
  } catch (error) {
    apiLogger.error({ error, route: 'POST /api/expenses/bulk-approve' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to bulk approve expenses' },
      { status: 400 }
    );
  }
}
