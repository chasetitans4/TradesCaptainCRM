// =====================================================
// INVOICE PDF DOWNLOAD API
// GET /api/invoices/[id]/download - Download actual PDF file
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, getServerUserProfile } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePdfDocument } from '@/lib/invoices/pdf-renderer';
import { apiLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getServerUserProfile();
    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    // Fetch invoice with all related data
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers (
          name,
          email,
          phone,
          address,
          city,
          state,
          zip_code
        ),
        business:businesses (
          name,
          phone,
          email,
          address,
          city,
          state,
          zip_code,
          logo_url
        ),
        line_items:invoice_items (
          id,
          name,
          description,
          quantity,
          unit_price,
          is_taxable
        )
      `)
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Format addresses
    const formatAddress = (entity: Record<string, unknown> | null) => {
      if (!entity) return undefined;
      const parts = [entity.address, entity.city, entity.state, entity.zip_code].filter(Boolean);
      return parts.length > 0 ? parts.join(', ') : undefined;
    };

    // Build line items
    const lineItems = (invoice.line_items || []).map((item: Record<string, unknown>) => ({
      description: (item.name as string) || (item.description as string) || 'Service',
      quantity: (item.quantity as number) || 1,
      unitPrice: (item.unit_price as number) || 0,
      total: ((item.quantity as number) || 1) * ((item.unit_price as number) || 0),
    }));

    // If no line items, create from invoice total
    if (lineItems.length === 0 && invoice.subtotal > 0) {
      lineItems.push({
        description: 'Services',
        quantity: 1,
        unitPrice: invoice.subtotal,
        total: invoice.subtotal,
      });
    }

    const pdfData = {
      invoiceNumber: invoice.invoice_number,
      issueDate: new Date(invoice.created_at).toLocaleDateString(),
      dueDate: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Upon Receipt',
      status: invoice.status,
      businessName: invoice.business?.name || 'Business',
      businessAddress: formatAddress(invoice.business),
      businessPhone: invoice.business?.phone,
      businessEmail: invoice.business?.email,
      customerName: invoice.customer?.name || 'Customer',
      customerAddress: formatAddress(invoice.customer),
      customerEmail: invoice.customer?.email,
      customerPhone: invoice.customer?.phone,
      lineItems,
      subtotal: invoice.subtotal || 0,
      taxRate: invoice.tax_rate,
      taxAmount: invoice.tax_amount,
      discountAmount: invoice.discount_amount,
      total: invoice.total || 0,
      amountPaid: invoice.amount_paid || 0,
      amountDue: invoice.amount_due || 0,
      notes: invoice.notes,
      terms: invoice.terms,
    };

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(
      InvoicePdfDocument({ data: pdfData })
    );

    // Create filename from invoice number and customer name
    const sanitizedCustomer = (invoice.customer?.name || 'Customer')
      .replace(/[^a-zA-Z0-9]/g, '-')
      .substring(0, 30);
    const filename = `${invoice.invoice_number}-${sanitizedCustomer}.pdf`;

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(pdfBuffer);

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    apiLogger.error({
      msg: 'Error generating invoice PDF',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
