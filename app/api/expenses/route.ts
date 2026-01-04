// =====================================================
// EXPENSES API
// GET /api/expenses - List expenses with filters
// POST /api/expenses - Create expense
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { getExpenses, createExpense } from '@/lib/expenses';
import { parseISO } from 'date-fns';

export async function GET(request: NextRequest) {
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

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    const categoryId = searchParams.get('category_id');
    const jobId = searchParams.get('job_id');
    const status = searchParams.get('status');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const isReimbursable = searchParams.get('is_reimbursable');
    const isBillable = searchParams.get('is_billable');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // Technicians can only see their own expenses
    const filters: Record<string, any> = {};
    if (profile.role === 'technician') {
      filters.userId = profile.id;
    } else if (userId) {
      filters.userId = userId;
    }

    if (categoryId) filters.categoryId = categoryId;
    if (jobId) filters.jobId = jobId;
    if (status) filters.status = status;
    if (startDate) filters.startDate = parseISO(startDate);
    if (endDate) filters.endDate = parseISO(endDate);
    if (isReimbursable !== null) filters.isReimbursable = isReimbursable === 'true';
    if (isBillable !== null) filters.isBillable = isBillable === 'true';

    const { expenses, total } = await getExpenses(
      profile.business_id,
      filters,
      page,
      limit
    );

    return NextResponse.json({
      expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    apiLogger.error({ error, route: 'GET /api/expenses' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get expenses' },
      { status: 500 }
    );
  }
}

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
      .select('id, business_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
      card_last_four,
      job_id,
      customer_id,
      vehicle_id,
      is_billable,
      is_reimbursable,
      notes,
      tags,
      receipt_url,
      ocr_data,
    } = body;

    // Validate required fields
    if (!category_id) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }
    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      );
    }
    if (amount === undefined || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid amount is required' },
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
      cardLastFour: card_last_four,
      jobId: job_id,
      customerId: customer_id,
      vehicleId: vehicle_id,
      isBillable: is_billable,
      isReimbursable: is_reimbursable,
      notes,
      tags,
      receiptUrl: receipt_url,
      ocrData: ocr_data,
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    apiLogger.error({ error, route: 'POST /api/expenses' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create expense' },
      { status: 400 }
    );
  }
}
