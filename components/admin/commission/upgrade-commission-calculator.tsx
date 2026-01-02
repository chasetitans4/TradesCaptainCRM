'use client';

// =====================================================
// UPGRADE COMMISSION CALCULATOR
// Calculate commission for client upgrades
// Version: 5.8.1
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  ArrowUpRight,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';

interface UpgradeCommissionResult {
  currentPlan: string;
  newPlan: string;
  priceDifference: number;
  upgradeUpfront: number;
  newRecurring: {
    rate10: number;
    rate15: number;
    months10: number;
    months15: number;
    total: number;
  };
  continuedOriginalRecurring: {
    rate: number;
    monthsRemaining: number;
    total: number;
  };
  totalUpgradeCommission: number;
  notes: string[];
}

const ALL_PLANS = [
  { slug: 'leads_captain', name: 'Leads Captain', price: 29 },
  { slug: 'blue_starter', name: 'Blue Starter', price: 49 },
  { slug: 'blue_pro', name: 'Blue Pro', price: 99 },
  { slug: 'blue_enterprise', name: 'Blue Enterprise', price: 199 },
  { slug: 'web_starter', name: 'Web Starter', price: 149 },
  { slug: 'web_pro', name: 'Web Pro', price: 249 },
  { slug: 'web_enterprise', name: 'Web Enterprise', price: 349 },
  { slug: 'silver_starter', name: 'Silver Starter', price: 199 },
  { slug: 'silver_pro', name: 'Silver Pro', price: 349 },
  { slug: 'silver_enterprise', name: 'Silver Enterprise', price: 449 },
  { slug: 'gold_starter', name: 'Gold Starter', price: 249 },
  { slug: 'gold_pro', name: 'Gold Pro', price: 399 },
  { slug: 'gold_enterprise', name: 'Gold Enterprise', price: 549 },
  { slug: 'local_seo_starter', name: 'Local SEO Starter', price: 99 },
  { slug: 'local_seo_pro', name: 'Local SEO Pro', price: 199 },
];

interface UpgradeCommissionCalculatorProps {
  defaultCurrentPlan?: string;
  defaultNewPlan?: string;
  defaultCustomerMonth?: number;
}

