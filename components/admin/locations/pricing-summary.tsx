'use client';

// =====================================================
// LOCATION PRICING SUMMARY COMPONENT
// Shows multi-location pricing breakdown
// Version: 5.8
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, MapPin, Receipt } from 'lucide-react';

interface LocationPricing {
  base_location_count: number;
  additional_location_count: number;
  base_monthly_cost: number;
  additional_locations_cost: number;
  total_monthly_cost: number;
}

interface PricingSummaryProps {
  pricing: LocationPricing | null;
  loading: boolean;
}

export function PricingSummary({ pricing, loading }: PricingSummaryProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!pricing) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Multi-Location Pricing
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>Base Location</span>
            </div>
            <span className="font-medium">
              ${pricing.base_monthly_cost.toFixed(2)}/mo
            </span>
          </div>

          {pricing.additional_location_count > 0 && (
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  Additional Locations ({pricing.additional_location_count})
                </span>
              </div>
              <span className="font-medium">
                +${pricing.additional_locations_cost.toFixed(2)}/mo
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="font-semibold">Total Monthly</span>
            </div>
            <span className="text-xl font-bold text-primary">
              ${pricing.total_monthly_cost.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
          <strong>Note:</strong> Each additional location adds $100/mo. Multi-location
          discounts may apply for 5+ locations.
        </div>
      </CardContent>
    </Card>
  );
}
