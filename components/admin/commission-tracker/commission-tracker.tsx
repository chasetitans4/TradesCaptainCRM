'use client';

// =====================================================
// COMMISSION TRACKER MAIN COMPONENT
// Full commission tracking dashboard for agents
// Version: 5.8.1
// =====================================================

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Download } from 'lucide-react';
import { useCommissionDashboard } from '@/hooks/useCommissionDashboard';
import { SummaryCards } from './summary-cards';
import { EarningsBreakdown } from './earnings-breakdown';
import { SalesByTrack } from './sales-by-track';
import { PendingCommissions } from './pending-commissions';
import { RecurringView } from './recurring-view';
import { BonusesView } from './bonuses-view';
import { PerformanceView } from './performance-view';

const PERIODS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
];

export function CommissionTracker() {
  const [period, setPeriod] = useState('this_month');
  const [activeTab, setActiveTab] = useState('overview');

  const { data, loading, error } = useCommissionDashboard(period);

  const handleExport = () => {
    // In production, this would trigger a PDF/CSV export
    window.open(`/api/commissions/export?period=${period}`, '_blank');
  };

  return (
    <div className="commission-tracker space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-8 w-8 text-success" />
          <h1 className="text-2xl font-bold">Commission Tracker</h1>
        </div>

        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Period Label */}
      {data?.period && (
        <p className="text-text-muted text-sm">{data.period.label}</p>
      )}

      {/* Summary Cards */}
      <SummaryCards data={data?.summary} loading={loading} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="recurring">Recurring</TabsTrigger>
          <TabsTrigger value="bonuses">Bonuses</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EarningsBreakdown data={data?.breakdown} loading={loading} />
              <SalesByTrack data={data?.salesByTrack} loading={loading} />
            </div>
          </TabsContent>

          <TabsContent value="pending">
            <PendingCommissions />
          </TabsContent>

          <TabsContent value="recurring">
            <RecurringView />
          </TabsContent>

          <TabsContent value="bonuses">
            <BonusesView />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceView />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

export default CommissionTracker;
