import { createAdminClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { CheckCircle, XCircle, Clock, Building2, Phone, Mail } from 'lucide-react';
import { formatPhoneNumber } from '@/lib/utils';
import { AddressLink } from '@/components/ui/address-link';

interface QuoteItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  is_taxable: boolean;
}

interface Quote {
  id: string;
  quote_number: string;
  status: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  customer_notes: string | null;
  terms: string | null;
  valid_until: string | null;
  created_at: string;
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
  items: QuoteItem[];
}

async function getQuote(token: string): Promise<Quote | null> {
  const supabase = createAdminClient();

  const { data: quote, error } = await supabase
    .from('quotes')
    .select(`
      id,
      quote_number,
      status,
      subtotal,
      tax_rate,
      tax_amount,
      discount_amount,
      total,
      customer_notes,
      terms,
      valid_until,
      created_at,
      customer:customers (name),
      business:businesses (name, phone, email, address, logo_url),
      items:quote_items (*)
    `)
    .eq('access_token', token)
    .single();

  if (error || !quote) {
    return null;
  }

  // Mark as viewed if not already
  if (quote.status === 'sent') {
    await supabase
      .from('quotes')
      .update({ status: 'viewed', viewed_at: new Date().toISOString() })
      .eq('id', quote.id);
  }

  const normalized: Quote = {
    id: quote.id,
    quote_number: quote.quote_number,
    status: quote.status,
    subtotal: quote.subtotal,
    tax_rate: quote.tax_rate,
    tax_amount: quote.tax_amount,
    discount_amount: quote.discount_amount,
    total: quote.total,
    customer_notes: quote.customer_notes,
    terms: quote.terms,
    valid_until: quote.valid_until,
    created_at: quote.created_at,
    customer: Array.isArray((quote as any).customer)
      ? (quote as any).customer[0]
      : (quote as any).customer,
    business: Array.isArray((quote as any).business)
      ? (quote as any).business[0]
      : (quote as any).business,
    items: ((quote as any).items || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.total,
      is_taxable: item.is_taxable,
    })),
  };

  return normalized;
}

async function acceptQuote(quoteId: string) {
  'use server';
  const supabase = createAdminClient();
  await supabase
    .from('quotes')
    .update({ status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', quoteId);
}

async function declineQuote(quoteId: string) {
  'use server';
  const supabase = createAdminClient();
  await supabase
    .from('quotes')
    .update({ status: 'declined', declined_at: new Date().toISOString() })
    .eq('id', quoteId);
}

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const quote = await getQuote(token);

  if (!quote) {
    notFound();
  }

  const isExpired =
    quote.valid_until &&
    new Date(quote.valid_until) < new Date() &&
    !['accepted', 'declined', 'expired'].includes(quote.status);

  const canRespond = ['sent', 'viewed'].includes(quote.status) && !isExpired;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {quote.business.logo_url ? (
              <img
                src={quote.business.logo_url}
                alt={quote.business.name}
                className="h-12 w-12 object-contain"
              />
            ) : (
              <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{quote.business.name}</h1>
              <p className="text-sm text-gray-500">Quote {quote.quote_number}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Status Banner */}
        {quote.status === 'accepted' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <p className="text-green-800 font-medium">You accepted this quote</p>
          </div>
        )}

        {quote.status === 'declined' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <XCircle className="h-6 w-6 text-red-600" />
            <p className="text-red-800 font-medium">You declined this quote</p>
          </div>
        )}

        {isExpired && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <Clock className="h-6 w-6 text-amber-600" />
            <p className="text-amber-800 font-medium">This quote has expired</p>
          </div>
        )}

        {/* Quote Details */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          {/* Customer & Date */}
          <div className="p-6 border-b">
            <div className="flex justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-gray-500">Prepared for</p>
                <p className="font-semibold text-lg text-gray-900">{quote.customer.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Quote Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(quote.created_at).toLocaleDateString()}
                </p>
                {quote.valid_until && (
                  <p className={`text-sm ${isExpired ? 'text-red-600' : 'text-gray-500'}`}>
                    Valid until {new Date(quote.valid_until).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="divide-y">
            {quote.items.map((item) => (
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
              <span className="text-gray-900">${quote.subtotal.toFixed(2)}</span>
            </div>
            {quote.tax_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax ({quote.tax_rate}%)</span>
                <span className="text-gray-900">${quote.tax_amount.toFixed(2)}</span>
              </div>
            )}
            {quote.discount_amount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="text-red-600">-${quote.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t pt-3 flex justify-between">
              <span className="text-lg font-semibold text-gray-900">Total</span>
              <span className="text-2xl font-bold text-gray-900">${quote.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.customer_notes && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{quote.customer_notes}</p>
          </div>
        )}

        {/* Terms */}
        {quote.terms && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h3 className="font-medium text-gray-900 mb-2">Terms & Conditions</h3>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.terms}</p>
          </div>
        )}

        {/* Action Buttons */}
        {canRespond && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <p className="text-center text-gray-600 mb-4">
              Would you like to proceed with this quote?
            </p>
            <div className="flex gap-4">
              <form action={declineQuote.bind(null, quote.id)} className="flex-1">
                <button
                  type="submit"
                  className="w-full py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Decline
                </button>
              </form>
              <form action={acceptQuote.bind(null, quote.id)} className="flex-1">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Accept Quote
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Business Contact */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-medium text-gray-900 mb-4">Questions?</h3>
          <div className="space-y-2 text-sm">
            {quote.business.phone && (
              <a
                href={`tel:${quote.business.phone}`}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <Phone className="h-4 w-4" />
                {formatPhoneNumber(quote.business.phone)}
              </a>
            )}
            {quote.business.email && (
              <a
                href={`mailto:${quote.business.email}`}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <Mail className="h-4 w-4" />
                {quote.business.email}
              </a>
            )}
            {quote.business.address && (
              <AddressLink
                address={quote.business.address}
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
