'use client';

// =====================================================
// PLAN DETAILS PANEL
// Shows complete plan information for sales agents
// Version: 5.8.1
// =====================================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, MessageSquare, Calendar, ArrowUpRight } from 'lucide-react';

interface PlanFeature {
  id: string;
  feature_name: string;
  feature_description: string | null;
  feature_category: string;
  is_included: boolean;
  display_value: string | null;
  display_order: number;
}

interface PlanPricing {
  id: string;
  plan_type: string;
  plan_name: string;
  track: string;
  tier: string;
  monthly_price_cents: number;
  annual_price_cents: number | null;
  best_for: string | null;
}

interface PlanUpgradePath {
  id: string;
  from_plan_type: string;
  to_plan_type: string;
  price_difference_cents: number;
  is_recommended: boolean;
  benefits_summary: string | null;
  talking_point: string | null;
}

interface PlanDetails {
  plan: PlanPricing;
  features: {
    included: PlanFeature[];
    not_included: PlanFeature[];
  };
  sms: {
    included: number;
    has_nevermiss: boolean;
    has_calendar_booking: boolean;
  };
  upgradePaths: PlanUpgradePath[];
}

interface PlanDetailsPanelProps {
  planType: string;
  showUpgrades?: boolean;
  smsUsage?: { used: number; limit: number };
  onSelectPlan?: (planType: string) => void;
  onUpgrade?: (toPlanType: string) => void;
}

export function PlanDetailsPanel({
  planType,
  showUpgrades = true,
  smsUsage,
  onSelectPlan,
  onUpgrade,
}: PlanDetailsPanelProps) {
  const [details, setDetails] = useState<PlanDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetails() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/plans/${planType}`);
        if (!res.ok) throw new Error('Failed to load plan details');
        const data = await res.json();
        setDetails(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDetails();
  }, [planType]);

  if (loading) {
    return <PlanDetailsSkeleton />;
  }

  if (error || !details) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <p className="text-destructive">Error loading plan details: {error}</p>
        </CardContent>
      </Card>
    );
  }

  const { plan, features, sms, upgradePaths } = details;
  const monthlyPrice = plan.monthly_price_cents / 100;
  const annualPrice = plan.annual_price_cents ? plan.annual_price_cents / 100 : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">{plan.plan_name}</CardTitle>
            <CardDescription>{plan.best_for}</CardDescription>
          </div>
          <Badge variant={plan.track === 'gold' ? 'default' : 'secondary'} className="text-sm">
            {plan.track.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Pricing */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">${monthlyPrice}</span>
            <span className="text-text-muted">/month</span>
          </div>
          {annualPrice && (
            <p className="text-sm text-text-muted mt-1">
              or ${annualPrice}/year (save 10%)
            </p>
          )}
        </div>

        {/* SMS Usage (if applicable) */}
        {sms.has_nevermiss && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="font-medium">Leads Captain AI SMS</span>
              <Badge variant="outline" className="ml-auto">
                {sms.included.toLocaleString()}/mo
              </Badge>
            </div>
            {smsUsage && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Current Usage</span>
                  <span>{smsUsage.used.toLocaleString()} / {smsUsage.limit.toLocaleString()}</span>
                </div>
                <Progress
                  value={(smsUsage.used / smsUsage.limit) * 100}
                  className="h-2"
                />
              </div>
            )}
            {sms.has_calendar_booking && (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Calendar className="h-4 w-4" />
                <span>Calendar booking via SMS enabled</span>
              </div>
            )}
          </div>
        )}

        {/* Included Features */}
        <div className="space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            What&apos;s Included
          </h4>
          <ul className="space-y-2">
            {features.included.map((feature) => (
              <li key={feature.id} className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                <span>
                  {feature.feature_name}
                  {feature.display_value && feature.display_value !== '✓' && (
                    <span className="text-primary ml-1">({feature.display_value})</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Not Included */}
        {features.not_included.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-muted-foreground" />
              Not Included — Upgrade Options
            </h4>
            <ul className="space-y-2">
              {features.not_included.map((feature) => (
                <li key={feature.id} className="flex items-start gap-2 text-sm text-text-muted">
                  <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{feature.feature_name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Upgrade Paths */}
        {showUpgrades && upgradePaths.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium">Upgrade Options</h4>
            <div className="space-y-2">
              {upgradePaths.map((path) => (
                <div
                  key={path.id}
                  className={`p-3 rounded-lg border ${
                    path.is_recommended ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{path.to_plan_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                        {path.is_recommended && (
                          <Badge variant="default" className="text-xs">Recommended</Badge>
                        )}
                      </div>
                      <p className="text-sm text-text-muted mt-1">
                        +${path.price_difference_cents / 100}/mo — {path.benefits_summary}
                      </p>
                    </div>
                    {onUpgrade && (
                      <Button
                        size="sm"
                        variant={path.is_recommended ? 'default' : 'outline'}
                        onClick={() => onUpgrade(path.to_plan_type)}
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Select Button */}
        {onSelectPlan && (
          <Button className="w-full" onClick={() => onSelectPlan(plan.plan_type)}>
            Select {plan.plan_name}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function PlanDetailsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48 mt-2" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default PlanDetailsPanel;
