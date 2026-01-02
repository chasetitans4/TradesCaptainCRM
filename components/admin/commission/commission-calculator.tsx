'use client';

// =====================================================
// COMMISSION CALCULATOR COMPONENT
// Interactive calculator for sales agents
// Version: 5.8.1
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  DollarSign,
  Copy,
  TrendingUp,
  Calendar,
  AlertCircle,
  Check,
  Star,
} from 'lucide-react';

interface RecurringBreakdown {
  rate10: number;
  rate15: number;
  months10: number;
  months15: number;
  total10: number;
  total15: number;
  totalRecurring: number;
}

interface BonusBreakdown {
  month3: number;
  month4: number;
  month6: number;
  month12: number;
  total: number;
}

interface CommissionResult {
  planName: string;
  planPrice: number;
  effectivePrice: number;
  billingPeriod: 'monthly' | 'annual';
  offerApplied?: string;
  upfront: number;
  upfrontDate: string;
  recurring: RecurringBreakdown;
  bonuses: BonusBreakdown;
  maxCommission: number;
  notes: string[];
}

const PLAN_TRACKS = [
  {
    track: 'leads_captain',
    name: 'Leads Captain',
    plans: [
      { slug: 'leads_captain', name: 'Leads Captain', price: 29 },
    ],
  },
  {
    track: 'blue',
    name: 'Blue (CRM)',
    plans: [
      { slug: 'blue_starter', name: 'Blue Starter', price: 49 },
      { slug: 'blue_pro', name: 'Blue Pro', price: 99 },
      { slug: 'blue_enterprise', name: 'Blue Enterprise', price: 199 },
    ],
  },
  {
    track: 'web',
    name: 'Web',
    plans: [
      { slug: 'web_starter', name: 'Web Starter', price: 149 },
      { slug: 'web_pro', name: 'Web Pro', price: 249 },
      { slug: 'web_enterprise', name: 'Web Enterprise', price: 349 },
    ],
  },
  {
    track: 'silver',
    name: 'Silver',
    plans: [
      { slug: 'silver_starter', name: 'Silver Starter', price: 199 },
      { slug: 'silver_pro', name: 'Silver Pro', price: 349 },
      { slug: 'silver_enterprise', name: 'Silver Enterprise', price: 449 },
    ],
  },
  {
    track: 'gold',
    name: 'Gold',
    plans: [
      { slug: 'gold_starter', name: 'Gold Starter', price: 249 },
      { slug: 'gold_pro', name: 'Gold Pro', price: 399 },
      { slug: 'gold_enterprise', name: 'Gold Enterprise', price: 549 },
    ],
  },
  {
    track: 'local_seo',
    name: 'Local SEO',
    plans: [
      { slug: 'local_seo_starter', name: 'Local SEO Starter', price: 99 },
      { slug: 'local_seo_pro', name: 'Local SEO Pro', price: 199 },
    ],
  },
];

const OFFERS = [
  { code: '', name: 'None' },
  { code: 'FIRST50', name: 'FIRST50 — 50% off first month' },
  { code: 'FREETRIAL14', name: 'FREETRIAL14 — 14-day free trial' },
  { code: 'ANNUAL15', name: 'ANNUAL15 — 15% off annual (auto-applied)' },
  { code: 'VIP20', name: 'VIP20 — 20% off forever (requires approval)' },
];

interface CommissionCalculatorProps {
  onCalculate?: (result: CommissionResult) => void;
  defaultPlan?: string;
}

