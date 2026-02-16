'use client';

/**
 * Payment Method Selector Component
 *
 * Allows customers to choose between Card and ACH (bank transfer) payments.
 * Shows fee comparison to help customers make informed decisions.
 */

import { useState } from 'react';
import { CreditCard, Building2, Info, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PaymentMethod = 'card' | 'ach';

interface FeeComparison {
  achFee: number;
  cardFee: number;
  savings: number;
  achTotal: number;
  cardTotal: number;
}

interface PaymentMethodSelectorProps {
  /** Invoice amount */
  amount: number;
  /** Currently selected payment method */
  selected: PaymentMethod;
  /** Callback when payment method changes */
  onSelect: (method: PaymentMethod) => void;
  /** Fee comparison data */
  fees?: FeeComparison;
  /** Whether to show fee comparison */
  showFees?: boolean;
  /** Disable ACH option */
  achDisabled?: boolean;
  /** Custom class name */
  className?: string;
}

export function PaymentMethodSelector({
  amount,
  selected,
  onSelect,
  fees,
  showFees = true,
  achDisabled = false,
  className,
}: PaymentMethodSelectorProps) {
  const [showInfo, setShowInfo] = useState(false);

  // Calculate fees if not provided
  const calculatedFees = fees || calculateFees(amount);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Payment Method</h4>
        <button
          type="button"
          onClick={() => setShowInfo(!showInfo)}
          className="text-gray-400 hover:text-gray-600"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {/* Info tooltip */}
      {showInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
          <p className="font-medium mb-2">About Payment Methods</p>
          <ul className="space-y-1 text-blue-700">
            <li>• <strong>Card:</strong> Instant payment, higher processing fee</li>
            <li>• <strong>Bank Transfer (ACH):</strong> Lower fees, 3-5 business days to process</li>
          </ul>
        </div>
      )}

      {/* Payment method options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Card Option */}
        <button
          type="button"
          onClick={() => onSelect('card')}
          className={cn(
            'relative p-4 rounded-xl border-2 text-left transition-all',
            selected === 'card'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'p-2 rounded-lg',
                selected === 'card' ? 'bg-blue-100' : 'bg-gray-100'
              )}
            >
              <CreditCard
                className={cn(
                  'h-5 w-5',
                  selected === 'card' ? 'text-blue-600' : 'text-gray-500'
                )}
              />
            </div>
            <div className="flex-1">
              <p
                className={cn(
                  'font-medium',
                  selected === 'card' ? 'text-blue-900' : 'text-gray-900'
                )}
              >
                Credit/Debit Card
              </p>
              <p className="text-sm text-gray-500">Instant payment</p>
              {showFees && (
                <p className="text-xs text-gray-400 mt-1">
                  Fee: ${calculatedFees.cardFee.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Selected indicator */}
          {selected === 'card' && (
            <div className="absolute top-2 right-2 h-3 w-3 bg-blue-500 rounded-full" />
          )}
        </button>

        {/* ACH Option */}
        <button
          type="button"
          onClick={() => !achDisabled && onSelect('ach')}
          disabled={achDisabled}
          className={cn(
            'relative p-4 rounded-xl border-2 text-left transition-all',
            achDisabled && 'opacity-50 cursor-not-allowed',
            selected === 'ach'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'p-2 rounded-lg',
                selected === 'ach' ? 'bg-green-100' : 'bg-gray-100'
              )}
            >
              <Building2
                className={cn(
                  'h-5 w-5',
                  selected === 'ach' ? 'text-green-600' : 'text-gray-500'
                )}
              />
            </div>
            <div className="flex-1">
              <p
                className={cn(
                  'font-medium',
                  selected === 'ach' ? 'text-green-900' : 'text-gray-900'
                )}
              >
                Bank Transfer (ACH)
              </p>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Clock className="h-3 w-3" />
                <span>3-5 business days</span>
              </div>
              {showFees && (
                <p className="text-xs text-green-600 mt-1 font-medium">
                  Save ${calculatedFees.savings.toFixed(2)} in fees
                </p>
              )}
            </div>
          </div>

          {/* Selected indicator */}
          {selected === 'ach' && (
            <div className="absolute top-2 right-2 h-3 w-3 bg-green-500 rounded-full" />
          )}

          {/* Disabled badge */}
          {achDisabled && (
            <span className="absolute top-2 right-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
              Unavailable
            </span>
          )}
        </button>
      </div>

      {/* Fee comparison summary */}
      {showFees && selected && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">
                {selected === 'card' ? 'Card' : 'ACH'} Processing Fee
              </span>
            </div>
            <span className="font-medium">
              ${selected === 'card'
                ? calculatedFees.cardFee.toFixed(2)
                : calculatedFees.achFee.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t">
            <span className="font-medium text-gray-900">Total Payment</span>
            <span className="font-bold text-lg">
              ${selected === 'card'
                ? calculatedFees.cardTotal.toFixed(2)
                : calculatedFees.achTotal.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* ACH notice */}
      {selected === 'ach' && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            ACH payments typically take <strong>3-5 business days</strong> to process.
            You&apos;ll receive a confirmation email once the payment clears.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Calculate fees for display
 * Card: 2.9% + $0.30
 * ACH: 0.8% capped at $5
 */
function calculateFees(amount: number): FeeComparison {
  const cardFee = (amount * 0.029) + 0.30;
  const achFeePercent = amount * 0.008;
  const achFee = Math.min(achFeePercent, 5.00);

  return {
    achFee: Math.round(achFee * 100) / 100,
    cardFee: Math.round(cardFee * 100) / 100,
    savings: Math.round((cardFee - achFee) * 100) / 100,
    achTotal: Math.round((amount + achFee) * 100) / 100,
    cardTotal: Math.round((amount + cardFee) * 100) / 100,
  };
}

export { calculateFees };
