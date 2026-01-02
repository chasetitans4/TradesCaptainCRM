'use client';

// =====================================================
// PLAN SELECTION SCREEN
// For new sale flow - shows all plan tracks
// Version: 5.8.1
// =====================================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlanDetailsPanel } from './plan-details-panel';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface PlanPricing {
  id: string;
  plan_type: string;
  plan_name: string;
  track: string;
  tier: string;
  monthly_price_cents: number;
  annual_price_cents: number | null;
  best_for: string | null;
  display_order: number;
}

interface TrackSummary {
  track: string;
  name: string;
  price_range: string;
  description: string;
  plans: PlanPricing[];
}

interface PlanSelectionProps {
  onSelectPlan: (planType: string, tier: string) => void;
  selectedPlan?: string;
}

export function PlanSelection({ onSelectPlan, selectedPlan }: PlanSelectionProps) {
  const [tracks, setTracks] = useState<TrackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTrack, setActiveTrack] = useState('blue');
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTracks() {
      try {
        setLoading(true);
        const res = await fetch('/api/admin/plans?format=tracks');
        if (!res.ok) throw new Error('Failed to load plans');
        const data = await res.json();
        setTracks(data.tracks || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTracks();
  }, []);

  if (loading) {
    return <PlanSelectionSkeleton />;
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="p-6">
          <p className="text-destructive">Error loading plans: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Select a Plan</CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTrack} onValueChange={setActiveTrack}>
          <TabsList className="grid w-full grid-cols-6 mb-6">
            {tracks.map((track) => (
              <TabsTrigger key={track.track} value={track.track} className="text-xs sm:text-sm">
                {track.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {tracks.map((track) => (
            <TabsContent key={track.track} value={track.track}>
              <div className="space-y-4">
                {/* Track Description */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{track.name}</h3>
                      <p className="text-text-muted">{track.description}</p>
                    </div>
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      {track.price_range}
                    </Badge>
                  </div>
                </div>

                {/* Plan Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  {track.plans.map((plan) => (
                    <div key={plan.plan_type}>
                      <Card
                        className={`cursor-pointer transition-all ${
                          selectedPlan === plan.plan_type
                            ? 'border-primary ring-2 ring-primary/20'
                            : 'hover:border-primary/50'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-semibold">{plan.plan_name}</h4>
                              <p className="text-sm text-text-muted capitalize">{plan.tier}</p>
                            </div>
                            {plan.tier === 'pro' && (
                              <Badge variant="default">Popular</Badge>
                            )}
                          </div>

                          <div className="mb-4">
                            <span className="text-2xl font-bold">
                              ${plan.monthly_price_cents / 100}
                            </span>
                            <span className="text-text-muted">/mo</span>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant={selectedPlan === plan.plan_type ? 'default' : 'outline'}
                              className="flex-1"
                              onClick={() => onSelectPlan(plan.plan_type, plan.tier)}
                            >
                              {selectedPlan === plan.plan_type ? 'Selected' : 'Select'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedPlan(
                                  expandedPlan === plan.plan_type ? null : plan.plan_type
                                );
                              }}
                            >
                              {expandedPlan === plan.plan_type ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Expanded Details */}
                      {expandedPlan === plan.plan_type && (
                        <div className="mt-4">
                          <PlanDetailsPanel
                            planType={plan.plan_type}
                            showUpgrades={false}
                            onSelectPlan={() => onSelectPlan(plan.plan_type, plan.tier)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Important Note for Blue Starter */}
                {track.track === 'blue' && (
                  <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 mt-4">
                    <p className="text-sm">
                      <strong>Note:</strong> Blue Starter does NOT include Leads Captain AI SMS.
                      For AI missed call text-back, recommend Blue Pro or higher.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function PlanSelectionSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-10 w-full mb-6" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default PlanSelection;
