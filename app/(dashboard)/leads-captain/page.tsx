'use client';

// =====================================================
// LEADS CAPTAIN v2 DASHBOARD PAGE
// Main overview with stats, recent conversations, quick actions
// =====================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Settings,
  Zap,
  FileText,
  Users,
  AlertTriangle,
  Flame,
  Clock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
} from 'lucide-react';
import { GlobalPauseToggle } from '@/components/automation/global-pause-toggle';
import type { LeadsCaptainConfig, LeadsCaptainConversation } from '@/types/leads-captain';
import { logger } from '@/lib/logger';
const lcDashboardLogger = logger.child({ context: 'leads-captain.dashboard' });

interface DashboardStats {
  conversations: {
    total: number;
    active: number;
    human_takeover: number;
  };
  pending_approvals: number;
  hot_leads: number;
}

export default function LeadsCaptainDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<LeadsCaptainConfig | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentConversations, setRecentConversations] = useState<LeadsCaptainConversation[]>([]);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);

      // Fetch config
      const configRes = await fetch('/api/leads-captain/v2/config');
      const configData = await configRes.json();

      if (configData.needs_setup) {
        setNeedsSetup(true);
        setLoading(false);
        return;
      }

      setConfig(configData.config);

      // Fetch conversations and stats in parallel
      const [convRes, approvalsRes] = await Promise.all([
        fetch('/api/leads-captain/v2/conversations?page_size=5'),
        fetch('/api/leads-captain/v2/approvals'),
      ]);

      const convData = await convRes.json();
      const approvalsData = await approvalsRes.json();

      setRecentConversations(convData.conversations || []);

      // Calculate stats
      const hotLeads = (convData.conversations || []).filter(
        (c: LeadsCaptainConversation) => c.is_hot_lead
      ).length;

      setStats({
        conversations: {
          total: convData.total || 0,
          active: (convData.conversations || []).filter(
            (c: LeadsCaptainConversation) => c.status === 'active'
          ).length,
          human_takeover: (convData.conversations || []).filter(
            (c: LeadsCaptainConversation) => c.status === 'human_takeover'
          ).length,
        },
        pending_approvals: approvalsData.total || 0,
        hot_leads: hotLeads,
      });
    } catch (error) {
      lcDashboardLogger.error({
        msg: 'Error fetching Leads Captain dashboard',
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
      });
    } finally {
      setLoading(false);
    }
  };

  const setupLeadsCaptain = async () => {
    try {
      const res = await fetch('/api/leads-captain/v2/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        setNeedsSetup(false);
        fetchDashboard();
        router.push('/leads-captain/settings');
      }
    } catch (error) {
      lcDashboardLogger.error({
        msg: 'Error setting up Leads Captain',
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Setup screen
  if (needsSetup) {
    return (
      <div className="container max-w-2xl mx-auto py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to Leads Captain v2</CardTitle>
            <CardDescription className="text-base mt-2">
              The rules-first AI SMS response system. Set up rules and templates
              to handle missed calls and incoming messages automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                  <Zap className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Visual Rule Engine</p>
                  <p className="text-sm text-muted-foreground">
                    Create IF/THEN rules without writing code
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Response Templates</p>
                  <p className="text-sm text-muted-foreground">
                    Reusable templates with smart variables
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                  <MessageSquare className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">AI Fallback</p>
                  <p className="text-sm text-muted-foreground">
                    AI only responds when no rule matches
                  </p>
                </div>
              </div>
            </div>

            <Button onClick={setupLeadsCaptain} className="w-full" size="lg">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleGlobalPauseToggle = async (paused: boolean) => {
    try {
      const res = await fetch('/api/leads-captain/v2/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          global_mode: paused ? 'paused' : 'normal',
        }),
      });

      if (res.ok) {
        setConfig((prev) => prev ? { ...prev, global_mode: paused ? 'paused' : 'normal' } : null);
      }
    } catch (error) {
      lcDashboardLogger.error({
        msg: 'Error toggling global pause',
        error: error instanceof Error ? error.message : String(error),
        paused,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Leads Captain</h1>
            <p className="text-muted-foreground">
              {config?.global_mode === 'paused' ? (
                <span className="text-yellow-600 dark:text-yellow-400">System is paused</span>
              ) : config?.global_mode === 'templates_only' ? (
                <span>Templates only mode</span>
              ) : (
                <span className="text-green-600 dark:text-green-400">AI + Rules active</span>
              )}
            </p>
          </div>
          {/* Global Pause Toggle - 1 tap accessible (Section 7.3) */}
          <GlobalPauseToggle
            isPaused={config?.global_mode === 'paused'}
            onToggle={handleGlobalPauseToggle}
            variant="button"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/leads-captain/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button onClick={() => router.push('/leads-captain/conversations')}>
            <MessageSquare className="mr-2 h-4 w-4" />
            All Conversations
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.conversations.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.conversations.total || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Human Takeover</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.conversations.human_takeover || 0}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card className={stats?.pending_approvals ? 'border-yellow-500' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending_approvals || 0}</div>
            {stats?.pending_approvals ? (
              <Button
                variant="link"
                className="p-0 h-auto text-xs"
                onClick={() => router.push('/leads-captain/approvals')}
              >
                Review now
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">All clear</p>
            )}
          </CardContent>
        </Card>

        <Card className={stats?.hot_leads ? 'border-orange-500' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hot Leads</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.hot_leads || 0}</div>
            <p className="text-xs text-muted-foreground">Ready to close</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => router.push('/leads-captain/rules')}
        >
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">Rules</CardTitle>
            </div>
            <CardDescription>Create IF/THEN automation rules</CardDescription>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => router.push('/leads-captain/templates')}
        >
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-500" />
              <CardTitle className="text-lg">Templates</CardTitle>
            </div>
            <CardDescription>Manage response templates</CardDescription>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => router.push('/leads-captain/analytics')}
        >
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-lg">Analytics</CardTitle>
            </div>
            <CardDescription>View performance metrics</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Conversations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Conversations</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/leads-captain/conversations')}
            >
              View all
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentConversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm">Conversations will appear here when customers text you</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentConversations.map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => router.push(`/leads-captain/conversations?id=${conv.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <MessageSquare className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {conv.customer_name || conv.customer_phone}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {conv.current_intent || 'No intent detected'} • {conv.message_count} messages
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {conv.is_hot_lead && (
                      <Badge variant="danger" className="gap-1">
                        <Flame className="h-3 w-3" />
                        Hot
                      </Badge>
                    )}
                    {conv.is_emergency && (
                      <Badge variant="danger" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Emergency
                      </Badge>
                    )}
                    <Badge
                      variant={
                        conv.status === 'active'
                          ? 'default'
                          : conv.status === 'human_takeover'
                          ? 'secondary'
                          : 'outline'
                      }
                    >
                      {conv.status === 'human_takeover' ? 'Human' : conv.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
