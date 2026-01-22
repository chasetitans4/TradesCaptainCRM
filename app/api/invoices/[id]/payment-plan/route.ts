// =====================================================
// INVOICE PAYMENT PLAN API
// POST /api/invoices/[id]/payment-plan - Create payment plan
// GET /api/invoices/[id]/payment-plan - Get payment plan
// DELETE /api/invoices/[id]/payment-plan - Cancel payment plan
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServerUserProfile } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';

interface PaymentPlanInstallment {
  id: string;
  invoice_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue';
  paid_at?: string;
  created_at: string;
}

interface PaymentPlan {
  id: string;
  invoice_id: string;
  total_amount: number;
  number_of_installments: number;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  start_date: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  installments: PaymentPlanInstallment[];
}

// GET - Get payment plan for invoice
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: invoiceId } = await params;
    const supabase = createAdminClient();

    // Get invoice to verify ownership
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, business_id')
      .eq('id', invoiceId)
      .eq('business_id', profile.business_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Get payment plan
    const { data: plan, error: planError } = await supabase
      .from('payment_plans')
      .select(`
        *,
        installments:payment_plan_installments (*)
      `)
      .eq('invoice_id', invoiceId)
      .single();

    if (planError && planError.code !== 'PGRST116') {
      throw planError;
    }

    return NextResponse.json({ plan: plan || null });
  } catch (error) {
    apiLogger.error({ error, context: 'get payment plan' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get payment plan' },
      { status: 500 }
    );
  }
}

// POST - Create payment plan
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners and admins can create payment plans
    if (profile.role === 'technician') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id: invoiceId } = await params;
    const body = await request.json();
    const { numberOfInstallments, frequency, startDate, downPayment } = body;

    // Validate inputs
    if (!numberOfInstallments || numberOfInstallments < 2 || numberOfInstallments > 12) {
      return NextResponse.json(
        { error: 'Number of installments must be between 2 and 12' },
        { status: 400 }
      );
    }

    if (!['weekly', 'biweekly', 'monthly'].includes(frequency)) {
      return NextResponse.json(
        { error: 'Frequency must be weekly, biweekly, or monthly' },
        { status: 400 }
      );
    }

    if (!startDate) {
      return NextResponse.json({ error: 'Start date is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, business_id, amount_due, total, status')
      .eq('id', invoiceId)
      .eq('business_id', profile.business_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.amount_due <= 0) {
      return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 });
    }

    if (invoice.status === 'void') {
      return NextResponse.json({ error: 'Cannot create payment plan for voided invoice' }, { status: 400 });
    }

    // Check if payment plan already exists
    const { data: existingPlan } = await supabase
      .from('payment_plans')
      .select('id')
      .eq('invoice_id', invoiceId)
      .eq('status', 'active')
      .single();

    if (existingPlan) {
      return NextResponse.json(
        { error: 'Active payment plan already exists for this invoice' },
        { status: 400 }
      );
    }

    // Calculate installment amounts
    const totalAmount = invoice.amount_due;
    const initialDownPayment = downPayment && downPayment > 0 ? Math.min(downPayment, totalAmount * 0.5) : 0;
    const remainingAmount = totalAmount - initialDownPayment;
    const installmentAmount = Math.ceil((remainingAmount / numberOfInstallments) * 100) / 100;

    // Create payment plan
    const { data: plan, error: planError } = await supabase
      .from('payment_plans')
      .insert({
        invoice_id: invoiceId,
        business_id: profile.business_id,
        total_amount: totalAmount,
        down_payment: initialDownPayment,
        number_of_installments: numberOfInstallments,
        frequency,
        start_date: startDate,
        status: 'active',
        created_by: profile.id,
      })
      .select()
      .single();

    if (planError) {
      throw planError;
    }

    // Create installments
    const installments: Partial<PaymentPlanInstallment>[] = [];
    let currentDate = new Date(startDate);

    for (let i = 1; i <= numberOfInstallments; i++) {
      // Calculate this installment's amount (last one gets any remainder)
      let amount = installmentAmount;
      if (i === numberOfInstallments) {
        const paidSoFar = installmentAmount * (numberOfInstallments - 1);
        amount = Math.round((remainingAmount - paidSoFar) * 100) / 100;
      }

      installments.push({
        invoice_id: invoiceId,
        installment_number: i,
        amount,
        due_date: currentDate.toISOString().split('T')[0],
        status: 'pending',
      });

      // Calculate next due date
      if (frequency === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (frequency === 'biweekly') {
        currentDate.setDate(currentDate.getDate() + 14);
      } else {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    // Insert installments
    const { data: createdInstallments, error: installmentsError } = await supabase
      .from('payment_plan_installments')
      .insert(
        installments.map((inst) => ({
          ...inst,
          payment_plan_id: plan.id,
        }))
      )
      .select();

    if (installmentsError) {
      // Clean up the plan if installments fail
      await supabase.from('payment_plans').delete().eq('id', plan.id);
      throw installmentsError;
    }

    // Update invoice to indicate it has a payment plan
    await supabase
      .from('invoices')
      .update({ has_payment_plan: true })
      .eq('id', invoiceId);

    return NextResponse.json({
      plan: {
        ...plan,
        installments: createdInstallments,
      },
    });
  } catch (error) {
    apiLogger.error({ error, context: 'create payment plan' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment plan' },
      { status: 500 }
    );
  }
}

// DELETE - Cancel payment plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (profile.role === 'technician') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { id: invoiceId } = await params;
    const supabase = createAdminClient();

    // Get invoice to verify ownership
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, business_id')
      .eq('id', invoiceId)
      .eq('business_id', profile.business_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Get and cancel active payment plan
    const { data: plan, error: planError } = await supabase
      .from('payment_plans')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('invoice_id', invoiceId)
      .eq('status', 'active')
      .select()
      .single();

    if (planError && planError.code !== 'PGRST116') {
      throw planError;
    }

    if (!plan) {
      return NextResponse.json({ error: 'No active payment plan found' }, { status: 404 });
    }

    // Update invoice
    await supabase
      .from('invoices')
      .update({ has_payment_plan: false })
      .eq('id', invoiceId);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error({ error, context: 'cancel payment plan' });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel payment plan' },
      { status: 500 }
    );
  }
}
