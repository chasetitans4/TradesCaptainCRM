'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  Wrench,
  Star,
  TrendingUp,
  Clock,
  Target,
  Award,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TechnicianPerformance {
  technicianId: string;
  technicianName: string;
  period: string;
  jobsCompleted: number;
  jobsScheduled: number;
  completionRate: number;
  totalRevenue: number;
  revenuePerJob: number;
  laborHours: number;
  revenuePerHour: number;
  firstTimeFixRate: number;
  callbackRate: number;
  averageRating: number;
  totalRatings: number;
  efficiency: number;
}

interface TeamPerformanceProps {
  initialData?: TechnicianPerformance[];
  showTeamView?: boolean;
  technicianId?: string;
}

type DateRange = 'today' | 'week' | 'month' | 'quarter' | 'year';

const rangeLabels: Record<DateRange, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  quarter: 'This Quarter',
  year: 'This Year',
};

export function TechnicianPerformance({
  initialData,
  showTeamView = true,
  technicianId,
}: TeamPerformanceProps) {
  const [range, setRange] = useState<DateRange>('month');
  const [data, setData] = useState<TechnicianPerformance[]>(initialData || []);
  const [loading, setLoading] = useState(!initialData);
  const [view, setView] = useState<'team' | 'individual'>(showTeamView ? 'team' : 'individual');

  useEffect(() => {
    loadData();
  }, [range, technicianId]);

  const loadData = async () => {
    setLoading(true);
    try {
      let url = `/api/metrics?range=${range}`;
      if (technicianId) {
        url += `&technicianId=${technicianId}`;
      } else {
        url += '&team=true';
      }

      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        setData(Array.isArray(result) ? result : [result]);
      }
    } catch (error) {
      console.error('Failed to load performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-20 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Aggregate stats for team view
  const teamTotals = data.reduce(
    (acc, tech) => ({
      revenue: acc.revenue + tech.totalRevenue,
      jobs: acc.jobs + tech.jobsCompleted,
      ratingSum: acc.ratingSum + (tech.averageRating * tech.totalRatings),
      ratingCount: acc.ratingCount + tech.totalRatings,
      ftfSum: acc.ftfSum + tech.firstTimeFixRate,
    }),
    { revenue: 0, jobs: 0, ratingSum: 0, ratingCount: 0, ftfSum: 0 }
  );

  const teamAvgRating = teamTotals.ratingCount > 0
    ? (teamTotals.ratingSum / teamTotals.ratingCount).toFixed(1)
    : 'N/A';
  const teamAvgFtf = data.length > 0
    ? Math.round(teamTotals.ftfSum / data.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Performance Metrics</h3>
        <div className="flex items-center gap-2">
          {showTeamView && (
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="individual">Individual</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
          <Select value={range} onValueChange={(v) => setRange(v as DateRange)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(rangeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Team Summary Cards */}
      {view === 'team' && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(teamTotals.revenue)}</div>
              <p className="text-xs text-muted-foreground">
                {data.length} technicians
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Jobs Completed</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamTotals.jobs}</div>
              <p className="text-xs text-muted-foreground">
                Avg {(teamTotals.jobs / Math.max(data.length, 1)).toFixed(1)} per tech
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-1">
                {teamAvgRating}
                <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
              </div>
              <p className="text-xs text-muted-foreground">
                {teamTotals.ratingCount} total ratings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">First-Time Fix Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamAvgFtf}%</div>
              <Progress value={teamAvgFtf} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Individual Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {view === 'team' ? 'Team Rankings' : 'Performance Details'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((tech, index) => (
              <div
                key={tech.technicianId}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  {view === 'team' && (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold">
                      {index + 1}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{tech.technicianName}</p>
                    <p className="text-sm text-muted-foreground">{tech.period}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <p className="font-semibold">{formatCurrency(tech.totalRevenue)}</p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Jobs</p>
                    <p className="font-semibold">{tech.jobsCompleted}</p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Completion</p>
                    <p className="font-semibold">{tech.completionRate}%</p>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Rating</p>
                    <div className="flex items-center gap-1 font-semibold">
                      {tech.averageRating}
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">FTF Rate</p>
                    <Badge variant={tech.firstTimeFixRate >= 90 ? 'default' : 'outline'}>
                      {tech.firstTimeFixRate}%
                    </Badge>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Efficiency</p>
                    <p className="font-semibold">{tech.efficiency} jobs/day</p>
                  </div>
                </div>
              </div>
            ))}

            {data.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No performance data available for this period
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
