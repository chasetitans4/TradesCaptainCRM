'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Send,
  FileText,
  Edit,
  Trash2,
  Download,
  CheckCircle,
  XCircle,
  Briefcase,
  Receipt,
  Clock,
  Eye,
  MoreVertical,
  Loader2,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { cn, formatRelativeDate, formatPhoneNumber } from '@/lib/utils';
import type { UserWithBusiness } from '@/types';

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
  notes: string | null;
  customer_notes: string | null;
  terms: string | null;
  valid_until: string | null;
  created_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  access_token: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  items: QuoteItem[];
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  draft: { label: 'Draft', icon: FileText, color: 'text-muted-foreground bg-muted' },
  sent: { label: 'Sent', icon: Send, color: 'text-blue-600 bg-blue-100' },
  viewed: { label: 'Viewed', icon: Eye, color: 'text-purple-600 bg-purple-100' },
  accepted: { label: 'Accepted', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  declined: { label: 'Declined', icon: XCircle, color: 'text-red-600 bg-red-100' },
  expired: { label: 'Expired', icon: AlertCircle, color: 'text-amber-600 bg-amber-100' },
};

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;

  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [converting, setConverting] = useState<'job' | 'invoice' | null>(null);

  useEffect(() => {
    loadData();
  }, [quoteId]);

  const loadData = async () => {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      router.push('/login');
      return;
    }
    setUser(profile as UserWithBusiness);

    const supabase = createClient();
    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers (id, name, phone, email, address),
        items:quote_items (*)
      `)
      .eq('id', quoteId)
      .single();

    if (error || !data) {
      router.push('/quotes');
      return;
    }

    setQuote(data);
    setLoading(false);
  };

  const handleSendQuote = async () => {
    if (!quote) return;

    setSending(true);
    try {
      const response = await fetch(`/api/quotes/${quote.id}/send`, {
        method: 'POST',
      });

      if (response.ok) {
        setQuote({ ...quote, status: 'sent', sent_at: new Date().toISOString() });
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to send quote');
      }
    } catch (error) {
      alert('Failed to send quote');
    } finally {
      setSending(false);
    }
  };

  const handleConvertToJob = async () => {
    if (!quote) return;

    setConverting('job');
    try {
      const response = await fetch(`/api/quotes/${quote.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ create_job: true }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/jobs/${data.job_id}`);
      } else {
        alert('Failed to create job');
      }
    } catch (error) {
      alert('Failed to create job');
    } finally {
      setConverting(null);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!quote) return;

    setConverting('invoice');
    try {
      const response = await fetch(`/api/quotes/${quote.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ create_invoice: true }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/invoices/${data.invoice_id}`);
      } else {
        alert('Failed to create invoice');
      }
    } catch (error) {
      alert('Failed to create invoice');
    } finally {
      setConverting(null);
    }
  };

  const handleDelete = async () => {
    if (!quote || quote.status !== 'draft') return;
    if (!confirm('Are you sure you want to delete this quote?')) return;

    try {
      const response = await fetch(`/api/quotes/${quote.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/quotes');
      } else {
        alert('Failed to delete quote');
      }
    } catch (error) {
      alert('Failed to delete quote');
    }
  };

  const copyPublicLink = () => {
    if (!quote) return;
    const url = `${window.location.origin}/view/quote/${quote.access_token}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  if (loading || !user || !quote) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[quote.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;
  const isExpired =
    quote.valid_until &&
    new Date(quote.valid_until) < new Date() &&
    !['accepted', 'declined', 'expired'].includes(quote.status);
  const canEdit = quote.status === 'draft';
  const canSend = ['draft', 'sent'].includes(quote.status);
  const canConvert = quote.status === 'accepted';

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">{quote.quote_number || 'Quote'}</h1>
            <div className="flex items-center gap-2">
              <span className={cn('text-xs px-2 py-0.5 rounded-full', statusConfig.color)}>
                {statusConfig.label}
              </span>
              {isExpired && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  Expired
                </span>
              )}
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px] z-20">
                {canEdit && (
                  <Link
                    href={`/quotes/${quote.id}/edit`}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-muted text-sm"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Quote
                  </Link>
                )}
                <button
                  onClick={copyPublicLink}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted text-sm text-left"
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </button>
                <a
                  href={`/view/quote/${quote.access_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 hover:bg-muted text-sm"
                >
                  <ExternalLink className="h-4 w-4" />
                  Preview
                </a>
                <button className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted text-sm text-left">
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
                {canEdit && (
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted text-sm text-left text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Customer Info */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Customer</h2>
          <div className="space-y-2">
            <p className="font-semibold text-lg">{quote.customer.name}</p>
            {quote.customer.phone && (
              <a
                href={`tel:${quote.customer.phone}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
              >
                <Phone className="h-4 w-4" />
                {formatPhoneNumber(quote.customer.phone)}
              </a>
            )}
            {quote.customer.email && (
              <a
                href={`mailto:${quote.customer.email}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
              >
                <Mail className="h-4 w-4" />
                {quote.customer.email}
              </a>
            )}
            {quote.customer.address && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {quote.customer.address}
              </p>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Items</h2>
          <div className="space-y-3">
            {quote.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 pb-3 border-b border-border last:border-0 last:pb-0">
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {item.quantity} × ${item.unit_price.toFixed(2)}
                    {item.is_taxable && <span className="text-xs ml-1">(taxable)</span>}
                  </p>
                </div>
                <p className="font-medium">${item.total.toFixed(2)}</p>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-border mt-4 pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${quote.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({quote.tax_rate}%)</span>
              <span>${quote.tax_amount.toFixed(2)}</span>
            </div>
            {quote.discount_amount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount</span>
                <span>-${quote.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold pt-2 border-t border-border">
              <span>Total</span>
              <span>${quote.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.customer_notes && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Notes for Customer</h2>
            <p className="text-sm whitespace-pre-wrap">{quote.customer_notes}</p>
          </div>
        )}

        {quote.notes && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
            <h2 className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">Internal Notes</h2>
            <p className="text-sm text-amber-600 dark:text-amber-500 whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}

        {/* Activity */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Created {formatRelativeDate(quote.created_at)}</span>
            </div>
            {quote.sent_at && (
              <div className="flex items-center gap-3 text-sm">
                <Send className="h-4 w-4 text-blue-500" />
                <span>Sent {formatRelativeDate(quote.sent_at)}</span>
              </div>
            )}
            {quote.viewed_at && (
              <div className="flex items-center gap-3 text-sm">
                <Eye className="h-4 w-4 text-purple-500" />
                <span>Viewed {formatRelativeDate(quote.viewed_at)}</span>
              </div>
            )}
            {quote.accepted_at && (
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Accepted {formatRelativeDate(quote.accepted_at)}</span>
              </div>
            )}
            {quote.declined_at && (
              <div className="flex items-center gap-3 text-sm">
                <XCircle className="h-4 w-4 text-red-500" />
                <span>Declined {formatRelativeDate(quote.declined_at)}</span>
              </div>
            )}
            {quote.valid_until && (
              <div className="flex items-center gap-3 text-sm">
                <AlertCircle className={cn('h-4 w-4', isExpired ? 'text-amber-500' : 'text-muted-foreground')} />
                <span>
                  {isExpired ? 'Expired' : 'Valid until'} {new Date(quote.valid_until).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <div className="flex gap-3 max-w-2xl mx-auto">
          {canSend && (
            <button
              onClick={handleSendQuote}
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              {quote.status === 'sent' ? 'Resend' : 'Send Quote'}
            </button>
          )}
          {canConvert && (
            <>
              <button
                onClick={handleConvertToJob}
                disabled={converting !== null}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
              >
                {converting === 'job' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Briefcase className="h-5 w-5" />
                )}
                Create Job
              </button>
              <button
                onClick={handleConvertToInvoice}
                disabled={converting !== null}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {converting === 'invoice' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Receipt className="h-5 w-5" />
                )}
                Create Invoice
              </button>
            </>
          )}
        </div>
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
      )}
    </div>
  );
}
