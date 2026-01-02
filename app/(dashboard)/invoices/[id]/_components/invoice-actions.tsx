'use client';

import { Send, CreditCard, Banknote, Loader2 } from 'lucide-react';
import type { Invoice } from './types';

interface InvoiceActionsProps {
  invoice: Invoice;
  sending: boolean;
  generatingPaymentLink: boolean;
  onSend: () => void;
  onGeneratePaymentLink: () => void;
  onRecordPayment: () => void;
}

export function InvoiceActions({
  invoice,
  sending,
  generatingPaymentLink,
  onSend,
  onGeneratePaymentLink,
  onRecordPayment,
}: InvoiceActionsProps) {
  if (invoice.status === 'void') return null;

  const canSend = ['draft', 'sent', 'viewed'].includes(invoice.status) && invoice.status !== 'void';
  const canRecordPayment = invoice.amount_due > 0 && invoice.status !== 'void';

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
      <div className="flex gap-3 max-w-2xl mx-auto">
        {canSend && (
          <button
            onClick={onSend}
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
                onClick={onGeneratePaymentLink}
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
              onClick={onRecordPayment}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Banknote className="h-5 w-5" />
              Record Payment
            </button>
          </>
        )}
      </div>
    </div>
  );
}
