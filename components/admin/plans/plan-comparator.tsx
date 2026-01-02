'use client';

// =====================================================
// PLAN COMPARATOR
// Side-by-side plan comparison for sales agents
// Version: 5.8.1
// =====================================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, Copy, Mail, Printer, Lightbulb } from 'lucide-react';

interface PlanPricing {
  id: string;
  plan_type: string;
  plan_name: string;
  track: string;
  tier: string;
  monthly_price_cents: number;
  annual_price_cents: number | null;
}

interface ComparisonFeature {
  name: string;
  description: string | null;
  category: string;
  values: Record<string, string>;
}

interface PlanComparison {
  plans: PlanPricing[];
  features: ComparisonFeature[];
  price_difference: number;
  talking_point: string | null;
}

interface PlanComparatorProps {
  defaultPlan1?: string;
  defaultPlan2?: string;
  onCopyComparison?: (text: string) => void;
  onEmailComparison?: (comparison: PlanComparison) => void;
}

const ALL_PLANS = [
  { value: 'leads_captain', label: 'Leads Captain' },
  { value: 'blue_starter', label: 'Blue Starter' },
  { value: 'blue_pro', label: 'Blue Pro' },
  { value: 'blue_enterprise', label: 'Blue Enterprise' },
  { value: 'gold_starter', label: 'Gold Starter' },
  { value: 'gold_pro', label: 'Gold Pro' },
  { value: 'gold_enterprise', label: 'Gold Enterprise' },
  { value: 'web_starter', label: 'Web Starter' },
  { value: 'web_pro', label: 'Web Pro' },
  { value: 'web_enterprise', label: 'Web Enterprise' },
  { value: 'silver_starter', label: 'Silver Starter' },
  { value: 'silver_pro', label: 'Silver Pro' },
  { value: 'silver_enterprise', label: 'Silver Enterprise' },
  { value: 'seo_starter', label: 'Local SEO Foundation' },
  { value: 'seo_pro', label: 'Local SEO Growth' },
  { value: 'seo_enterprise', label: 'Local SEO Dominate' },
];

export function PlanComparator({
  defaultPlan1 = 'blue_pro',
  defaultPlan2 = 'gold_pro',
  onCopyComparison,
  onEmailComparison,
}: PlanComparatorProps) {
  const [plan1, setPlan1] = useState(defaultPlan1);
  const [plan2, setPlan2] = useState(defaultPlan2);
  const [comparison, setComparison] = useState<PlanComparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchComparison() {
      if (!plan1 || !plan2 || plan1 === plan2) return;

      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/admin/plans/compare?plans=${plan1},${plan2}`);
        if (!res.ok) throw new Error('Failed to load comparison');
        const data = await res.json();
        setComparison(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchComparison();
  }, [plan1, plan2]);

  const handleCopy = () => {
    if (!comparison) return;

    const text = generateComparisonText(comparison);
    navigator.clipboard.writeText(text);
    onCopyComparison?.(text);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan Comparator</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Plan Selectors */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Compare</label>
            <Select value={plan1} onValueChange={setPlan1}>
              <SelectTrigger>
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {ALL_PLANS.map((p) => (
                  <SelectItem key={p.value} value={p.value} disabled={p.value === plan2}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <span className="text-text-muted pt-6">vs</span>

          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">With</label>
            <Select value={plan2} onValueChange={setPlan2}>
              <SelectTrigger>
                <SelectValue placeholder="Select plan" />
              </SelectTrigger>
              <SelectContent>
                {ALL_PLANS.map((p) => (
                  <SelectItem key={p.value} value={p.value} disabled={p.value === plan1}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Loading State */}
        {loading && <ComparisonSkeleton />}

        {/* Error State */}
        {error && (
          <div className="text-destructive text-center p-4">
            Error: {error}
          </div>
        )}

        {/* Comparison Table */}
        {comparison && !loading && (
          <>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium">Feature</th>
                    {comparison.plans.map((plan) => (
                      <th key={plan.plan_type} className="text-center p-3 font-medium">
                        <div>{plan.plan_name}</div>
                        <div className="text-sm text-text-muted font-normal">
                          ${plan.monthly_price_cents / 100}/mo
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparison.features.map((feature, idx) => (
                    <tr key={feature.name} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                      <td className="p-3">
                        <div className="font-medium">{feature.name}</div>
                        {feature.description && (
                          <div className="text-xs text-text-muted">{feature.description}</div>
                        )}
                      </td>
                      {comparison.plans.map((plan) => {
                        const value = feature.values[plan.plan_type] || '—';
                        const isIncluded = value !== '✗' && value !== '—';

                        return (
                          <td key={plan.plan_type} className="p-3 text-center">
                            {value === '✓' ? (
                              <CheckCircle className="h-5 w-5 text-success mx-auto" />
                            ) : value === '✗' ? (
                              <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                            ) : (
                              <Badge variant={isIncluded ? 'default' : 'secondary'}>
                                {value}
                              </Badge>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Price Difference */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Price Difference</span>
                <span className="text-lg font-bold text-primary">
                  ${Math.abs(comparison.price_difference) / 100}/mo
                </span>
              </div>
            </div>

            {/* Talking Point */}
            {comparison.talking_point && (
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-warning mt-0.5" />
                  <div>
                    <div className="font-medium mb-1">Talking Point</div>
                    <p className="text-sm text-text-muted">{comparison.talking_point}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>
              {onEmailComparison && (
                <Button variant="outline" onClick={() => onEmailComparison(comparison)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Email to Customer
                </Button>
              )}
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ComparisonSkeleton() {
  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted p-3">
          <div className="flex gap-4">
            <Skeleton className="h-6 flex-1" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-3 flex gap-4">
            <Skeleton className="h-6 flex-1" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

function generateComparisonText(comparison: PlanComparison): string {
  const plan1 = comparison.plans[0];
  const plan2 = comparison.plans[1];

  let text = `PLAN COMPARISON: ${plan1.plan_name} vs ${plan2.plan_name}\n`;
  text += `${'='.repeat(50)}\n\n`;

  text += `PRICING:\n`;
  text += `${plan1.plan_name}: $${plan1.monthly_price_cents / 100}/mo\n`;
  text += `${plan2.plan_name}: $${plan2.monthly_price_cents / 100}/mo\n`;
  text += `Difference: $${Math.abs(comparison.price_difference) / 100}/mo\n\n`;

  text += `FEATURES:\n`;
  comparison.features.forEach((feature) => {
    const val1 = feature.values[plan1.plan_type] || '—';
    const val2 = feature.values[plan2.plan_type] || '—';
    text += `• ${feature.name}: ${val1} | ${val2}\n`;
  });

  if (comparison.talking_point) {
    text += `\nTALKING POINT:\n${comparison.talking_point}\n`;
  }

  return text;
}

export default PlanComparator;
