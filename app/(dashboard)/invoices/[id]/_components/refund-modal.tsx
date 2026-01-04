'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, DollarSign, RotateCcw } from 'lucide-react';
import type { Invoice, Payment } from './types';

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onRefundSuccess: () => void;
}

type RefundReason = 'duplicate' | 'fraudulent' | 'requested_by_customer';

const REFUND_REASONS: { value: RefundReason; label: string }[] = [
  { value: 'requested_by_customer', label: 'Customer Request' },
  { value: 'duplicate', label: 'Duplicate Charge' },
  { value: 'fraudulent', label: 'Fraudulent' },
];

export function RefundModal({
  isOpen,
  onClose,
  invoice,
  onRefundSuccess,
}: RefundModalProps) {
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [reason, setReason] = useState<RefundReason>('requested_by_customer');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundableInfo, setRefundableInfo] = useState<{
    availableToRefund: number;
    alreadyRefunded: number;
  } | null>(null);

  // Get payments that can be refunded (have positive amount)
  const refundablePayments = invoice.payments.filter(
    (p) => p.amount > 0 && p.payment_method !== 'refund'
  );

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPayment(refundablePayments.length === 1 ? refundablePayments[0] : null);
      setRefundAmount('');
      setReason('requested_by_customer');
      setNotes('');
      setError(null);
      setRefundableInfo(null);
    }
  }, [isOpen, refundablePayments.length]);

  // Fetch refundable amount when payment is selected
  useEffect(() => {
    async function fetchRefundableAmount() {
      if (!selectedPayment) {
        setRefundableInfo(null);
        return;
      }

      try {
        const response = await fetch(`/api/payments/${selectedPayment.id}/refundable`);
        if (response.ok) {
          const data = await response.json();
          setRefundableInfo(data);
          // Pre-fill with max refundable amount
          if (data.availableToRefund > 0) {
            setRefundAmount(data.availableToRefund.toFixed(2));
          }
        } else {
          // Fallback to payment amount if API doesn't exist
          setRefundableInfo({
            availableToRefund: selectedPayment.amount,
            alreadyRefunded: 0,
          });
          setRefundAmount(selectedPayment.amount.toFixed(2));
        }
      } catch {
        // Fallback to payment amount
        setRefundableInfo({
          availableToRefund: selectedPayment.amount,
          alreadyRefunded: 0,
        });
        setRefundAmount(selectedPayment.amount.toFixed(2));
      }
    }

    fetchRefundableAmount();
  }, [selectedPayment]);

  async function handleRefund() {
    if (!selectedPayment) {
      setError('Please select a payment to refund');
      return;
    }

    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid refund amount');
      return;
    }

    if (refundableInfo && amount > refundableInfo.availableToRefund) {
      setError(`Maximum refundable amount is $${refundableInfo.availableToRefund.toFixed(2)}`);
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch(`/api/invoices/${invoice.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: selectedPayment.id,
          amount,
          reason,
          notes: notes.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process refund');
      }

      onRefundSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process refund');
    } finally {
      setIsProcessing(false);
    }
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-500" />
            Process Refund
          </DialogTitle>
          <DialogDescription>
            Invoice {invoice.invoice_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning if invoice has remaining balance */}
          {invoice.amount_due > 0 && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This invoice has an unpaid balance of {formatCurrency(invoice.amount_due)}.
                Refunds will only apply to completed payments.
              </AlertDescription>
            </Alert>
          )}

          {/* Error display */}
          {error && (
            <Alert variant="danger">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* No payments to refund */}
          {refundablePayments.length === 0 ? (
            <Alert>
              <AlertDescription>
                No payments available to refund on this invoice.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Payment Selection */}
              {refundablePayments.length > 1 && (
                <div className="space-y-2">
                  <Label>Select Payment to Refund</Label>
                  <div className="space-y-2">
                    {refundablePayments.map((payment) => (
                      <button
                        key={payment.id}
                        type="button"
                        onClick={() => setSelectedPayment(payment)}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                          selectedPayment?.id === payment.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{formatCurrency(payment.amount)}</p>
                            <p className="text-xs text-muted-foreground">
                              {payment.payment_method} - {formatDate(payment.paid_at)}
                            </p>
                          </div>
                          {selectedPayment?.id === payment.id && (
                            <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                              <div className="h-2 w-2 rounded-full bg-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Single payment display */}
              {refundablePayments.length === 1 && (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Refunding payment:</p>
                  <p className="font-medium">
                    {formatCurrency(refundablePayments[0].amount)} via {refundablePayments[0].payment_method}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Paid on {formatDate(refundablePayments[0].paid_at)}
                  </p>
                </div>
              )}

              {/* Refund Amount */}
              <div className="space-y-2">
                <Label htmlFor="refundAmount">Refund Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="refundAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={refundableInfo?.availableToRefund}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="pl-9"
                    placeholder="0.00"
                  />
                </div>
                {refundableInfo && (
                  <p className="text-xs text-muted-foreground">
                    Available to refund: {formatCurrency(refundableInfo.availableToRefund)}
                    {refundableInfo.alreadyRefunded > 0 && (
                      <span className="ml-2">
                        (Already refunded: {formatCurrency(refundableInfo.alreadyRefunded)})
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Refund Reason */}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <div className="grid grid-cols-3 gap-2">
                  {REFUND_REASONS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setReason(r.value)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        reason === r.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes about this refund..."
                  rows={2}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          {refundablePayments.length > 0 && (
            <Button
              variant="primary"
              onClick={handleRefund}
              disabled={isProcessing || !selectedPayment || !refundAmount}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Process Refund
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
