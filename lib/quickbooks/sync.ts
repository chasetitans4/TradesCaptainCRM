// =====================================================
// QUICKBOOKS SYNC LIBRARY
// Sync entities between Trades Captain and QuickBooks
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { qbApiCall } from './client';

/**
 * Get QuickBooks ID for a local entity
 */
async function getQuickBooksId(
  businessId: string,
  entityType: string,
  localId: string
): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('quickbooks_sync_map')
    .select('quickbooks_id')
    .eq('business_id', businessId)
    .eq('entity_type', entityType)
    .eq('local_id', localId)
    .single();

  return data?.quickbooks_id || null;
}

/**
 * Save sync mapping
 */
async function saveSyncMapping(
  businessId: string,
  entityType: string,
  localId: string,
  quickbooksId: string
): Promise<void> {
  const supabase = await createClient();

  await supabase.from('quickbooks_sync_map').upsert(
    {
      business_id: businessId,
      entity_type: entityType,
      local_id: localId,
      quickbooks_id: quickbooksId,
      last_synced_at: new Date().toISOString(),
      sync_status: 'synced',
    },
    { onConflict: 'business_id,entity_type,local_id' }
  );
}

/**
 * Update sync status with error
 */
async function setSyncError(
  businessId: string,
  entityType: string,
  localId: string,
  error: string
): Promise<void> {
  const supabase = await createClient();

  await supabase.from('quickbooks_sync_map').upsert(
    {
      business_id: businessId,
      entity_type: entityType,
      local_id: localId,
      quickbooks_id: '',
      sync_status: 'error',
      sync_error: error,
    },
    { onConflict: 'business_id,entity_type,local_id' }
  );
}

// ============ CUSTOMERS ============

/**
 * Sync a customer to QuickBooks
 */
export async function syncCustomerToQuickBooks(
  businessId: string,
  customerId: string
): Promise<string> {
  const supabase = await createClient();

  // Get customer
  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (error || !customer) {
    throw new Error('Customer not found');
  }

  // Check if already synced
  const existingQbId = await getQuickBooksId(businessId, 'customer', customerId);

  const qbCustomer: any = {
    DisplayName: customer.name,
  };

  if (customer.phone) {
    qbCustomer.PrimaryPhone = { FreeFormNumber: customer.phone };
  }

  if (customer.email) {
    qbCustomer.PrimaryEmailAddr = { Address: customer.email };
  }

  if (customer.address) {
    qbCustomer.BillAddr = {
      Line1: customer.address,
      City: customer.city || undefined,
      CountrySubDivisionCode: customer.state || undefined,
      PostalCode: customer.zip || undefined,
    };
  }

  let qbId: string;

  try {
    if (existingQbId) {
      // Update existing customer
      qbCustomer.Id = existingQbId;
      qbCustomer.sparse = true;
      const result = await qbApiCall(businessId, 'POST', 'customer', qbCustomer);
      qbId = result.Customer.Id;
    } else {
      // Create new customer
      const result = await qbApiCall(businessId, 'POST', 'customer', qbCustomer);
      qbId = result.Customer.Id;
    }

    await saveSyncMapping(businessId, 'customer', customerId, qbId);
    return qbId;
  } catch (err: any) {
    await setSyncError(businessId, 'customer', customerId, err.message);
    throw err;
  }
}

// ============ INVOICES ============

/**
 * Sync an invoice to QuickBooks
 */
