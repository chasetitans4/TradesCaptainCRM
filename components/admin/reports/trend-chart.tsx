'use client';

// =====================================================
// TREND CHART COMPONENT
// Shows deals and revenue over time
// Version: 5.8
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';

interface TrendData {
  date: string;
  deals: number;
  revenue: number;
}

interface TrendChartProps {
  data: TrendData[];
  loading: boolean;
}

export function TrendChart({ data, loading }: TrendChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const maxDeals = Math.max(...data.map((d) => d.deals), 1);
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance Trend (6 Months)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No trend data available
          </div>
        ) : (
          <div className="space-y-4">
            {/* Simple Bar Chart */}
            <div className="grid grid-cols-6 gap-2 h-32">
              {data.map((point, index) => {
                const dealsHeight = (point.deals / maxDeals) * 100;
                const revenueHeight = (point.revenue / maxRevenue) * 100;

                return (
                  <div
                    key={index}
                    className="flex flex-col items-center justify-end h-full"
                  >
                    <div className="flex items-end gap-1 h-24 w-full">
                      <div
                        className="flex-1 bg-purple-500 rounded-t transition-all"
                        style={{ height: `${dealsHeight}%` }}
                        title={`${point.deals} deals`}
                      />
                      <div
                        className="flex-1 bg-green-500 rounded-t transition-all"
                        style={{ height: `${revenueHeight}%` }}
                        title={`$${point.revenue} revenue`}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground mt-2">
                      {point.date}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 pt-4 border-t">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-purple-500" />
                <span className="text-sm text-muted-foreground">Deals</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span className="text-sm text-muted-foreground">Revenue</span>
              </div>
            </div>

            {/* Summary Row */}
            <div className="grid grid-cols-6 gap-2 text-center text-xs">
              {data.map((point, index) => (
                <div key={index} className="space-y-1">
                  <div className="font-medium">{point.deals}</div>
                  <div className="text-muted-foreground">
                    ${point.revenue.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
