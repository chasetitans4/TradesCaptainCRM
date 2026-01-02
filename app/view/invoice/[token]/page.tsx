import { createAdminClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { CheckCircle, XCircle, Building2, Phone, Mail, CreditCard, AlertTriangle } from 'lucide-react';
import { formatPhoneNumber } from '@/lib/utils';
import { AddressLink } from '@/components/ui/address-link';

interface InvoiceItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  is_taxable: boolean;
}

interface Payment {
  id: string;
  amount: number;
  payment_method: string;
  paid_at: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  status: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  amount_paid: number;
  amount_due: number;
  customer_notes: string | null;
  terms: string | null;
  due_date: string | null;
  created_at: string;
  stripe_payment_link_url: string | null;
  customer: {
    name: string;
  };
  business: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    logo_url: string | null;
  };
  items: InvoiceItem[];
  payments: Payment[];
}

async function getInvoice(token: string): Promise<Invoice | null> {
  const supabase = createAdminClient();

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      status,
      subtotal,
      tax_rate,
      tax_amount,
      discount_amount,
      total,
      amount_paid,
      amount_due,
      customer_notes,
      terms,
      due_date,
      created_at,
      stripe_payment_link_url,
      customer:customers (name),
      business:businesses (name, phone, email, address, logo_url),
      items:invoice_items (*),
      payments (id, amount, payment_method, paid_at)
    `)
    .eq('access_token', token)
    .single();

  if (error || !invoice) {
    return null;
  }

  // Mark as viewed if sent
  if (invoice.status === 'sent') {
    await supabase
      .from('invoices')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', invoice.id);
  }

  const normalized: Invoice = {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    status: invoice.status,
    subtotal: invoice.subtotal,
    tax_rate: invoice.tax_rate,
    tax_amount: invoice.tax_amount,
    discount_amount: invoice.discount_amount,
    total: invoice.total,
    amount_paid: invoice.amount_paid,
    amount_due: invoice.amount_due,
    customer_notes: invoice.customer_notes,
    terms: invoice.terms,
    due_date: invoice.due_date,
    created_at: invoice.created_at,
    stripe_payment_link_url: invoice.stripe_payment_link_url,
    customer: Array.isArray((invoice as any).customer)
      ? (invoice as any).customer[0]
      : (invoice as any).customer,
    business: Array.isArray((invoice as any).business)
      ? (invoice as any).business[0]
      : (invoice as any).business,
    items: ((invoice as any).items || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
      is_taxable: item.is_taxable,
    })),
    payments: ((invoice as any).payments || []).map((p: any) => ({
      id: p.id,
      amount: p.amount,
      payment_method: p.payment_method,
      paid_at: p.paid_at,
    })),
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (
    normalized.due_date &&
    new Date(normalized.due_date) < today &&
    normalized.amount_due > 0 &&
    !['paid', 'void', 'overdue'].includes(normalized.status)
  ) {
    normalized.status = 'overdue';
  }

  return normalized;
}

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invoice = await getInvoice(token);

  if (!invoice) {
    notFound();
  }

  const isPaid = invoice.status === 'paid' || invoice.amount_due <= 0;
  const isOverdue = invoice.status === 'overdue';
  const isVoid = invoice.status === 'void';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {invoice.business.logo_url ? (
              <img
                src={invoice.business.logo_url}
                alt={invoice.business.name}
                className="h-12 w-12 object-contain"
              />
            ) : (
              <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{invoice.business.name}</h1>
              <p className="text-sm text-gray-500">Invoice {invoice.invoice_number}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Status Banner */}
        {isPaid && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <p className="text-green-800 font-medium">Paid in Full</p>
              <p className="text-sm text-green-600">Thank you for your payment!</p>
            </div>
          </div>
        )}

        {isOverdue && !isPaid && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <p className="text-red-800 font-medium">Payment Overdue</p>
              <p className="text-sm text-red-600">
                This invoice was due on {new Date(invoice.due_date!).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {isVoid && (
          <div className="bg-gray-100 border border-gray-300 rounded-xl p-4 flex items-center gap-3">
            <XCircle className="h-6 w-6 text-gray-500" />
            <p className="text-gray-700 font-medium">This invoice has been voided</p>
          </div>
        )}

        {/* Amount Due Card */}
        {!isPaid && !isVoid && (
          <div className={`rounded-xl border p-6 ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-blue-600'}`}>
                  Amount Due
                </p>
                {invoice.due_date && (
                  <p className={`text-sm ${isOverdue ? 'text-red-500' : 'text-blue-500'}`}>
                    Due {new Date(invoice.due_date).toLocaleDateString()}
                  </p>
                )}
              </div>
              <p className={`text-3xl font-bold ${isOverdue ? 'text-red-700' : 'text-blue-700'}`}>
                ${invoice.amount_due.toFixed(2)}
              </p>
            </div>

            {invoice.stripe_payment_link_url && (
              <a
                href={invoice.stripe_payment_link_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <CreditCard className="h-5 w-5" />
                Pay Now
              </a>
            )}
          </div>
        )}

        {/* Invoice Details */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {/* Customer & Date */}
          <div className="p-6 border-b">
            <div className="flex justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-gray-500">Billed to</p>
                <p className="font-semibold text-lg text-gray-900">{invoice.customer.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Invoice Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(invoice.created_at).toLocaleDateString()}
                </p>
                {invoice.due_date && (
                  <p className={`text-sm ${isOverdue ? 'text-red-600' : 'text-gray-500'}`}>
                    Due {new Date(invoice.due_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="divide-y">
            {invoice.items.map((item) => (
              <div key={item.id} className="p-6 flex justify-between gap-4">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.name}</p>
                  {item.description && (
                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    {item.quantity} × ${item.unit_price.toFixed(2)}
                  </p>
                </div>
                <p className="font-medium text-gray-900">${item.total.toFixed(2)}</p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="bg-gray-50 p-6 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">${invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.tax_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax ({invoice.tax_rate}%)</span>
                <span className="text-gray-900">${invoice.tax_amount.toFixed(2)}</span>
              </div>
            )}
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="text-red-600">-${invoice.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t pt-3 flex justify-between">
              <span className="text-lg font-semibold text-gray-900">Total</span>
              <span className="text-xl font-bold text-gray-900">${invoice.total.toFixed(2)}</span>
            </div>
            {invoice.amount_paid > 0 && (
              <>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Payments Received</span>
                  <span>-${invoice.amount_paid.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-lg font-semibold text-gray-900">Balance Due</span>
                  <span className={`text-2xl font-bold ${invoice.amount_due > 0 ? 'text-gray-900' : 'text-green-600'}`}>
                    ${invoice.amount_due.toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="font-medium text-gray-900 mb-4">Payment History</h3>
            <div className="space-y-3">
              {invoice.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-green-600">+${payment.amount.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 capitalize">
                      {payment.payment_method} • {new Date(payment.paid_at).toLocaleDateString()}
                    </p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.customer_notes && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{invoice.customer_notes}</p>
          </div>
        )}

        {/* Terms */}
        {invoice.terms && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="font-medium text-gray-900 mb-2">Payment Terms</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.terms}</p>
          </div>
        )}

        {/* Pay Now Button (if payment link exists and not paid) */}
        {!isPaid && !isVoid && invoice.stripe_payment_link_url && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <a
              href={invoice.stripe_payment_link_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-green-600 text-white rounded-lg font-medium text-lg hover:bg-green-700 transition-colors"
            >
              <CreditCard className="h-6 w-6" />
              Pay ${invoice.amount_due.toFixed(2)} Now
            </a>
            <p className="text-center text-sm text-gray-500 mt-3">
              Secure payment powered by Stripe
            </p>
          </div>
        )}

        {/* Business Contact */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-medium text-gray-900 mb-4">Questions about this invoice?</h3>
          <div className="space-y-2 text-sm">
            {invoice.business.phone && (
              <a
                href={`tel:${invoice.business.phone}`}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <Phone className="h-4 w-4" />
                {formatPhoneNumber(invoice.business.phone)}
              </a>
            )}
            {invoice.business.email && (
              <a
                href={`mailto:${invoice.business.email}`}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <Mail className="h-4 w-4" />
                {invoice.business.email}
              </a>
            )}
            {invoice.business.address && (
              <AddressLink
                address={invoice.business.address}
                className="flex items-center gap-2 text-gray-600"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400">
          Powered by Trades Captain
        </p>
      </div>
    </div>
  );
}
