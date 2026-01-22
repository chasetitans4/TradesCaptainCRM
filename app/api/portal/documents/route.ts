
// =====================================================
// PORTAL DOCUMENTS API
// GET /api/portal/documents - Get customer invoices and quotes
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { getPortalSession } from '@/lib/portal/session';
import { createAdminClient } from '@/lib/supabase/server';
import { apiLogger } from '@/lib/logger';
import { formatCurrency } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search')?.toLowerCase();
    const type = searchParams.get('type'); // 'invoice' | 'quote' | 'all'

    const supabase = createAdminClient();

    // parallel fetch
    const [invoicesRes, quotesRes] = await Promise.all([
      supabase
        .from('invoices')
        .select('*')
        .eq('customer_id', session.customerId)
        .eq('business_id', session.businessId)
        .order('created_at', { ascending: false }),
      supabase
        .from('quotes')
        .select('*')
        .eq('customer_id', session.customerId)
        .eq('business_id', session.businessId)
        .order('created_at', { ascending: false })
    ]);

    if (invoicesRes.error) throw invoicesRes.error;
    if (quotesRes.error) throw quotesRes.error;

    const documents = [];

    // Process Invoices
    if (type !== 'quote') {
      documents.push(...invoicesRes.data.map(inv => ({
        id: inv.id,
        type: 'invoice',
        number: inv.invoice_number,
        date: inv.created_at,
        dueDate: inv.due_date,
        status: inv.status,
        amount: inv.total,
        formattedAmount: formatCurrency(inv.total),
        link: inv.stripe_payment_link || null, // In a real app, this might be a PDF generation link
        description: `Invoice #${inv.invoice_number}`
      })));
    }

    // Process Quotes
    if (type !== 'invoice') {
      documents.push(...quotesRes.data.map(quote => ({
        id: quote.id,
        type: 'quote',
        number: quote.quote_number,
        date: quote.created_at,
        dueDate: quote.valid_until, // "Valid Until" acts as due date for sorting context
        status: quote.status,
        amount: quote.total,
        formattedAmount: formatCurrency(quote.total),
        link: null, // Quotes might not have a direct link unless accepted
        description: `Quote #${quote.quote_number}`
      })));
    }

    // Sort by date desc
    documents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Filter by search
    let filtered = documents;
    if (search) {
      filtered = documents.filter(doc => 
        doc.number.toLowerCase().includes(search) ||
        doc.formattedAmount.includes(search) ||
        doc.status.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ documents: filtered });

  } catch (error) {
    apiLogger.error({
      msg: 'Portal documents GET error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
