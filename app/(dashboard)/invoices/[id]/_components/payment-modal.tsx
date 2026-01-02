'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentAmount: string;
  setPaymentAmount: (amount: string) => void;
  paymentMethod: 'cash' | 'check' | 'other';
  setPaymentMethod: (method: 'cash' | 'check' | 'other') => void;
  paymentNotes: string;
  setPaymentNotes: (notes: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function PaymentModal({
  isOpen,
  onClose,
  paymentAmount,
  setPaymentAmount,
  paymentMethod,
  setPaymentMethod,
  paymentNotes,
  setPaymentNotes,
  onSubmit,
  isSubmitting,
}: PaymentModalProps) {
  if (!isOpen) return null;

  return (
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
            onClick={onClose}
            className="flex-1 py-3 border border-input rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            ) : (
              'Record Payment'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
