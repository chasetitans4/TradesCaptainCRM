'use client';

// =====================================================
// COMMISSION QUICK REFERENCE PANEL
// Quick rates and bonuses reference for sidebar
// Version: 5.8.1
// =====================================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Star, DollarSign, Calendar, TrendingUp } from 'lucide-react';

interface CommissionRates {
  upfront: number;
  recurring10: number;
  recurring15: number;
  annual: number;
}

interface BonusBreakdown {
  month3: number;
  month4: number;
  month6: number;
  month12: number;
  total: number;
}

export function CommissionQuickReference() {
  const [rates, setRates] = useState<CommissionRates | null>(null);
  const [bonuses, setBonuses] = useState<BonusBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReference() {
      try {
        const res = await fetch('/api/admin/commission/reference');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setRates(data.rates);
        setBonuses(data.bonuses);
      } catch (err) {
        // Use defaults if fetch fails
        setRates({ upfront: 50, recurring10: 10, recurring15: 15, annual: 35 });
        setBonuses({ month3: 15, month4: 25, month6: 50, month12: 100, total: 190 });
      } finally {
        setLoading(false);
      }
    }

    fetchReference();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Quick Reference
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        {/* Rates */}
        <div className="space-y-1">
          <div className="font-medium flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Rates
          </div>
          <ul className="text-text-muted space-y-0.5 pl-4">
            <li>Upfront: {rates?.upfront}% (after M2)</li>
            <li>Recurring M3-5: {rates?.recurring10}%</li>
            <li className="flex items-center gap-1">
              Recurring M6-14: {rates?.recurring15}%
              <Star className="h-3 w-3 text-warning" />
            </li>
            <li>Annual: {rates?.annual}% one-time</li>
          </ul>
        </div>

        <Separator />

        {/* Retention Bonuses */}
        <div className="space-y-1">
          <div className="font-medium flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Retention Bonuses
          </div>
          <ul className="text-text-muted space-y-0.5 pl-4">
            <li>Month 3: ${bonuses?.month3}</li>
            <li>Month 4: ${bonuses?.month4}</li>
            <li>Month 6: ${bonuses?.month6} + 15% rate</li>
            <li>Month 12: ${bonuses?.month12}</li>
            <li className="font-medium text-foreground">Total: ${bonuses?.total}</li>
          </ul>
        </div>

        <Separator />

        {/* 15% Rate Bump */}
        <div className="space-y-1">
          <div className="font-medium flex items-center gap-1">
            <Star className="h-3 w-3 text-warning" />
            15% Rate Bump
          </div>
          <ul className="text-text-muted space-y-0.5 pl-4 text-xs">
            <li>Unlocks at Month 6</li>
            <li>LOCKED IN forever</li>
            <li>Upgrade after M6 = 15%</li>
            <li>Upgrade before M6 = reset</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default CommissionQuickReference;
