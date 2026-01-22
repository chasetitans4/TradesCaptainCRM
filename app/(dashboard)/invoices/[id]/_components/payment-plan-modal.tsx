'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  DollarSign,
  Loader2,
  X,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  amountDue: number;
  onSuccess: () => void;
}

interface Installment {
  number: number;
  amount: number;
  dueDate: string;
}

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly', description: 'Every week' },
  { value: 'biweekly', label: 'Bi-weekly', description: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Every month' },
];

export function PaymentPlanModal({
  isOpen,
  onClose,
  invoiceId,
  amountDue,
  onSuccess,
}: PaymentPlanModalProps) {
  const [numberOfInstallments, setNumberOfInstallments] = useState(3);
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
  const [startDate, setStartDate] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set default start date to tomorrow
  useEffect(() => {
    if (isOpen) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setStartDate(tomorrow.toISOString().split('T')[0]);
      setError(null);
    }
  }, [isOpen]);

  // Calculate installment preview
  const installmentPreview = useMemo((): Installment[] => {
    if (!startDate || numberOfInstallments < 2) return [];

    const downPaymentAmount = downPayment ? parseFloat(downPayment) : 0;
    const remainingAmount = amountDue - downPaymentAmount;
    const installmentAmount = Math.ceil((remainingAmount / numberOfInstallments) * 100) / 100;

    const installments: Installment[] = [];
    let currentDate = new Date(startDate);

    for (let i = 1; i <= numberOfInstallments; i++) {
      let amount = installmentAmount;
      if (i === numberOfInstallments) {
        const paidSoFar = installmentAmount * (numberOfInstallments - 1);
        amount = Math.round((remainingAmount - paidSoFar) * 100) / 100;
      }

      installments.push({
        number: i,
        amount,
        dueDate: currentDate.toISOString().split('T')[0],
      });

      // Calculate next due date
      if (frequency === 'weekly') {
        currentDate.setDate(currentDate.getDate() + 7);
      } else if (frequency === 'biweekly') {
        currentDate.setDate(currentDate.getDate() + 14);
      } else {
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    return installments;
  }, [amountDue, numberOfInstallments, frequency, startDate, downPayment]);

  const handleSubmit = async () => {
    if (!startDate) {
      setError('Please select a start date');
      return;
    }

    const downPaymentAmount = downPayment ? parseFloat(downPayment) : 0;
    if (downPaymentAmount < 0 || downPaymentAmount >= amountDue) {
      setError('Down payment must be less than the total amount');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/payment-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numberOfInstallments,
          frequency,
          startDate,
          downPayment: downPaymentAmount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment plan');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create payment plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const downPaymentAmount = downPayment ? parseFloat(downPayment) : 0;
  const remainingAfterDown = amountDue - downPaymentAmount;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-xl animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Set Up Payment Plan</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Total Amount */}
          <div className="bg-primary/5 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount to Finance</span>
              <span className="text-2xl font-bold text-primary">${amountDue.toFixed(2)}</span>
            </div>
          </div>

          {/* Down Payment (Optional) */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Down Payment (Optional)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="number"
                value={downPayment}
                onChange={(e) => setDownPayment(e.target.value)}
                placeholder="0.00"
                min="0"
                max={amountDue * 0.5}
                step="0.01"
                className="w-full pl-9 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Maximum 50% of total ({`$${(amountDue * 0.5).toFixed(2)}`})
            </p>
          </div>

          {/* Number of Installments */}
          <div>
            <label className="block text-sm font-medium mb-2">Number of Payments</label>
            <div className="grid grid-cols-4 gap-2">
              {[2, 3, 4, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setNumberOfInstallments(num)}
                  className={cn(
                    'px-4 py-2 rounded-lg border text-center transition-colors',
                    numberOfInstallments === num
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium mb-2">Payment Frequency</label>
            <div className="space-y-2">
              {FREQUENCY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFrequency(option.value as typeof frequency)}
                  className={cn(
                    'w-full px-4 py-3 rounded-lg border text-left transition-colors flex items-center justify-between',
                    frequency === option.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  <div>
                    <p className={cn('font-medium', frequency === option.value && 'text-primary')}>
                      {option.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  {frequency === option.value && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium mb-2">First Payment Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full pl-9 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Payment Schedule Preview */}
          {installmentPreview.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="bg-muted/50 px-4 py-2 border-b border-border">
                <h3 className="text-sm font-medium">Payment Schedule Preview</h3>
              </div>
              <div className="divide-y divide-border">
                {downPaymentAmount > 0 && (
                  <div className="px-4 py-3 flex items-center justify-between bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Down Payment</p>
                        <p className="text-xs text-muted-foreground">Due today</p>
                      </div>
                    </div>
                    <span className="font-semibold text-green-600">
                      ${downPaymentAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                {installmentPreview.map((inst) => (
                  <div key={inst.number} className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Payment {inst.number}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(inst.dueDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold">${inst.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="bg-muted/50 px-4 py-3 border-t border-border flex justify-between">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-bold">
                  ${(downPaymentAmount + remainingAfterDown).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !startDate}
              className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Payment Plan'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Component to display existing payment plan
interface PaymentPlanDisplayProps {
  plan: {
    id: string;
    total_amount: number;
    down_payment?: number;
    number_of_installments: number;
    frequency: string;
    start_date: string;
    status: string;
    installments: Array<{
      id: string;
      installment_number: number;
      amount: number;
      due_date: string;
      status: string;
      paid_at?: string;
    }>;
  };
  onCancel: () => void;
}

export function PaymentPlanDisplay({ plan, onCancel }: PaymentPlanDisplayProps) {
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this payment plan?')) return;
    setCancelling(true);
    await onCancel();
    setCancelling(false);
  };

  const completedCount = plan.installments.filter((i) => i.status === 'paid').length;
  const nextPayment = plan.installments.find((i) => i.status === 'pending');

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Payment Plan</h3>
        </div>
        <span
          className={cn(
            'text-xs px-2 py-1 rounded-full font-medium',
            plan.status === 'active'
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : plan.status === 'completed'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
          )}
        >
          {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
        </span>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">
            {completedCount} of {plan.number_of_installments} payments
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${(completedCount / plan.number_of_installments) * 100}%` }}
          />
        </div>
      </div>

      {/* Next Payment */}
      {nextPayment && plan.status === 'active' && (
        <div className="bg-primary/5 rounded-lg p-3 mb-4">
          <p className="text-xs text-muted-foreground mb-1">Next Payment Due</p>
          <div className="flex items-center justify-between">
            <span className="font-medium">
              {new Date(nextPayment.due_date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="font-bold text-primary">${nextPayment.amount.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Installments List */}
      <div className="space-y-2">
        {plan.installments.map((inst) => (
          <div
            key={inst.id}
            className={cn(
              'flex items-center justify-between py-2 px-3 rounded-lg',
              inst.status === 'paid' && 'bg-green-50 dark:bg-green-900/10',
              inst.status === 'overdue' && 'bg-red-50 dark:bg-red-900/10'
            )}
          >
            <div className="flex items-center gap-2">
              {inst.status === 'paid' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : inst.status === 'overdue' ? (
                <AlertTriangle className="h-4 w-4 text-red-500" />
              ) : (
                <Clock className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm">
                Payment {inst.installment_number}
                <span className="text-muted-foreground ml-2">
                  {new Date(inst.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </span>
            </div>
            <span
              className={cn(
                'text-sm font-medium',
                inst.status === 'paid' && 'text-green-600',
                inst.status === 'overdue' && 'text-red-600'
              )}
            >
              ${inst.amount.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Cancel Button */}
      {plan.status === 'active' && (
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="w-full mt-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
        >
          {cancelling ? 'Cancelling...' : 'Cancel Payment Plan'}
        </button>
      )}
    </div>
  );
}
