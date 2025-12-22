// =====================================================
// ACCOUNTS RECEIVABLE AGING REPORT
// Track outstanding invoices by age buckets
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';

interface AgingBucket {
  label: string;
  minDays: number;
  maxDays: number | null;
  invoices: AgingInvoice[];
  totalAmount: number;
  count: number;
}

interface AgingInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerId: string;
  dueDate: string;
  daysOverdue: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  status: string;
}

interface AgingReport {
  businessId: string;
  generatedAt: string;
  summary: {
    totalOutstanding: number;
    totalInvoices: number;
    current: number;
    overdue30: number;
    overdue60: number;
    overdue90: number;
    overdue90Plus: number;
  };
  buckets: AgingBucket[];
  byCustomer: CustomerAging[];
}

interface CustomerAging {
  customerId: string;
  customerName: string;
  totalOutstanding: number;
  invoiceCount: number;
  oldestDue: number;
  buckets: {
    current: number;
    overdue30: number;
    overdue60: number;
    overdue90: number;
    overdue90Plus: number;
  };
}

/**
 * Generate an A/R aging report for a business
 */
export async function generateAgingReport(businessId: string): Promise<AgingReport> {
  const supabase = createAdminClient();

  // Fetch all unpaid invoices
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      customer_id,
      due_date,
      total,
      amount_paid,
      amount_due,
      status,
      customer:customers (id, name)
    `)
    .eq('business_id', businessId)
    .gt('amount_due', 0)
    .not('status', 'in', '("void","cancelled")')
    .order('due_date', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch invoices: ${error.message}`);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Initialize buckets
  const bucketDefs = [
    { label: 'Current', minDays: -Infinity, maxDays: 0 },
    { label: '1-30 Days', minDays: 1, maxDays: 30 },
    { label: '31-60 Days', minDays: 31, maxDays: 60 },
    { label: '61-90 Days', minDays: 61, maxDays: 90 },
    { label: '90+ Days', minDays: 91, maxDays: null },
  ];

  const buckets: AgingBucket[] = bucketDefs.map((def) => ({
    ...def,
    invoices: [],
    totalAmount: 0,
    count: 0,
  }));

  const customerMap = new Map<string, CustomerAging>();

  // Process each invoice
  for (const invoice of invoices || []) {
    const dueDate = new Date(invoice.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    const agingInvoice: AgingInvoice = {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      customerName: (invoice.customer as any)?.name || 'Unknown',
      customerId: invoice.customer_id,
      dueDate: invoice.due_date,
      daysOverdue: Math.max(0, daysOverdue),
      total: invoice.total,
      amountPaid: invoice.amount_paid || 0,
      amountDue: invoice.amount_due,
      status: invoice.status,
    };

    // Find the right bucket
    for (const bucket of buckets) {
      const inBucket =
        daysOverdue >= bucket.minDays &&
        (bucket.maxDays === null || daysOverdue <= bucket.maxDays);

      if (inBucket) {
        bucket.invoices.push(agingInvoice);
        bucket.totalAmount += invoice.amount_due;
        bucket.count++;
        break;
      }
    }

    // Track by customer
    const customerId = invoice.customer_id;
    const customerName = (invoice.customer as any)?.name || 'Unknown';

    if (!customerMap.has(customerId)) {
      customerMap.set(customerId, {
        customerId,
        customerName,
        totalOutstanding: 0,
        invoiceCount: 0,
        oldestDue: 0,
        buckets: {
          current: 0,
          overdue30: 0,
          overdue60: 0,
          overdue90: 0,
          overdue90Plus: 0,
        },
      });
    }

    const customerAging = customerMap.get(customerId)!;
    customerAging.totalOutstanding += invoice.amount_due;
    customerAging.invoiceCount++;
    customerAging.oldestDue = Math.max(customerAging.oldestDue, daysOverdue);

    // Add to customer bucket
    if (daysOverdue <= 0) {
      customerAging.buckets.current += invoice.amount_due;
    } else if (daysOverdue <= 30) {
      customerAging.buckets.overdue30 += invoice.amount_due;
    } else if (daysOverdue <= 60) {
      customerAging.buckets.overdue60 += invoice.amount_due;
    } else if (daysOverdue <= 90) {
      customerAging.buckets.overdue90 += invoice.amount_due;
    } else {
      customerAging.buckets.overdue90Plus += invoice.amount_due;
    }
  }

  // Calculate summary
  const summary = {
    totalOutstanding: buckets.reduce((sum, b) => sum + b.totalAmount, 0),
    totalInvoices: buckets.reduce((sum, b) => sum + b.count, 0),
    current: buckets[0].totalAmount,
    overdue30: buckets[1].totalAmount,
    overdue60: buckets[2].totalAmount,
    overdue90: buckets[3].totalAmount,
    overdue90Plus: buckets[4].totalAmount,
  };

  // Sort customers by total outstanding (descending)
  const byCustomer = Array.from(customerMap.values()).sort(
    (a, b) => b.totalOutstanding - a.totalOutstanding
  );

  return {
    businessId,
    generatedAt: new Date().toISOString(),
    summary,
    buckets,
    byCustomer,
  };
}

/**
 * Get aging summary (quick stats)
 */
export async function getAgingSummary(businessId: string): Promise<{
  totalOutstanding: number;
  overdueAmount: number;
  overdueCount: number;
  criticalCount: number;
}> {
  const supabase = createAdminClient();

  const today = new Date().toISOString().split('T')[0];
  const critical90 = new Date();
  critical90.setDate(critical90.getDate() - 90);
  const critical90Str = critical90.toISOString().split('T')[0];

  // Total outstanding
  const { data: totals } = await supabase
    .from('invoices')
    .select('amount_due')
    .eq('business_id', businessId)
    .gt('amount_due', 0)
    .not('status', 'in', '("void","cancelled")');

  const totalOutstanding = (totals || []).reduce((sum, inv) => sum + (inv.amount_due || 0), 0);

  // Overdue
  const { data: overdue } = await supabase
    .from('invoices')
    .select('amount_due')
    .eq('business_id', businessId)
    .gt('amount_due', 0)
    .lt('due_date', today)
    .not('status', 'in', '("void","cancelled")');

  const overdueAmount = (overdue || []).reduce((sum, inv) => sum + (inv.amount_due || 0), 0);
  const overdueCount = overdue?.length || 0;

  // Critical (90+ days)
  const { count: criticalCount } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('business_id', businessId)
    .gt('amount_due', 0)
    .lt('due_date', critical90Str)
    .not('status', 'in', '("void","cancelled")');

  return {
    totalOutstanding,
    overdueAmount,
    overdueCount,
    criticalCount: criticalCount || 0,
  };
}
