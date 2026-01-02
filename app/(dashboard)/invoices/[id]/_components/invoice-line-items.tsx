'use client';

import type { Invoice } from './types';

interface InvoiceLineItemsProps {
  invoice: Invoice;
}

export function InvoiceLineItems({ invoice }: InvoiceLineItemsProps) {
  return (
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
  );
}
