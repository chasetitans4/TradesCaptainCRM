'use client';

// =====================================================
// LEADS CAPTAIN v2 ANALYTICS PAGE
// View performance metrics and insights
// =====================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  ArrowLeft,
  MessageSquare,
  Bot,
  FileText,
  TrendingUp,
  TrendingDown,
  Users,
  Flame,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AnalyticsOverviewResponse, RuleAnalyticsResponse } from '@/types/leads-captain';
import { logger } from '@/lib/logger';

export default function LeadsCaptainAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [ruleAnalytics, setRuleAnalytics] = useState<RuleAnalyticsResponse | null>(null);
  const lcAnalyticsLogger = logger.child({ context: 'leads-captain.analytics' });

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [overviewRes, rulesRes] = await Promise.all([
        fetch(`/api/leads-captain/v2/analytics?days=${period}`),
        fetch(`/api/leads-captain/v2/analytics?type=rules&days=${period}`),
      ]);

      if (overviewRes.status === 403) {
        // Analytics not available on plan
        toast.error('Analytics not available on your current plan');
        router.push('/leads-captain');
        return;
      }

      if (overviewRes.ok) {
        setOverview(await overviewRes.json());
      }
      if (rulesRes.ok) {
        setRuleAnalytics(await rulesRes.json());
      }
    } catch (error) {
      lcAnalyticsLogger.error({
        msg: 'Error fetching analytics',
        error: error instanceof Error ? error.message : String(error),
        period,
      });
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/leads-captain')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">
              Performance insights for your SMS responses
            </p>
          </div>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.conversations.total}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {overview.conversations.change_percent >= 0 ? (
                <>
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                  <span className="text-green-500">+{overview.conversations.change_percent}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                  <span className="text-red-500">{overview.conversations.change_percent}%</span>
                </>
              )}
              <span className="ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.messages.outbound}</div>
            <p className="text-xs text-muted-foreground">
              {overview.messages.ai_generated} AI generated ({Math.round(overview.messages.ai_generated / overview.messages.outbound * 100) || 0}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates Used</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.messages.template_used}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(overview.messages.template_used / overview.messages.outbound * 100) || 0}% of responses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hot Leads</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{overview.leads.hot_leads}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(overview.leads.hot_leads / overview.leads.total * 100) || 0}% of conversations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Conversation Status */}
      <Card>
        <CardHeader>
          <CardTitle>Conversation Status Breakdown</CardTitle>
          <CardDescription>Current state of conversations in this period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Active</span>
                <span>{overview.conversations.active}</span>
              </div>
              <Progress
                value={(overview.conversations.active / overview.conversations.total) * 100 || 0}
                className="h-2"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Human Takeover</span>
                <span>{overview.conversations.human_takeover}</span>
              </div>
              <Progress
                value={(overview.conversations.human_takeover / overview.conversations.total) * 100 || 0}
                className="h-2 [&>div]:bg-yellow-500"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Closed</span>
                <span>{overview.conversations.closed}</span>
              </div>
              <Progress
                value={(overview.conversations.closed / overview.conversations.total) * 100 || 0}
                className="h-2 [&>div]:bg-green-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Intent Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Top Intents</CardTitle>
            <CardDescription>Most common customer intents detected</CardDescription>
          </CardHeader>
          <CardContent>
            {overview.intents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No intent data yet
              </p>
            ) : (
              <div className="space-y-3">
                {overview.intents.slice(0, 5).map((intent) => (
                  <div key={intent.intent_code} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">
                        {intent.intent_code.replace(/_/g, ' ')}
                      </span>
                      <span className="text-muted-foreground">
                        {intent.count} ({intent.percentage}%)
                      </span>
                    </div>
                    <Progress value={intent.percentage} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rule Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Rule Performance
            </CardTitle>
            <CardDescription>Most triggered automation rules</CardDescription>
          </CardHeader>
          <CardContent>
            {!ruleAnalytics || ruleAnalytics.rules.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No rule data yet
              </p>
            ) : (
              <div className="space-y-3">
                {ruleAnalytics.rules.filter(r => r.hits > 0).slice(0, 5).map((rule) => (
                  <div key={rule.rule_id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{rule.rule_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {rule.hits} hits • {rule.hit_rate}% hit rate
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {rule.last_hit
                          ? new Date(rule.last_hit).toLocaleDateString()
                          : 'Never'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
