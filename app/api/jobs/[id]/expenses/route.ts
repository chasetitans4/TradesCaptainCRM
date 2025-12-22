// =====================================================
// JOB EXPENSES API
// GET /api/jobs/:id/expenses - Get expenses for a job
// POST /api/jobs/:id/expenses - Create expense linked to job
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getJobExpenses, createExpense } from '@/lib/expenses';
import { parseISO } from 'date-fns';

export async function GET(
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
      .select('id, business_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify job belongs to business
    const { data: job } = await supabase
      .from('jobs')
      .select('id, customer_id')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const result = await getJobExpenses(id);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in GET /api/jobs/[id]/expenses:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get job expenses' },
      { status: 500 }
    );
  }
}

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
      .select('id, business_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify job belongs to business and get customer
    const { data: job } = await supabase
      .from('jobs')
      .select('id, customer_id')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      category_id,
      date,
      vendor,
      description,
      amount,
      tax_amount,
      payment_method,
      is_billable,
      is_reimbursable,
      notes,
      receipt_url,
    } = body;

    // Validate required fields
    if (!category_id || !description || !amount) {
      return NextResponse.json(
        { error: 'Category, description, and amount are required' },
        { status: 400 }
      );
    }

    const expense = await createExpense(profile.business_id, profile.id, {
      categoryId: category_id,
      date: date ? parseISO(date) : new Date(),
      vendor,
      description,
      amount,
      taxAmount: tax_amount,
      paymentMethod: payment_method,
      jobId: id,
      customerId: job.customer_id,
      isBillable: is_billable,
      isReimbursable: is_reimbursable,
      notes,
      receiptUrl: receipt_url,
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/jobs/[id]/expenses:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create expense' },
      { status: 400 }
    );
  }
}
