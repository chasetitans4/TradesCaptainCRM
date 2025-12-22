'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, AlertCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface OutstandingInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  dueDate: Date;
  status: 'sent' | 'overdue' | 'partial';
}

const statusConfig = {
  sent: { label: 'Sent', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700 border-red-200' },
  partial: { label: 'Partial', className: 'bg-amber-100 text-amber-700 border-amber-200' },
};

interface OutstandingInvoicesProps {
  invoices?: OutstandingInvoice[];
  loading?: boolean;
}

export function OutstandingInvoices({ invoices = [], loading }: OutstandingInvoicesProps) {
  const totalOutstanding = invoices.reduce((acc, inv) => acc + inv.amount, 0);
  const overdueCount = invoices.filter((inv) => inv.status === 'overdue').length;

  if (loading) {
    return (
      <div className="bg-card rounded-xl border shadow-soft">
        <div className="p-5 border-b">
          <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        </div>
        <div className="divide-y">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4">
              <div className="h-12 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border shadow-soft">
      {/* Header */}
      <div className="p-5 border-b flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Outstanding Invoices</h2>
          {overdueCount > 0 && (
            <p className="text-sm text-destructive flex items-center gap-1 mt-1">
              <AlertCircle className="w-3 h-3" />
              {overdueCount} overdue
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/invoices?status=unpaid" className="gap-1">
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>

      {/* Invoice List */}
      <div className="divide-y">
        {invoices.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No outstanding invoices</p>
          </div>
        ) : (
          invoices.slice(0, 4).map((invoice) => {
            const config = statusConfig[invoice.status];
            const isOverdue = invoice.status === 'overdue';

            return (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className={cn(
                  'flex items-center justify-between p-4 hover:bg-muted/50 transition-colors',
                  isOverdue && 'bg-destructive/5'
                )}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{invoice.invoiceNumber}</p>
                    <Badge variant="outline" className={cn('text-xs', config.className)}>
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{invoice.customerName}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-semibold">${invoice.amount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    Due {formatDistanceToNow(invoice.dueDate, { addSuffix: true })}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Total Footer */}
      {invoices.length > 0 && (
        <div className="p-4 bg-muted/30 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Outstanding</span>
            <span className="text-lg font-bold">${totalOutstanding.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