export function UpgradeCommissionCalculator({
  defaultCurrentPlan = 'nevermiss',
  defaultNewPlan = 'blue_pro',
  defaultCustomerMonth = 3,
}: UpgradeCommissionCalculatorProps) {
  const [currentPlanSlug, setCurrentPlanSlug] = useState(defaultCurrentPlan);
  const [newPlanSlug, setNewPlanSlug] = useState(defaultNewPlan);
  const [customerMonth, setCustomerMonth] = useState(defaultCustomerMonth);
  const [isRateLocked, setIsRateLocked] = useState(false);
  const [calculation, setCalculation] = useState<UpgradeCommissionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-set rate locked based on customer month
  useEffect(() => {
    setIsRateLocked(customerMonth >= 6);
  }, [customerMonth]);

  const currentPlan = ALL_PLANS.find((p) => p.slug === currentPlanSlug);
  const newPlan = ALL_PLANS.find((p) => p.slug === newPlanSlug);

  // Filter available upgrade plans (must be higher price)
  const upgradePlans = ALL_PLANS.filter((p) => currentPlan && p.price > currentPlan.price);

  const fetchCalculation = useCallback(async () => {
    if (!currentPlanSlug || !newPlanSlug) return;
    if (currentPlan && newPlan && newPlan.price <= currentPlan.price) {
      setError('New plan must be higher priced');
      setCalculation(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/commission/calculate-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPlanSlug,
          newPlanSlug,
          customerMonth,
          isRateLocked,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to calculate');
      }

      const data = await res.json();
      setCalculation(data.calculation);
    } catch (err: any) {
      setError(err.message);
      setCalculation(null);
    } finally {
      setLoading(false);
    }
  }, [currentPlanSlug, newPlanSlug, customerMonth, isRateLocked, currentPlan, newPlan]);

  useEffect(() => {
    fetchCalculation();
  }, [fetchCalculation]);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <ArrowUpRight className="h-5 w-5 text-primary" />
          Upgrade Commission Calculator
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Plan */}
        <div className="bg-muted/50 rounded-lg p-4">
          <label className="text-sm font-medium mb-2 block">Current Plan</label>
          <Select value={currentPlanSlug} onValueChange={setCurrentPlanSlug}>
            <SelectTrigger>
              <SelectValue placeholder="Select current plan" />
            </SelectTrigger>
            <SelectContent>
              {ALL_PLANS.map((plan) => (
                <SelectItem key={plan.slug} value={plan.slug}>
                  {plan.name} — ${plan.price}/mo
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-sm text-text-muted mb-1 block">Customer Month</label>
              <Select
                value={customerMonth.toString()}
                onValueChange={(v) => setCustomerMonth(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      Month {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 pt-6">
              <Switch
                id="rate-locked"
                checked={isRateLocked}
                onCheckedChange={setIsRateLocked}
              />
              <Label htmlFor="rate-locked" className="text-sm">
                15% Rate Locked
              </Label>
            </div>
          </div>
        </div>

        {/* Upgrade To */}
        <div>
          <label className="text-sm font-medium mb-2 block">Upgrade To</label>
          <Select value={newPlanSlug} onValueChange={setNewPlanSlug}>
            <SelectTrigger>
              <SelectValue placeholder="Select new plan" />
            </SelectTrigger>
            <SelectContent>
              {upgradePlans.map((plan) => (
                <SelectItem key={plan.slug} value={plan.slug}>
                  {plan.name} — ${plan.price}/mo
                  {currentPlan && (
                    <span className="text-primary ml-2">
                      (+${plan.price - currentPlan.price})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Error */}
        {error && (
          <div className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && <UpgradeCommissionSkeleton />}

        {/* Results */}
        {calculation && !loading && (
          <UpgradeBreakdown calculation={calculation} />
        )}
      </CardContent>
    </Card>
  );
}

function UpgradeBreakdown({ calculation }: { calculation: UpgradeCommissionResult }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Upgrade Commission</h4>
        <Badge variant="outline">
          +${calculation.priceDifference.toFixed(0)}/mo
        </Badge>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        {/* Price Difference */}
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Price Difference</span>
          <span>
            ${calculation.priceDifference.toFixed(0)}/mo
          </span>
        </div>

        <Separator />

        {/* Upfront on Difference */}
        <div className="flex justify-between">
          <span className="text-text-muted">Upfront (50% of diff)</span>
          <span className="font-semibold">${calculation.upgradeUpfront.toFixed(2)}</span>
        </div>

        <Separator />

        {/* New Recurring on Difference */}
        <div className="space-y-2">
          <span className="text-sm text-text-muted">New Recurring on Difference:</span>
          <div className="flex justify-between text-sm pl-4">
            <span>M3-M5 (10%)</span>
            <span>
              ${calculation.newRecurring.rate10.toFixed(2)}/mo × {calculation.newRecurring.months10} = ${(calculation.newRecurring.rate10 * calculation.newRecurring.months10).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm pl-4">
            <span>M6-M14 (15%)</span>
            <span>
              ${calculation.newRecurring.rate15.toFixed(2)}/mo × {calculation.newRecurring.months15} = ${(calculation.newRecurring.rate15 * calculation.newRecurring.months15).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Original Recurring Continues */}
        {calculation.continuedOriginalRecurring.monthsRemaining > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <span className="text-sm text-text-muted">Original Plan Recurring Continues:</span>
              <div className="flex justify-between text-sm pl-4">
                <span>Remaining months</span>
                <span>
                  ${calculation.continuedOriginalRecurring.rate.toFixed(2)}/mo × {calculation.continuedOriginalRecurring.monthsRemaining} = ${calculation.continuedOriginalRecurring.total.toFixed(2)}
                </span>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Total */}
        <div className="flex justify-between items-center pt-2">
          <span className="font-bold text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            Upgrade Commission
          </span>
          <span className="font-bold text-2xl text-success">
            ${calculation.totalUpgradeCommission.toFixed(2)}
          </span>
        </div>

        {calculation.continuedOriginalRecurring.total > 0 && (
          <div className="text-sm text-text-muted text-center">
            + ${calculation.continuedOriginalRecurring.total.toFixed(2)} continued original recurring
          </div>
        )}
      </div>

      {/* Notes */}
      {calculation.notes.length > 0 && (
        <div className="space-y-2">
          {calculation.notes.map((note, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 text-sm ${
                note.startsWith('⚠️') ? 'text-warning' : 'text-success'
              }`}
            >
              {note.startsWith('⚠️') ? (
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              ) : (
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              )}
              <span>{note.replace(/^[⚠️✓]\s*/, '')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UpgradeCommissionSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
  );
}

export default UpgradeCommissionCalculator;