export function CommissionCalculator({ onCalculate, defaultPlan }: CommissionCalculatorProps) {
  const [track, setTrack] = useState('gold');
  const [planSlug, setPlanSlug] = useState(defaultPlan || 'gold_pro');
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [offerCode, setOfferCode] = useState('');
  const [calculation, setCalculation] = useState<CommissionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentTrack = PLAN_TRACKS.find((t) => t.track === track);

  const fetchCalculation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/commission/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planSlug,
          billingPeriod: billing,
          offerCode: offerCode || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to calculate');

      const data = await res.json();
      setCalculation(data.calculation);
      onCalculate?.(data.calculation);
    } catch (err) {
      console.error('Commission calculation error:', err);
    } finally {
      setLoading(false);
    }
  }, [planSlug, billing, offerCode, onCalculate]);

  useEffect(() => {
    fetchCalculation();
  }, [fetchCalculation]);

  const handleTrackChange = (newTrack: string) => {
    setTrack(newTrack);
    const trackData = PLAN_TRACKS.find((t) => t.track === newTrack);
    if (trackData && trackData.plans.length > 0) {
      setPlanSlug(trackData.plans[0].slug);
    }
  };

  const handleCopy = () => {
    if (!calculation) return;

    const text = generateSummaryText(calculation);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-success" />
          Commission Calculator
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Plan Selection */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Track</label>
            <Select value={track} onValueChange={handleTrackChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select track" />
              </SelectTrigger>
              <SelectContent>
                {PLAN_TRACKS.map((t) => (
                  <SelectItem key={t.track} value={t.track}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Plan</label>
            <div className="space-y-2">
              {currentTrack?.plans.map((plan) => (
                <label
                  key={plan.slug}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    planSlug === plan.slug
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="plan"
                      value={plan.slug}
                      checked={planSlug === plan.slug}
                      onChange={() => setPlanSlug(plan.slug)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        planSlug === plan.slug ? 'border-primary' : 'border-muted-foreground'
                      }`}
                    >
                      {planSlug === plan.slug && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="font-medium">{plan.name}</span>
                  </div>
                  <span className="text-text-muted">${plan.price}/mo</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Billing Period */}
        <div>
          <label className="text-sm font-medium mb-2 block">Billing</label>
          <div className="flex gap-2">
            <Button
              variant={billing === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBilling('monthly')}
              className="flex-1"
            >
              Monthly
            </Button>
            <Button
              variant={billing === 'annual' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setBilling('annual')}
              className="flex-1"
            >
              Annual
            </Button>
          </div>
        </div>

        {/* Offer Selection */}
        <div>
          <label className="text-sm font-medium mb-2 block">Offer (Optional)</label>
          <Select value={offerCode} onValueChange={setOfferCode}>
            <SelectTrigger>
              <SelectValue placeholder="Select offer" />
            </SelectTrigger>
            <SelectContent>
              {OFFERS.map((offer) => (
                <SelectItem key={offer.code || 'none'} value={offer.code}>
                  {offer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Commission Breakdown */}
        {loading ? (
          <CommissionSkeleton />
        ) : calculation ? (
          <CommissionBreakdown calculation={calculation} />
        ) : null}

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopy} className="flex-1">
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Summary
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CommissionBreakdown({ calculation }: { calculation: CommissionResult }) {
  const isAnnual = calculation.billingPeriod === 'annual';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Your Commission</h4>
        {calculation.offerApplied && (
          <Badge variant="secondary">{calculation.offerApplied}</Badge>
        )}
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        {/* Upfront */}
        <div className="flex justify-between">
          <span className="text-text-muted">
            {isAnnual ? 'Annual Commission (35%)' : `Upfront (${calculation.upfrontDate})`}
          </span>
          <span className="font-semibold">${calculation.upfront.toFixed(2)}</span>
        </div>

        {!isAnnual && (
          <>
            <Separator />

            {/* Recurring */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">
                  Recurring M3-M5 (10%)
                </span>
                <span>
                  ${calculation.recurring.rate10.toFixed(2)}/mo × {calculation.recurring.months10} = ${calculation.recurring.total10.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted flex items-center gap-1">
                  Recurring M6-M14 (15%)
                  <Star className="h-3 w-3 text-warning" />
                </span>
                <span>
                  ${calculation.recurring.rate15.toFixed(2)}/mo × {calculation.recurring.months15} = ${calculation.recurring.total15.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-medium pt-1">
                <span>Total Recurring</span>
                <span>${calculation.recurring.totalRecurring.toFixed(2)}</span>
              </div>
            </div>

            <Separator />

            {/* Retention Bonuses */}
            <div className="space-y-2">
              <span className="text-sm text-text-muted">Retention Bonuses</span>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span>Month 3 Check-In</span>
                  <span>${calculation.bonuses.month3.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Month 4 Retained</span>
                  <span>${calculation.bonuses.month4.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Month 6 Retained</span>
                  <span>${calculation.bonuses.month6.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Month 12 Retained</span>
                  <span>${calculation.bonuses.month12.toFixed(0)}</span>
                </div>
              </div>
              <div className="flex justify-between font-medium pt-1">
                <span>Total Bonuses</span>
                <span>${calculation.bonuses.total.toFixed(2)}</span>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Max Commission */}
        <div className="flex justify-between items-center pt-2">
          <span className="font-bold text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success" />
            {isAnnual ? 'Total Commission' : 'Max Potential'}
          </span>
          <span className="font-bold text-2xl text-success">
            ${calculation.maxCommission.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Notes */}
      {calculation.notes.length > 0 && (
        <div className="space-y-2">
          {calculation.notes.map((note, idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm text-text-muted">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{note}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CommissionSkeleton() {
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

function generateSummaryText(calc: CommissionResult): string {
  const lines = [
    `COMMISSION SUMMARY`,
    `==================`,
    `Plan: ${calc.planName}`,
    `Price: $${calc.planPrice}/mo`,
    `Billing: ${calc.billingPeriod}`,
    calc.offerApplied ? `Offer: ${calc.offerApplied}` : null,
    ``,
    `BREAKDOWN:`,
    `Upfront: $${calc.upfront.toFixed(2)}`,
  ];

  if (calc.billingPeriod === 'monthly') {
    lines.push(
      `Recurring (10% M3-5): $${calc.recurring.total10.toFixed(2)}`,
      `Recurring (15% M6-14): $${calc.recurring.total15.toFixed(2)}`,
      `Total Recurring: $${calc.recurring.totalRecurring.toFixed(2)}`,
      `Retention Bonuses: $${calc.bonuses.total.toFixed(2)}`,
      ``
    );
  }

  lines.push(
    `==================`,
    `MAX COMMISSION: $${calc.maxCommission.toFixed(2)}`
  );

  return lines.filter(Boolean).join('\n');
}

export default CommissionCalculator;
