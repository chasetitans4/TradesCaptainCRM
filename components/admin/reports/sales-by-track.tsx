'use client';

// =====================================================
// SALES BY TRACK COMPONENT
// Shows breakdown by plan track
// Version: 5.8
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PieChart } from 'lucide-react';

interface TrackSale {
  track: string;
  deals: number;
  revenue_monthly: number;
  percentage: number;
  avg_commission: number;
}

interface SalesByTrackProps {
  sales: TrackSale[];
  loading: boolean;
}

export function SalesByTrack({ sales, loading }: SalesByTrackProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Sales by Track
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getTrackColor = (track: string) => {
    const colors: Record<string, string> = {
      nevermiss: 'bg-purple-500',
      gold: 'bg-yellow-500',
      starter: 'bg-blue-500',
      other: 'bg-gray-500',
    };
    return colors[track.toLowerCase()] || colors.other;
  };

  const getBadgeColor = (track: string) => {
    const colors: Record<string, string> = {
      nevermiss: 'bg-purple-100 text-purple-800',
      gold: 'bg-yellow-100 text-yellow-800',
      starter: 'bg-blue-100 text-blue-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[track.toLowerCase()] || colors.other;
  };

  const totalRevenue = sales.reduce((sum, s) => sum + s.revenue_monthly, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Sales by Track
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No sales data available
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visual Bar */}
            <div className="h-4 rounded-full overflow-hidden flex">
              {sales.map((sale, index) => (
                <div
                  key={sale.track}
                  className={`${getTrackColor(sale.track)}`}
                  style={{ width: `${sale.percentage}%` }}
                  title={`${sale.track}: ${sale.percentage}%`}
                />
              ))}
            </div>

            {/* Details */}
            <div className="space-y-3">
              {sales.map((sale) => (
                <div
                  key={sale.track}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${getTrackColor(
                        sale.track
                      )}`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={getBadgeColor(sale.track)}
                        >
                          {sale.track.charAt(0).toUpperCase() +
                            sale.track.slice(1)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {sale.deals} deal{sale.deals !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      ${sale.revenue_monthly.toLocaleString()}/mo
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {sale.percentage}% • ~${sale.avg_commission} comm
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="pt-3 border-t flex justify-between font-semibold">
              <span>Total Revenue</span>
              <span>${totalRevenue.toLocaleString()}/mo</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
