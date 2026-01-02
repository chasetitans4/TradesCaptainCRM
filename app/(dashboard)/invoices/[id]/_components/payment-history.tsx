'use client';

import { CheckCircle } from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';
import type { Payment } from './types';

interface PaymentHistoryProps {
  payments: Payment[];
}

export function PaymentHistory({ payments }: PaymentHistoryProps) {
  if (!payments || payments.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <h2 className="text-sm font-medium text-muted-foreground mb-3">Payment History</h2>
      <div className="space-y-3">
        {payments.map((payment) => (
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
  );
}
