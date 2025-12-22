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
  DollarSign,
  Clock,
  Eye,
  MoreVertical,
  Loader2,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Copy,
  ExternalLink,
  CreditCard,
  Banknote,
  Receipt,
} from 'lucide-react';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { cn, formatRelativeDate, formatPhoneNumber } from '@/lib/utils';
import type { UserWithBusiness } from '@/types';

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
  notes: string | null;
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
  notes: string | null;
  customer_notes: string | null;
  terms: string | null;
  due_date: string | null;
  created_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  access_token: string;
  stripe_payment_link_url: string | null;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  items: InvoiceItem[];
  payments: Payment[];
  quote?: {
    id: string;
    quote_number: string;
  } | null;
  job?: {
    id: string;
    title: string;
  } | null;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  draft: { label: 'Draft', icon: FileText, color: 'text-muted-foreground bg-muted' },
  sent: { label: 'Sent', icon: Send, color: 'text-blue-600 bg-blue-100' },
  viewed: { label: 'Viewed', icon: Eye, color: 'text-purple-600 bg-purple-100' },
  paid: { label: 'Paid', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  partial: { label: 'Partial', icon: DollarSign, color: 'text-amber-600 bg-amber-100' },
  overdue: { label: 'Overdue', icon: AlertTriangle, color: 'text-red-600 bg-red-100' },
  void: { label: 'Void', icon: XCircle, color: 'text-gray-500 bg-gray-100' },
};

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.id as string;

  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check' | 'other'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => {
    loadData();
  }, [invoiceId]);

  const loadData = async () => {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      router.push('/login');
      return;
    }
    setUser(profile as UserWithBusiness);

    const supabase = createClient();
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        customer:customers (id, name, phone, email, address),
        items:invoice_items (*),
        payments (*),
        quote:quotes (id, quote_number),
        job:jobs (id, title)
      `)
      .eq('id', invoiceId)
      .single();

    if (error || !data) {
      router.push('/invoices');
      return;
    }

    // Check for overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (
      data.due_date &&
      new Date(data.due_date) < today &&
      data.amount_due > 0 &&
      !['paid', 'void', 'overdue'].includes(data.status)
    ) {
      data.status = 'overdue';
    }

    setInvoice(data);
    setPaymentAmount(data.amount_due.toFixed(2));
    setLoading(false);
  };

  const handleSendInvoice = async () => {
    if (!invoice) return;

    setSending(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/send`, {
        method: 'POST',
      });

      if (response.ok) {
        setInvoice({ ...invoice, status: 'sent', sent_at: new Date().toISOString() });
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to send invoice');
      }
    } catch (error) {
      alert('Failed to send invoice');
    } finally {
      setSending(false);
    }
  };

  const handleGeneratePaymentLink = async () => {
    if (!invoice) return;

    setGeneratingPaymentLink(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/payment-link`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setInvoice({ ...invoice, stripe_payment_link_url: data.url });
        navigator.clipboard.writeText(data.url);
        alert('Payment link generated and copied to clipboard!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to generate payment link');
      }
    } catch (error) {
      alert('Failed to generate payment link');
    } finally {
      setGeneratingPaymentLink(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!invoice) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setRecordingPayment(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          method: paymentMethod,
          notes: paymentNotes || undefined,
        }),
      });

      if (response.ok) {
        loadData();
        setShowPaymentModal(false);
        setPaymentAmount('');
        setPaymentNotes('');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to record payment');
      }
    } catch (error) {
      alert('Failed to record payment');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleVoidInvoice = async () => {
    if (!invoice) return;
    if (!confirm('Are you sure you want to void this invoice? This cannot be undone.')) return;

    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'void' }),
      });

      if (response.ok) {
        setInvoice({ ...invoice, status: 'void' });
      } else {
        alert('Failed to void invoice');
      }
    } catch (error) {
      alert('Failed to void invoice');
    }
  };

  const handleDelete = async () => {
    if (!invoice || invoice.status !== 'draft') return;
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/invoices');
      } else {
        alert('Failed to delete invoice');
      }
    } catch (error) {
      alert('Failed to delete invoice');
    }
  };

  const copyPublicLink = () => {
    if (!invoice) return;
    const url = `${window.location.origin}/view/invoice/${invoice.access_token}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const copyPaymentLink = () => {
    if (!invoice?.stripe_payment_link_url) return;
    navigator.clipboard.writeText(invoice.stripe_payment_link_url);
    alert('Payment link copied to clipboard!');
  };

  if (loading || !user || !invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;
  const isOverdue = invoice.status === 'overdue';
  const canEdit = invoice.status === 'draft';
  const canSend = ['draft', 'sent', 'viewed'].includes(invoice.status) && invoice.status !== 'void';
  const canRecordPayment = invoice.amount_due > 0 && invoice.status !== 'void';
  const isPaid = invoice.status === 'paid';

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
            <h1 className="text-lg font-semibold">{invoice.invoice_number || 'Invoice'}</h1>
            <div className="flex items-center gap-2">
              <span className={cn('text-xs px-2 py-0.5 rounded-full', statusConfig.color)}>
                {statusConfig.label}
              </span>
              {isOverdue && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  Overdue
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
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[180px] z-20">
                {canEdit && (
                  <Link
                    href={`/invoices/${invoice.id}/edit`}
                    className="flex items-center gap-2 px-4 py-2 hover:bg-muted text-sm"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Invoice
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
                  href={`/view/invoice/${invoice.access_token}`}
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
                {!['paid', 'void', 'draft'].includes(invoice.status) && (
                  <button
                    onClick={handleVoidInvoice}
                    className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted text-sm text-left text-amber-600"
                  >
                    <XCircle className="h-4 w-4" />
                    Void Invoice
                  </button>
                )}
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
        {/* Amount Due Card */}
        {!isPaid && invoice.status !== 'void' && (
          <div className={cn(
            'rounded-xl border p-4',
            isOverdue
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : 'bg-primary/5 border-primary/20'
          )}>
            <div className="flex justify-between items-center mb-3">
              <span className={cn('font-medium', isOverdue ? 'text-red-700 dark:text-red-400' : 'text-primary')}>
                Amount Due
              </span>
              <span className={cn('text-2xl font-bold', isOverdue ? 'text-red-700 dark:text-red-400' : 'text-primary')}>
                ${invoice.amount_due.toFixed(2)}
              </span>
            </div>
            {invoice.due_date && (
              <p className={cn('text-sm', isOverdue ? 'text-red-600 dark:text-red-500' : 'text-muted-foreground')}>
                Due {new Date(invoice.due_date).toLocaleDateString()}
                {isOverdue && ' (overdue)'}
              </p>
            )}
          </div>
        )}

        {/* Paid Badge */}
        {isPaid && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4 flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-700 dark:text-green-400">Paid in Full</p>
              <p className="text-sm text-green-600 dark:text-green-500">
                ${invoice.total.toFixed(2)} received
                {invoice.paid_at && ` on ${new Date(invoice.paid_at).toLocaleDateString()}`}
              </p>
            </div>
          </div>
        )}

        {/* Payment Link */}
        {invoice.stripe_payment_link_url && invoice.amount_due > 0 && (
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <span className="font-medium">Payment Link</span>
              </div>
              <button
                onClick={copyPaymentLink}
                className="text-sm text-primary hover:underline"
              >
                Copy Link
              </button>
            </div>
          </div>
        )}

        {/* Customer Info */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Customer</h2>
          <div className="space-y-2">
            <p className="font-semibold text-lg">{invoice.customer.name}</p>
            {invoice.customer.phone && (
              <a
                href={`tel:${invoice.customer.phone}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
              >
                <Phone className="h-4 w-4" />
                {formatPhoneNumber(invoice.customer.phone)}
              </a>
            )}
            {invoice.customer.email && (
              <a
                href={`mailto:${invoice.customer.email}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
              >
                <Mail className="h-4 w-4" />
                {invoice.customer.email}
              </a>
            )}
            {invoice.customer.address && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {invoice.customer.address}
              </p>
            )}
          </div>
        </div>

        {/* Related Records */}
        {(invoice.quote || invoice.job) && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Related</h2>
            <div className="space-y-2">
              {invoice.quote && (
                <Link
                  href={`/quotes/${invoice.quote.id}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  Quote {invoice.quote.quote_number}
                </Link>
              )}
              {invoice.job && (
                <Link
                  href={`/jobs/${invoice.job.id}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Receipt className="h-4 w-4" />
                  {invoice.job.title}
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Line Items */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Items</h2>
          <div className="space-y-3">
            {invoice.items.map((item) => (
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
              <span>${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({invoice.tax_rate}%)</span>
              <span>${invoice.tax_amount.toFixed(2)}</span>
            </div>
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount</span>
                <span>-${invoice.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold pt-2 border-t border-border">
              <span>Total</span>
              <span>${invoice.total.toFixed(2)}</span>
            </div>
            {invoice.amount_paid > 0 && (
              <>
                <div className="flex justify-between text-green-600">
                  <span>Paid</span>
                  <span>-${invoice.amount_paid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Balance Due</span>
                  <span>${invoice.amount_due.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Payment History */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Payment History</h2>
            <div className="space-y-3">
              {invoice.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-green-600">+${payment.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {payment.payment_method} • {formatRelativeDate(payment.paid_at)}
                    </p>
                    {payment.notes && (
                      <p className="text-xs text-muted-foreground mt-1">{payment.notes}</p>
                    )}
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.customer_notes && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Notes</h2>
            <p className="text-sm whitespace-pre-wrap">{invoice.customer_notes}</p>
          </div>
        )}

        {invoice.terms && (
          <div className="bg-card rounded-xl border border-border p-4">
            <h2 className="text-sm font-medium text-muted-foreground mb-2">Terms</h2>
            <p className="text-sm whitespace-pre-wrap">{invoice.terms}</p>
          </div>
        )}

        {invoice.notes && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
            <h2 className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">Internal Notes</h2>
            <p className="text-sm text-amber-600 dark:text-amber-500 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* Activity */}
        <div className="bg-card rounded-xl border border-border p-4">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Activity</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Created {formatRelativeDate(invoice.created_at)}</span>
            </div>
            {invoice.sent_at && (
              <div className="flex items-center gap-3 text-sm">
                <Send className="h-4 w-4 text-blue-500" />
                <span>Sent {formatRelativeDate(invoice.sent_at)}</span>
              </div>
            )}
            {invoice.viewed_at && (
              <div className="flex items-center gap-3 text-sm">
                <Eye className="h-4 w-4 text-purple-500" />
                <span>Viewed {formatRelativeDate(invoice.viewed_at)}</span>
              </div>
            )}
            {invoice.paid_at && (
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Paid {formatRelativeDate(invoice.paid_at)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Actions */}
      {invoice.status !== 'void' && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
          <div className="flex gap-3 max-w-2xl mx-auto">
            {canSend && (
              <button
                onClick={handleSendInvoice}
                disabled={sending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                {invoice.sent_at ? 'Resend' : 'Send'}
              </button>
            )}
            {canRecordPayment && (
              <>
                {!invoice.stripe_payment_link_url && (
                  <button
                    onClick={handleGeneratePaymentLink}
                    disabled={generatingPaymentLink}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-border rounded-lg hover:bg-muted disabled:opacity-50 transition-colors"
                  >
                    {generatingPaymentLink ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <CreditCard className="h-5 w-5" />
                    )}
                    Payment Link
                  </button>
                )}
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Banknote className="h-5 w-5" />
                  Record Payment
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {showMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-card w-full sm:max-w-md sm:rounded-xl rounded-t-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold">Record Payment</h2>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Payment Method</label>
              <div className="flex gap-2">
                {(['cash', 'check', 'other'] as const).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    className={cn(
                      'flex-1 py-2 rounded-lg border text-sm font-medium capitalize transition-colors',
                      paymentMethod === method
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-input hover:bg-muted'
                    )}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Notes (optional)</label>
              <input
                type="text"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="w-full px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Check #, reference, etc."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 border border-input rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={recordingPayment}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {recordingPayment ? (
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                ) : (
                  'Record Payment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
