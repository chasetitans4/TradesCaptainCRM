import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import {
  generateInvoiceNumber,
  generateAccessToken,
  generatePaymentLinkForInvoice,
  sendInvoiceViaSms,
  sendInvoiceViaEmail,
} from '@/lib/invoices';
import { logger } from '@/lib/logger';

const technicianLogger = logger.child({ context: 'technician.quick-invoice' });

/**
 * POST /api/technician/quick-invoice
 * Quick invoice creation from Technician Mode
 * Creates invoice, optionally sends SMS/email to customer
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUserProfile();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { jobId, amount, description, lineItems, sendImmediately = true } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    if (!amount && (!lineItems || lineItems.length === 0)) {
      return NextResponse.json(
        { error: 'Amount or line items required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        customer:customers (id, name, email, phone),
        business:businesses (
          id,
          name,
          invoice_due_days,
          invoice_terms,
          default_tax_rate
        )
      `)
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Handle relation data (can be array from Supabase)
    const business = Array.isArray(job.business) ? job.business[0] : job.business;

    // Verify technician is assigned
    if (job.assigned_user_id !== user.id && user.role === 'technician') {
      return NextResponse.json(
        { error: 'You are not assigned to this job' },
        { status: 403 }
      );
    }

    // Check if invoice already exists for this job
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .eq('job_id', jobId)
      .maybeSingle();

    if (existingInvoice) {
      return NextResponse.json(
        {
          error: 'Invoice already exists for this job',
          invoiceId: existingInvoice.id,
          invoiceNumber: existingInvoice.invoice_number,
        },
        { status: 409 }
      );
    }

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(job.business_id);

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (business?.invoice_due_days || 30));

    // Calculate totals
    let subtotal = 0;
    let taxableAmount = 0;

    if (lineItems && lineItems.length > 0) {
      for (const item of lineItems) {
        const itemTotal = (item.quantity || 1) * item.unit_price;
        subtotal += itemTotal;
        if (item.is_taxable !== false) {
          taxableAmount += itemTotal;
        }
      }
    } else {
      subtotal = amount;
      taxableAmount = amount;
    }

    const taxRate = business?.default_tax_rate || 0;
    const taxAmount = taxableAmount * (taxRate / 100);
    const total = subtotal + taxAmount;

    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        business_id: job.business_id,
        customer_id: job.customer_id,
        job_id: jobId,
        invoice_number: invoiceNumber,
        status: sendImmediately ? 'sent' : 'draft',
        subtotal: Math.round(subtotal * 100) / 100,
        tax_rate: taxRate,
        tax_amount: Math.round(taxAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
        amount_due: Math.round(total * 100) / 100,
        terms: business?.invoice_terms,
        due_date: dueDate.toISOString().split('T')[0],
        access_token: generateAccessToken(),
        created_by: user.id,
        notes: description,
        sent_at: sendImmediately ? new Date().toISOString() : null,
      })
      .select('id, invoice_number, access_token')
      .single();

    if (invoiceError || !invoice) {
      technicianLogger.error({
        msg: 'Failed to create invoice',
        error: invoiceError?.message,
        jobId,
      });
      return NextResponse.json(
        { error: 'Failed to create invoice' },
        { status: 500 }
      );
    }

    // Create line items if provided
    if (lineItems && lineItems.length > 0) {
      const invoiceItems = lineItems.map(
        (item: {
          name: string;
          description?: string;
          quantity?: number;
          unit_price: number;
          is_taxable?: boolean;
        }, index: number) => ({
          invoice_id: invoice.id,
          name: item.name,
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: item.unit_price,
          total: (item.quantity || 1) * item.unit_price,
          is_taxable: item.is_taxable !== false,
          sort_order: index,
        })
      );

      await supabase.from('invoice_items').insert(invoiceItems);
    } else {
      // Create a single line item for the amount
      await supabase.from('invoice_items').insert({
        invoice_id: invoice.id,
        name: job.title || 'Service',
        description: description || job.description,
        quantity: 1,
        unit_price: amount,
        total: amount,
        is_taxable: true,
        sort_order: 0,
      });
    }

    // Link invoice to job
    await supabase.from('jobs').update({ invoice_id: invoice.id }).eq('id', jobId);

    // Generate payment link
    let paymentLink: string | undefined;
    try {
      paymentLink = await generatePaymentLinkForInvoice(invoice.id);
      await supabase
        .from('invoices')
        .update({ payment_link: paymentLink })
        .eq('id', invoice.id);
    } catch (linkError) {
      technicianLogger.warn({
        msg: 'Failed to generate payment link',
        invoiceId: invoice.id,
        error: linkError instanceof Error ? linkError.message : String(linkError),
      });
    }

    // Send invoice if requested
    let smsSent = false;
    let emailSent = false;

    if (sendImmediately) {
      // Send via SMS
      try {
        await sendInvoiceViaSms(invoice.id);
        smsSent = true;
      } catch (smsError) {
        technicianLogger.warn({
          msg: 'Failed to send invoice SMS',
          invoiceId: invoice.id,
          error: smsError instanceof Error ? smsError.message : String(smsError),
        });
      }

      // Send via email
      try {
        await sendInvoiceViaEmail(invoice.id);
        emailSent = true;
      } catch (emailError) {
        technicianLogger.warn({
          msg: 'Failed to send invoice email',
          invoiceId: invoice.id,
          error: emailError instanceof Error ? emailError.message : String(emailError),
        });
      }
    }

    // Find next job for auto-advance
    const { data: nextJob } = await supabase
      .from('jobs')
      .select('id')
      .eq('assigned_user_id', user.id)
      .eq('status', 'scheduled')
      .gte('scheduled_date', new Date().toISOString().split('T')[0])
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true })
      .limit(1)
      .maybeSingle();

    technicianLogger.info({
      msg: 'Quick invoice created',
      userId: user.id,
      jobId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      total,
      smsSent,
      emailSent,
    });

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      smsSent,
      emailSent,
      paymentLink:
        paymentLink ||
        `${process.env.NEXT_PUBLIC_APP_URL}/view/invoice/${invoice.access_token}`,
      nextJobId: nextJob?.id,
    });
  } catch (error) {
    technicianLogger.error({
      msg: 'Error creating quick invoice',
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
