'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Send,
  Plus,
  Play,
  Pause,
  BarChart3,
  Users,
  MessageSquare,
  CheckCircle,
  Loader2,
  Calendar,
  Target,
} from 'lucide-react';
import type { OutreachCampaign } from '@/types/outreach';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
};

const typeLabels: Record<string, string> = {
  website_instant: 'Website Instant',
  sms_widget: 'SMS Widget',
  referral: 'Referral',
  reengagement: 'Re-engagement',
  scheduled: 'Scheduled',
};

export default function OutreachCampaignsPage() {
  const [campaigns, setCampaigns] = useState<OutreachCampaign[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/api/outreach/campaigns?${params}`);
      const data = await response.json();
      setCampaigns(data.data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter]);

  const handleAction = async (campaignId: string, action: 'start' | 'pause') => {
    setActionLoading(campaignId);
    try {
      await fetch(`/api/outreach/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      fetchCampaigns();
    } finally {
      setActionLoading(null);
    }
  };

  const getConversionRate = (campaign: OutreachCampaign) => {
    if (!campaign.contacts_total || campaign.contacts_total === 0) return 0;
    return Math.round(((campaign.deals_closed || 0) / campaign.contacts_total) * 100);
  };

  const getReplyRate = (campaign: OutreachCampaign) => {
    if (!campaign.contacts_messaged || campaign.contacts_messaged === 0) return 0;
    return Math.round(((campaign.contacts_replied || 0) / campaign.contacts_messaged) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Manage your outreach campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Campaign Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Play className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {campaigns.filter((c) => c.status === 'active').length}
                </p>
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {campaigns.reduce((sum, c) => sum + (c.contacts_total || 0), 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Contacts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {campaigns.reduce((sum, c) => sum + (c.contacts_replied || 0), 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Replies</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {campaigns.reduce((sum, c) => sum + (c.deals_closed || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Deals Closed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center text-muted-foreground">
              <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No Campaigns Yet</p>
              <p className="text-sm mb-4">
                Create your first campaign to start reaching leads
              </p>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {campaigns.map((campaign) => (
            <Card key={campaign.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className={statusColors[campaign.status]}>
                        {campaign.status}
                      </Badge>
                      <Badge variant="outline">
                        {typeLabels[campaign.campaign_type] || campaign.campaign_type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {campaign.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction(campaign.id, 'pause')}
                        disabled={actionLoading === campaign.id}
                      >
                        {actionLoading === campaign.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Pause className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    {(campaign.status === 'draft' || campaign.status === 'paused') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction(campaign.id, 'start')}
                        disabled={actionLoading === campaign.id}
                      >
                        {actionLoading === campaign.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {campaign.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {campaign.description}
                  </p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xl font-bold">{campaign.contacts_total || 0}</p>
                    <p className="text-xs text-muted-foreground">Contacts</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{campaign.contacts_replied || 0}</p>
                    <p className="text-xs text-muted-foreground">Replied</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{campaign.demos_booked || 0}</p>
                    <p className="text-xs text-muted-foreground">Booked</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{campaign.deals_closed || 0}</p>
                    <p className="text-xs text-muted-foreground">Closed</p>
                  </div>
                </div>

                {/* Progress Bars */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Reply Rate</span>
                    <span className="font-medium">{getReplyRate(campaign)}%</span>
                  </div>
                  <Progress value={getReplyRate(campaign)} className="h-2" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Conversion Rate</span>
                    <span className="font-medium">{getConversionRate(campaign)}%</span>
                  </div>
                  <Progress value={getConversionRate(campaign)} className="h-2" />
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Created {format(new Date(campaign.created_at), 'MMM d, yyyy')}
                  </span>
                  {campaign.ai_goal && (
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {campaign.ai_goal.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
