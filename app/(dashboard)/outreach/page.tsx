'use client';

import { useEffect, useState } from 'react';
import { MetricsDashboard } from '@/components/outreach/metrics-dashboard';
import { AgentQueue } from '@/components/outreach/agent-queue';
import { AdminApprovalQueue } from '@/components/outreach/admin-approval-queue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Phone,
  Users,
  Send,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import type { OutreachDashboardStats, ScheduledCallWithContact } from '@/types/outreach';

export default function OutreachDashboardPage() {
  const [stats, setStats] = useState<OutreachDashboardStats | null>(null);
  const [todayCalls, setTodayCalls] = useState<ScheduledCallWithContact[]>([]);
  const [pendingCalls, setPendingCalls] = useState<ScheduledCallWithContact[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, callsRes, pendingRes] = await Promise.all([
        fetch('/api/outreach/analytics?type=dashboard'),
        fetch(`/api/outreach/calls?date=${new Date().toISOString().split('T')[0]}`),
        fetch('/api/outreach/calls/pending-admin'),
      ]);

      const statsData = await statsRes.json();
      const callsData = await callsRes.json();
      const pendingData = await pendingRes.json();

      setStats(statsData);
      setTodayCalls(callsData.data || []);
      setPendingCalls(pendingData.data || []);

      // Mock agents for now - would fetch from API in production
      setAgents([
        { id: '1', name: 'Alex Johnson' },
        { id: '2', name: 'Sarah Miller' },
        { id: '3', name: 'Mike Chen' },
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handleStartCall = async (callId: string) => {
    await fetch(`/api/outreach/calls/${callId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    });
    fetchData();
  };

  const handleCompleteCall = async (callId: string, outcome: string, notes?: string) => {
    await fetch(`/api/outreach/calls/${callId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', outcome, notes }),
    });
    fetchData();
  };

  const handleNoShow = async (callId: string) => {
    await fetch(`/api/outreach/calls/${callId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'no_show' }),
    });
    fetchData();
  };

  const handleApprove = async (callId: string, agentId: string) => {
    await fetch(`/api/outreach/calls/${callId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', agent_id: agentId }),
    });
    fetchData();
  };

  const handleReject = async (callId: string, reason: string) => {
    await fetch(`/api/outreach/calls/${callId}`, {
      method: 'DELETE',
    });
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Outreach Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor your lead generation and sales pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/outreach/contacts">
              <Users className="w-4 h-4 mr-2" />
              View Contacts
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link href="/outreach">
          <Card className="hover:border-primary/50 cursor-pointer transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <LayoutDashboard className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Dashboard</p>
                <p className="text-xs text-muted-foreground">Overview & metrics</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/outreach/calls">
          <Card className="hover:border-primary/50 cursor-pointer transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Phone className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Calls</p>
                <p className="text-xs text-muted-foreground">Scheduled calls</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/outreach/contacts">
          <Card className="hover:border-primary/50 cursor-pointer transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Contacts</p>
                <p className="text-xs text-muted-foreground">Manage leads</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/outreach/campaigns">
          <Card className="hover:border-primary/50 cursor-pointer transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Send className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">Campaigns</p>
                <p className="text-xs text-muted-foreground">Outreach campaigns</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="metrics" className="space-y-6">
        <TabsList>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="calls" className="relative">
            Today&apos;s Calls
            {todayCalls.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                {todayCalls.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pending Approval
            {pendingCalls.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                {pendingCalls.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics">
          {stats && <MetricsDashboard stats={stats} isLoading={isLoading} />}
        </TabsContent>

        <TabsContent value="calls">
          <AgentQueue
            calls={todayCalls}
            onStartCall={handleStartCall}
            onCompleteCall={handleCompleteCall}
            onNoShow={handleNoShow}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="pending">
          <AdminApprovalQueue
            calls={pendingCalls}
            agents={agents}
            onApprove={handleApprove}
            onReject={handleReject}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
