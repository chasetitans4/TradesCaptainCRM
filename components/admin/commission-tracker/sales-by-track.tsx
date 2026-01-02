'use client';

// =====================================================
// SALES BY TRACK COMPONENT
// Shows sales breakdown by plan track
// Version: 5.8.1
// =====================================================

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SalesByTrack as SalesByTrackType } from '@/lib/admin/commission-tracker';

interface SalesByTrackProps {
  data?: SalesByTrackType[] | null;
  loading?: boolean;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export function SalesByTrack({ data, loading }: SalesByTrackProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sales This Period</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-text-muted text-sm">No sales recorded for this period.</p>
        </CardContent>
      </Card>
    );
  }

  const totals = data.reduce(
    (acc, track) => ({
      sales: acc.sales + track.sales,
      revenue: acc.revenue + track.revenue,
      commission: acc.commission + track.commission,
    }),
    { sales: 0, revenue: 0, commission: 0 }
  );

  const avgPerSale = totals.sales > 0 ? Math.round(totals.commission / totals.sales) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sales This Period</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Track</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Commission</TableHead>
              <TableHead className="text-right">Avg/Sale</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((track) => (
              <TableRow key={track.track}>
                <TableCell className="font-medium">{track.trackName}</TableCell>
                <TableCell className="text-right">{track.sales}</TableCell>
                <TableCell className="text-right text-text-muted">
                  {formatCurrency(track.revenue)}/mo
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(track.commission)}
                </TableCell>
                <TableCell className="text-right text-text-muted">
                  {formatCurrency(track.avgPerSale)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-semibold bg-muted/50">
              <TableCell>TOTAL</TableCell>
              <TableCell className="text-right">{totals.sales}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(totals.revenue)}/mo
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(totals.commission)}
              </TableCell>
              <TableCell className="text-right">{formatCurrency(avgPerSale)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default SalesByTrack;