export async function syncInvoiceToQuickBooks(
  businessId: string,
  invoiceId: string
): Promise<string> {
  const supabase = await createClient();

  // Get invoice with items
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:customers(id, name),
      items:invoice_items(*)
    `)
    .eq('id', invoiceId)
    .single();

  if (error || !invoice) {
    throw new Error('Invoice not found');
  }

  // Ensure customer is synced first
  let customerQbId = await getQuickBooksId(businessId, 'customer', invoice.customer_id);
  if (!customerQbId) {
    customerQbId = await syncCustomerToQuickBooks(businessId, invoice.customer_id);
  }

  // Build line items
  const lines = (invoice.items || []).map((item: any, index: number) => ({
    LineNum: index + 1,
    Amount: item.total || item.quantity * item.unit_price,
    DetailType: 'SalesItemLineDetail',
    SalesItemLineDetail: {
      ItemRef: { value: '1' }, // Default "Services" item - would need to be configured
      Qty: item.quantity,
      UnitPrice: item.unit_price,
    },
    Description: item.name + (item.description ? ` - ${item.description}` : ''),
  }));

  const qbInvoice: any = {
    CustomerRef: { value: customerQbId },
    Line: lines,
  };

  if (invoice.due_date) {
    qbInvoice.DueDate = invoice.due_date;
  }

  if (invoice.invoice_number) {
    qbInvoice.DocNumber = invoice.invoice_number;
  }

  try {
    const result = await qbApiCall(businessId, 'POST', 'invoice', qbInvoice);
    const qbId = result.Invoice.Id;

    await saveSyncMapping(businessId, 'invoice', invoiceId, qbId);
    return qbId;
  } catch (err: any) {
    await setSyncError(businessId, 'invoice', invoiceId, err.message);
    throw err;
  }
}

// ============ PAYMENTS ============

/**
 * Sync a payment to QuickBooks
 */
export async function syncPaymentToQuickBooks(
  businessId: string,
  paymentId: string
): Promise<string> {
  const supabase = await createClient();

  const { data: payment, error } = await supabase
    .from('payments')
    .select(`
      *,
      invoice:invoices(id, customer_id)
    `)
    .eq('id', paymentId)
    .single();

  if (error || !payment) {
    throw new Error('Payment not found');
  }

  const customerQbId = await getQuickBooksId(businessId, 'customer', payment.invoice?.customer_id);
  const invoiceQbId = await getQuickBooksId(businessId, 'invoice', payment.invoice_id);

  if (!customerQbId || !invoiceQbId) {
    throw new Error('Customer or Invoice not synced to QuickBooks');
  }

  const qbPayment = {
    CustomerRef: { value: customerQbId },
    TotalAmt: payment.amount,
    Line: [
      {
        Amount: payment.amount,
        LinkedTxn: [
          {
            TxnId: invoiceQbId,
            TxnType: 'Invoice',
          },
        ],
      },
    ],
  };

  try {
    const result = await qbApiCall(businessId, 'POST', 'payment', qbPayment);
    const qbId = result.Payment.Id;

    await saveSyncMapping(businessId, 'payment', paymentId, qbId);
    return qbId;
  } catch (err: any) {
    await setSyncError(businessId, 'payment', paymentId, err.message);
    throw err;
  }
}

// ============ EXPENSES (RECEIPTS) ============

/**
 * Sync a receipt/expense to QuickBooks
 */
export async function syncReceiptToQuickBooks(
  businessId: string,
  receiptId: string
): Promise<string> {
  const supabase = await createClient();

  const { data: receipt, error } = await supabase
    .from('receipts')
    .select('*')
    .eq('id', receiptId)
    .single();

  if (error || !receipt) {
    throw new Error('Receipt not found');
  }

  const qbExpense = {
    PaymentType: 'Cash',
    TotalAmt: receipt.amount || 0,
    TxnDate: receipt.receipt_date,
    Line: [
      {
        Amount: receipt.amount || 0,
        DetailType: 'AccountBasedExpenseLineDetail',
        AccountBasedExpenseLineDetail: {
          AccountRef: { value: '1' }, // Would need to be configured based on category
        },
        Description: `${receipt.vendor || 'Expense'}: ${receipt.description || ''}`.trim(),
      },
    ],
  };

  try {
    const result = await qbApiCall(businessId, 'POST', 'purchase', qbExpense);
    const qbId = result.Purchase.Id;

    await saveSyncMapping(businessId, 'expense', receiptId, qbId);
    return qbId;
  } catch (err: any) {
    await setSyncError(businessId, 'expense', receiptId, err.message);
    throw err;
  }
}

// ============ BULK SYNC ============

/**
 * Sync all entities to QuickBooks
 */
export async function syncAllToQuickBooks(businessId: string): Promise<{
  customers: number;
  invoices: number;
  payments: number;
  expenses: number;
  errors: string[];
}> {
  const supabase = await createClient();
  const results = { customers: 0, invoices: 0, payments: 0, expenses: 0, errors: [] as string[] };

  // Check sync settings
  const { data: connection } = await supabase
    .from('quickbooks_connections')
    .select('sync_customers, sync_invoices, sync_payments, sync_expenses')
    .eq('business_id', businessId)
    .single();

  if (!connection) {
    throw new Error('QuickBooks not connected');
  }

  // Sync customers
  if (connection.sync_customers) {
    const { data: customers } = await supabase
      .from('customers')
      .select('id')
      .eq('business_id', businessId);

    for (const c of customers || []) {
      try {
        await syncCustomerToQuickBooks(businessId, c.id);
        results.customers++;
      } catch (err: any) {
        results.errors.push(`Customer ${c.id}: ${err.message}`);
      }
    }
  }

  // Sync invoices
  if (connection.sync_invoices) {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('business_id', businessId)
      .in('status', ['sent', 'viewed', 'paid']);

    for (const i of invoices || []) {
      try {
        await syncInvoiceToQuickBooks(businessId, i.id);
        results.invoices++;
      } catch (err: any) {
        results.errors.push(`Invoice ${i.id}: ${err.message}`);
      }
    }
  }

  // Sync payments
  if (connection.sync_payments) {
    const { data: payments } = await supabase
      .from('payments')
      .select('id')
      .eq('business_id', businessId);

    for (const p of payments || []) {
      try {
        await syncPaymentToQuickBooks(businessId, p.id);
        results.payments++;
      } catch (err: any) {
        results.errors.push(`Payment ${p.id}: ${err.message}`);
      }
    }
  }

  // Sync receipts as expenses
  if (connection.sync_expenses) {
    const { data: receipts } = await supabase
      .from('receipts')
      .select('id')
      .eq('business_id', businessId)
      .eq('status', 'approved');

    for (const r of receipts || []) {
      try {
        await syncReceiptToQuickBooks(businessId, r.id);
        results.expenses++;
      } catch (err: any) {
        results.errors.push(`Receipt ${r.id}: ${err.message}`);
      }
    }
  }

  // Update last sync time
  await supabase
    .from('quickbooks_connections')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('business_id', businessId);

  return results;
}

/**
 * Get sync status for all entities
 */
export async function getSyncStatus(businessId: string): Promise<{
  customers: { total: number; synced: number; errors: number };
  invoices: { total: number; synced: number; errors: number };
  payments: { total: number; synced: number; errors: number };
  expenses: { total: number; synced: number; errors: number };
}> {
  const supabase = await createClient();

  // Get total counts
  const [customers, invoices, payments, receipts] = await Promise.all([
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
    supabase.from('payments').select('id', { count: 'exact', head: true }).eq('business_id', businessId),
    supabase.from('receipts').select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('status', 'approved'),
  ]);

  // Get sync map stats
  const { data: syncMaps } = await supabase
    .from('quickbooks_sync_map')
    .select('entity_type, sync_status')
    .eq('business_id', businessId);

  const syncStats = (syncMaps || []).reduce(
    (acc, map) => {
      if (!acc[map.entity_type]) {
        acc[map.entity_type] = { synced: 0, errors: 0 };
      }
      if (map.sync_status === 'synced') {
        acc[map.entity_type].synced++;
      } else if (map.sync_status === 'error') {
        acc[map.entity_type].errors++;
      }
      return acc;
    },
    {} as Record<string, { synced: number; errors: number }>
  );

  return {
    customers: {
      total: customers.count || 0,
      synced: syncStats.customer?.synced || 0,
      errors: syncStats.customer?.errors || 0,
    },
    invoices: {
      total: invoices.count || 0,
      synced: syncStats.invoice?.synced || 0,
      errors: syncStats.invoice?.errors || 0,
    },
    payments: {
      total: payments.count || 0,
      synced: syncStats.payment?.synced || 0,
      errors: syncStats.payment?.errors || 0,
    },
    expenses: {
      total: receipts.count || 0,
      synced: syncStats.expense?.synced || 0,
      errors: syncStats.expense?.errors || 0,
    },
  };
}
