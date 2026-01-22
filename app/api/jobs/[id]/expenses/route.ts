// =====================================================
// JOB EXPENSES API
// GET /api/jobs/:id/expenses - Get expenses for a job
// POST /api/jobs/:id/expenses - Create expense linked to job
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getJobExpenses, createExpense } from '@/lib/expenses';
import { parseISO } from 'date-fns';
import { apiLogger } from '@/lib/logger';
import { getServerSession } from '@/lib/permissions/check-permission';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const businessId = session.user.businessId;

    // Verify job belongs to business
    // Admins can see any job if they have businessId context, or we rely on the job query
    // Since getJobExpenses uses the client, if we use admin client, it might bypass RLS.
    // We should probably check if the job exists first.
    
    // Note: session.user.businessId for admins might be the overridden one if we set it correctly in getServerSession.
    // But getServerSession returns the user's native businessId usually, unless we use checkPermission with override logic.
    // However, in this route, we haven't implemented explicit businessId override via query param yet.
    // Let's rely on RLS/Admin access for now.

    const { data: job } = await supabase
      .from('jobs')
      .select('id, customer_id, business_id')
      .eq('id', id)
      .single();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check business access
    if (session.user.role !== 'admin' && session.user.role !== 'super_admin') {
        if (job.business_id !== businessId) {
             return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    const result = await getJobExpenses(id, supabase);

    return NextResponse.json(result);
  } catch (error) {
    apiLogger.error({
      message: 'Error in GET /api/jobs/[id]/expenses',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get job expenses' },
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
    
    // Verify job belongs to business and get customer
    const { data: job } = await supabase
      .from('jobs')
      .select('id, customer_id, business_id')
      .eq('id', id)
      .single();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Check business access
    if (session.user.role !== 'admin' && session.user.role !== 'super_admin') {
        if (job.business_id !== session.user.businessId) {
             return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    const body = await request.json();

    // Required fields
    if (!body.categoryId || !body.description || !body.amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const expense = await createExpense(
      job.business_id, // Use job's business ID
      session.user.id,
      {
        categoryId: body.categoryId,
        date: body.date ? parseISO(body.date) : new Date(),
        vendor: body.vendor,
        description: body.description,
        amount: parseFloat(body.amount),
        taxAmount: body.taxAmount ? parseFloat(body.taxAmount) : 0,
        paymentMethod: body.paymentMethod,
        cardLastFour: body.cardLastFour,
        jobId: id,
        customerId: job.customer_id,
        isBillable: body.isBillable,
        isReimbursable: body.isReimbursable,
        notes: body.notes,
        receiptUrl: body.receiptUrl,
        ocrData: body.ocrData,
      },
      supabase
    );

    return NextResponse.json({ expense });
  } catch (error) {
    apiLogger.error({
      message: 'Error in POST /api/jobs/[id]/expenses',
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create expense' },
      { status: 500 }
    );
  }
}
