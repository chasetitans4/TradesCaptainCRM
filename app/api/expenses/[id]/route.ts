// =====================================================
// SINGLE EXPENSE API
// GET /api/expenses/:id - Get expense details
// PUT /api/expenses/:id - Update expense
// DELETE /api/expenses/:id - Delete expense
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/permissions/check-permission';
import { getExpense, updateExpense, deleteExpense } from '@/lib/expenses';
import { parseISO } from 'date-fns';
import { apiLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Determine business ID
    let businessId = session.user.businessId;
    const queryBusinessId = searchParams.get('businessId');
    
    if ((session.user.role === 'admin' || session.user.role === 'super_admin') && queryBusinessId) {
      businessId = queryBusinessId;
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID not found' }, { status: 404 });
    }

    const expense = await getExpense(id);

    if (!expense || expense.business_id !== businessId) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Technicians can only view their own expenses
    if (session.user.role === 'technician' && expense.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ expense });
  } catch (error) {
    apiLogger.error({ message: 'Error in GET /api/expenses/[id]', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get expense' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Determine business ID
    let businessId = session.user.businessId;
    if ((session.user.role === 'admin' || session.user.role === 'super_admin') && body.businessId) {
      businessId = body.businessId;
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID not found' }, { status: 404 });
    }

    const expense = await getExpense(id);

    if (!expense || expense.business_id !== businessId) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Technicians can only edit their own pending expenses
    if (session.user.role === 'technician') {
      if (expense.user_id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (expense.status !== 'pending' && expense.status !== 'rejected') {
        return NextResponse.json(
          { error: 'Can only edit pending or rejected expenses' },
          { status: 400 }
        );
      }
    }

    const updates: Record<string, any> = {};

    if (body.category_id !== undefined) updates.categoryId = body.category_id;
    if (body.date !== undefined) updates.date = parseISO(body.date);
    if (body.vendor !== undefined) updates.vendor = body.vendor;
    if (body.description !== undefined) updates.description = body.description;
    if (body.amount !== undefined) updates.amount = body.amount;
    if (body.tax_amount !== undefined) updates.taxAmount = body.tax_amount;
    if (body.payment_method !== undefined) updates.paymentMethod = body.payment_method;
    if (body.card_last_four !== undefined) updates.cardLastFour = body.card_last_four;
    if (body.job_id !== undefined) updates.jobId = body.job_id;
    if (body.customer_id !== undefined) updates.customerId = body.customer_id;
    if (body.vehicle_id !== undefined) updates.vehicleId = body.vehicle_id;
    if (body.is_billable !== undefined) updates.isBillable = body.is_billable;
    if (body.is_reimbursable !== undefined) updates.isReimbursable = body.is_reimbursable;
    if (body.notes !== undefined) updates.notes = body.notes;
    if (body.tags !== undefined) updates.tags = body.tags;

    const updatedExpense = await updateExpense(id, updates);

    return NextResponse.json({ expense: updatedExpense });
  } catch (error) {
    apiLogger.error({ message: 'Error in PUT /api/expenses/[id]', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update expense' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Determine business ID
    let businessId = session.user.businessId;
    const queryBusinessId = searchParams.get('businessId');
    
    if ((session.user.role === 'admin' || session.user.role === 'super_admin') && queryBusinessId) {
      businessId = queryBusinessId;
    }

    if (!businessId) {
      return NextResponse.json({ error: 'Business ID not found' }, { status: 404 });
    }

    const expense = await getExpense(id);

    if (!expense || expense.business_id !== businessId) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    // Technicians can only delete their own pending expenses
    if (session.user.role === 'technician') {
      if (expense.user_id !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (expense.status !== 'pending') {
        return NextResponse.json(
          { error: 'Can only delete pending expenses' },
          { status: 400 }
        );
      }
    }

    await deleteExpense(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ message: 'Error in DELETE /api/expenses/[id]', error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete expense' },
      { status: 400 }
    );
  }
}
