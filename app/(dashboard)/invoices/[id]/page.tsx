'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle,
  CreditCard,
  Clock,
  Send,
  Eye,
  Loader2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Receipt,
} from 'lucide-react';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { cn, formatRelativeDate, formatPhoneNumber } from '@/lib/utils';
import type { UserWithBusiness } from '@/types';

import type { Invoice } from './_components/types';
import { InvoiceHeader } from './_components/invoice-header';
import { InvoiceLineItems } from './_components/invoice-line-items';
import { PaymentHistory } from './_components/payment-history';
import { PaymentModal } from './_components/payment-modal';
import { InvoiceActions } from './_components/invoice-actions';

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
      const response = await fetch(`/api/invoices/${invoice.id}/send`, { method: 'POST' });
      if (response.ok) {
        setInvoice({ ...invoice, status: 'sent', sent_at: new Date().toISOString() });
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to send invoice');
      }
    } catch {
      alert('Failed to send invoice');
    } finally {
      setSending(false);
    }
  };

  const handleGeneratePaymentLink = async () => {
    if (!invoice) return;
    setGeneratingPaymentLink(true);
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/payment-link`, { method: 'POST' });
      if (response.ok) {
        const data = await response.json();
        setInvoice({ ...invoice, stripe_payment_link_url: data.url });
        navigator.clipboard.writeText(data.url);
        alert('Payment link generated and copied to clipboard!');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to generate payment link');
      }
    } catch {
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
        body: JSON.stringify({ amount, method: paymentMethod, notes: paymentNotes || undefined }),
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
    } catch {
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
    } catch {
      alert('Failed to void invoice');
    }
  };

  const handleDelete = async () => {
    if (!invoice || invoice.status !== 'draft') return;
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      const response = await fetch(`/api/invoices/${invoice.id}`, { method: 'DELETE' });
      if (response.ok) {
        router.push('/invoices');
      } else {
        alert('Failed to delete invoice');
      }
    } catch {
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

  const isOverdue = invoice.status === 'overdue';
  const isPaid = invoice.status === 'paid';

  return (
    <div className="min-h-screen bg-background pb-32">
      <InvoiceHeader
        invoice={invoice}
        showMenu={showMenu}
        setShowMenu={setShowMenu}
        onBack={() => router.back()}
        onCopyLink={copyPublicLink}
        onVoid={handleVoidInvoice}
        onDelete={handleDelete}
      />

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
              <button onClick={copyPaymentLink} className="text-sm text-primary hover:underline">
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
              <a href={`tel:${invoice.customer.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
                <Phone className="h-4 w-4" />
                {formatPhoneNumber(invoice.customer.phone)}
              </a>
            )}
            {invoice.customer.email && (
              <a href={`mailto:${invoice.customer.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
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
                <Link href={`/quotes/${invoice.quote.id}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <FileText className="h-4 w-4" />
                  Quote {invoice.quote.quote_number}
                </Link>
              )}
              {invoice.job && (
                <Link href={`/jobs/${invoice.job.id}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Receipt className="h-4 w-4" />
                  {invoice.job.title}
                </Link>
              )}
            </div>
          </div>
        )}

        <InvoiceLineItems invoice={invoice} />
        <PaymentHistory payments={invoice.payments} />

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

      <InvoiceActions
        invoice={invoice}
        sending={sending}
        generatingPaymentLink={generatingPaymentLink}
        onSend={handleSendInvoice}
        onGeneratePaymentLink={handleGeneratePaymentLink}
        onRecordPayment={() => setShowPaymentModal(true)}
      />

      {/* Click outside to close menu */}
      {showMenu && <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />}

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        paymentAmount={paymentAmount}
        setPaymentAmount={setPaymentAmount}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        paymentNotes={paymentNotes}
        setPaymentNotes={setPaymentNotes}
        onSubmit={handleRecordPayment}
        isSubmitting={recordingPayment}
      />
    </div>
  );
}
