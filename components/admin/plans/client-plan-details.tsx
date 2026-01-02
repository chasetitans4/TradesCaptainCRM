'use client';

// =====================================================
// CLIENT PLAN DETAILS TAB
// Shows current plan + upgrade options for a client
// Version: 5.8.1
// =====================================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  Calendar,
  ArrowUpRight,
  Lightbulb,
  TrendingUp,
  DollarSign,
} from 'lucide-react';

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

interface UpgradeOption {
  plan: PlanPricing;
  path: PlanUpgradePath;
  commission_upfront: number;
  commission_recurring: number;
}

interface ClientUpgradeData {
  client: {
    id: string;
    business_name: string;
    months_as_customer: number;
  };
  current_plan: PlanPricing;
  current_usage?: {
    sms_used: number;
    sms_limit: number;
    percentage: number;
  };
  upgrade_options: UpgradeOption[];
  suggested_upgrade?: string;
  suggestion_reason?: string;
}

interface ClientPlanDetailsProps {
  clientId: string;
  onUpgrade?: (toPlanType: string) => void;
}

export function ClientPlanDetails({ clientId, onUpgrade }: ClientPlanDetailsProps) {
  const [data, setData] = useState<ClientUpgradeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/clients/${clientId}/upgrade-options`);
        if (!res.ok) throw new Error('Failed to load client plan details');
        const result = await res.json();
        setData(result);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [clientId]);

  if (loading) {
    return <ClientPlanDetailsSkeleton />;
  }

  if (error || !data) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <p className="text-destructive">Error loading plan details: {error}</p>
        </CardContent>
      </Card>
    );
  }

  const { client, current_plan, current_usage, upgrade_options, suggested_upgrade, suggestion_reason } = data;
  const monthlyPrice = current_plan.monthly_price_cents / 100;

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan: {current_plan.plan_name}</CardTitle>
              <CardDescription>
                Since: {client.months_as_customer} month{client.months_as_customer !== 1 ? 's' : ''} ago
              </CardDescription>
            </div>
            <Badge variant="default" className="text-lg px-4 py-2">
              ${monthlyPrice}/mo
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* SMS Usage */}
          {current_usage && (
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span className="font-medium">Leads Captain AI SMS Usage</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>This Period</span>
                  <span className="font-medium">
                    {current_usage.sms_used.toLocaleString()} / {current_usage.sms_limit.toLocaleString()}
                    <span className="text-text-muted ml-2">({current_usage.percentage}%)</span>
                  </span>
                </div>
                <Progress
                  value={current_usage.percentage}
                  className={`h-3 ${
                    current_usage.percentage >= 100
                      ? 'bg-destructive/20'
                      : current_usage.percentage >= 80
                      ? 'bg-warning/20'
                      : ''
                  }`}
                />
                {current_usage.percentage >= 80 && (
                  <p className="text-sm text-warning">
                    {current_usage.percentage >= 100
                      ? 'SMS limit reached — customer is still receiving service'
                      : 'Approaching SMS limit — consider discussing usage or upgrade'}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* What's Included */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              What&apos;s Included in {current_plan.plan_name}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {getPlanIncludedFeatures(current_plan.plan_type).map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Opportunity */}
      {suggested_upgrade && suggestion_reason && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium">Upgrade Opportunity</h4>
                <p className="text-sm text-text-muted mt-1">{suggestion_reason}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not Included — Upgrade Options */}
      {upgrade_options.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-muted-foreground" />
              Not Included — Upgrade Options
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {upgrade_options.map(({ plan, path, commission_upfront, commission_recurring }) => (
              <div
                key={path.id}
                className={`p-4 rounded-lg border ${
                  path.is_recommended ? 'border-primary bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{plan.plan_name}</span>
                      <Badge variant={path.is_recommended ? 'default' : 'outline'}>
                        +${path.price_difference_cents / 100}/mo
                      </Badge>
                      {path.is_recommended && (
                        <Badge variant="secondary" className="bg-warning/20 text-warning-foreground">
                          Recommended
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-text-muted">
                      <TrendingUp className="h-4 w-4 inline mr-1" />
                      {path.benefits_summary}
                    </p>

                    {/* Commission Info */}
                    <div className="flex items-center gap-4 text-sm bg-muted/50 rounded-lg p-2 mt-2">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-success" />
                        <span>
                          <strong>${commission_upfront.toFixed(0)}</strong> upfront
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-text-muted">+</span>
                        <span>
                          <strong>${commission_recurring.toFixed(2)}</strong>/mo recurring
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant={path.is_recommended ? 'default' : 'outline'}
                    onClick={() => onUpgrade?.(plan.plan_type)}
                  >
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                    Upgrade
                  </Button>
                </div>

                {path.talking_point && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-sm text-text-muted italic">
                      &ldquo;{path.talking_point}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ClientPlanDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper to get included features based on plan type
function getPlanIncludedFeatures(planType: string): string[] {
  const baseFeatures: Record<string, string[]> = {
    leads_captain: ['Leads Captain AI SMS', 'Lead Capture', 'Mobile Notifications'],
    blue_starter: ['Full CRM & Database', 'Calendar & Scheduling', 'Job Tracking', 'Quotes & Invoicing', 'Mobile App'],
    blue_pro: ['Full CRM & Database', 'Calendar & Scheduling', 'Job Tracking', 'Quotes & Invoicing', 'Leads Captain AI SMS (1,000)', 'Mobile App'],
    blue_enterprise: ['Full CRM & Database', 'Calendar & Scheduling', 'Job Tracking', 'Quotes & Invoicing', 'Leads Captain AI SMS (1,500)', 'Priority Support', 'Dedicated Manager'],
    gold_starter: ['Full CRM & Database', 'Calendar & Scheduling', 'Leads Captain AI SMS (700)', 'Professional Website (5 pages)', 'Local SEO (15 citations)', 'GBP Management'],
    gold_pro: ['Full CRM & Database', 'Calendar & Scheduling', 'Leads Captain AI SMS (1,000)', 'Professional Website (10 pages)', 'Local SEO (25 citations)', 'GBP Management', 'Monthly SEO Reports'],
    gold_enterprise: ['Full CRM & Database', 'Calendar & Scheduling', 'Leads Captain AI SMS (1,500)', 'Professional Website (15 pages)', 'Local SEO (40 citations)', 'GBP Management', 'Priority Support', 'Dedicated Manager'],
  };

  return baseFeatures[planType] || ['Contact support for plan details'];
}

export default ClientPlanDetails;
