'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Star,
  MessageSquare,
  Shield,
  BarChart3,
  Loader2,
  Check,
  AlertCircle,
  Users,
  Clock,
  Zap,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import type { ReputationSettings, ReputationDashboardStats } from '@/types/reputation';
import { DEFAULT_REPUTATION_SETTINGS, REVIEW_PLATFORM_CONFIG } from '@/types/reputation';

export default function ReputationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Partial<ReputationSettings>>(DEFAULT_REPUTATION_SETTINGS);
  const [stats, setStats] = useState<ReputationDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load settings and stats
  const loadData = useCallback(async () => {
    try {
      const [settingsRes, statsRes] = await Promise.all([
        fetch('/api/reputation/settings'),
        fetch('/api/reputation/stats?days=30'),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
    } catch {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save settings
  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/reputation/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      toast({ title: 'Settings saved', description: 'Your reputation settings have been updated' });
    } catch (err: any) {
      setError(err.message);
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  // Update a field
  function updateField<K extends keyof ReputationSettings>(key: K, value: ReputationSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/settings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold">Reputation Manager</h1>
            <p className="text-sm text-muted-foreground">
              Convert completed jobs into verified reviews
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold">{stats.total_requests}</p>
                <p className="text-xs text-muted-foreground">Requests Sent</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-primary">{stats.response_rate}%</p>
                <p className="text-xs text-muted-foreground">Response Rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.average_score}</p>
                <p className="text-xs text-muted-foreground">Avg. Score</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.review_conversion_rate}%</p>
                <p className="text-xs text-muted-foreground">Review Rate</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">
              <Zap className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="routing">
              <Star className="h-4 w-4 mr-2" />
              Routing
            </TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="recovery">
              <Shield className="h-4 w-4 mr-2" />
              Recovery
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Feature Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Reputation Manager</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically request feedback after completed jobs
                    </p>
                  </div>
                  <Switch
                    checked={settings.is_enabled ?? true}
                    onCheckedChange={(checked) => updateField('is_enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Attach Proof of Work Link</Label>
                    <p className="text-sm text-muted-foreground">
                      Include verified job record in feedback requests
                    </p>
                  </div>
                  <Switch
                    checked={settings.attach_pow_link ?? true}
                    onCheckedChange={(checked) => updateField('attach_pow_link', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Timing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Send Delay</Label>
                    <span className="text-sm text-muted-foreground">
                      {settings.send_delay_minutes ?? 60} minutes
                    </span>
                  </div>
                  <Slider
                    value={[settings.send_delay_minutes ?? 60]}
                    onValueChange={([value]) => updateField('send_delay_minutes', value)}
                    max={480}
                    min={0}
                    step={15}
                  />
                  <p className="text-xs text-muted-foreground">
                    How long after job completion before sending request
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Request Expiry</Label>
                  <Select
                    value={String(settings.request_expiry_days ?? 14)}
                    onValueChange={(value) => updateField('request_expiry_days', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How long the feedback link remains valid
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Daily Request Limit</Label>
                  <Input
                    type="number"
                    value={settings.max_requests_per_day ?? 25}
                    onChange={(e) => updateField('max_requests_per_day', parseInt(e.target.value) || 25)}
                    min={1}
                    max={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum feedback requests to send per day
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Delivery Channel</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={settings.default_channel ?? 'SMS'}
                  onValueChange={(value) => updateField('default_channel', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SMS">SMS Only</SelectItem>
                    <SelectItem value="EMAIL">Email Only</SelectItem>
                    <SelectItem value="BOTH">SMS and Email</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Routing Settings */}
          <TabsContent value="routing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sentiment Thresholds</CardTitle>
                <CardDescription>
                  Control how feedback is routed based on customer rating
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Positive Threshold</Label>
                    <span className="text-sm font-medium text-green-600">
                      {settings.positive_threshold ?? 4}+ stars = Positive
                    </span>
                  </div>
                  <Slider
                    value={[settings.positive_threshold ?? 4]}
                    onValueChange={([value]) => updateField('positive_threshold', value)}
                    max={5}
                    min={1}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Customers rating this or higher will be shown review links
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Negative Threshold</Label>
                    <span className="text-sm font-medium text-red-600">
                      {settings.negative_threshold ?? 2} stars or less = Recovery
                    </span>
                  </div>
                  <Slider
                    value={[settings.negative_threshold ?? 2]}
                    onValueChange={([value]) => updateField('negative_threshold', value)}
                    max={5}
                    min={1}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Customers rating this or lower trigger recovery workflow
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Review Platforms</CardTitle>
                <CardDescription>
                  Where to direct happy customers to leave reviews
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Star className="h-4 w-4" />
                  <AlertDescription>
                    Configure your review links in{' '}
                    <Link href="/settings/reviews" className="text-primary underline">
                      Review Settings
                    </Link>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  {Object.entries(REVIEW_PLATFORM_CONFIG).map(([platform, config]) => (
                    <div
                      key={platform}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{config.label}</span>
                      </div>
                      <Switch
                        checked={
                          settings.review_platforms?.find((p) => p.platform === platform)?.enabled ??
                          platform === 'google'
                        }
                        onCheckedChange={(checked) => {
                          const platforms = settings.review_platforms || [];
                          const existing = platforms.find((p) => p.platform === platform);
                          if (existing) {
                            existing.enabled = checked;
                          } else {
                            platforms.push({ platform: platform as any, enabled: checked, priority: platforms.length + 1 });
                          }
                          updateField('review_platforms', [...platforms]);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Message Templates */}
          <TabsContent value="messages" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Initial Request</CardTitle>
                <CardDescription>
                  Sent to customers after job completion
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Message Template</Label>
                  <Textarea
                    value={settings.initial_message_template || ''}
                    onChange={(e) => updateField('initial_message_template', e.target.value)}
                    placeholder="Hi {{customer.firstName}}! Thanks for choosing {{business.name}}..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Variables: {'{{customer.firstName}}'}, {'{{business.name}}'}, {'{{feedbackUrl}}'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Positive Follow-up</CardTitle>
                <CardDescription>
                  Sent after customer gives positive feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={settings.positive_followup_template || ''}
                  onChange={(e) => updateField('positive_followup_template', e.target.value)}
                  placeholder="Thanks for your kind words! Would you mind sharing on Google..."
                  rows={3}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Negative Follow-up</CardTitle>
                <CardDescription>
                  Sent after customer gives negative feedback
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={settings.negative_followup_template || ''}
                  onChange={(e) => updateField('negative_followup_template', e.target.value)}
                  placeholder="We're sorry to hear that. Someone will reach out..."
                  rows={3}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recovery Settings */}
          <TabsContent value="recovery" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recovery Workflow</CardTitle>
                <CardDescription>
                  Handle negative feedback before it becomes public
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-assign Recovery</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically assign negative feedback for follow-up
                    </p>
                  </div>
                  <Switch
                    checked={settings.auto_assign_recovery ?? true}
                    onCheckedChange={(checked) => updateField('auto_assign_recovery', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Recovery SLA (hours)</Label>
                  <Input
                    type="number"
                    value={settings.recovery_sla_hours ?? 24}
                    onChange={(e) => updateField('recovery_sla_hours', parseInt(e.target.value) || 24)}
                    min={1}
                    max={168}
                  />
                  <p className="text-xs text-muted-foreground">
                    Target time to respond to negative feedback
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Escalation Timeout (hours)</Label>
                  <Input
                    type="number"
                    value={settings.recovery_escalation_hours ?? 48}
                    onChange={(e) => updateField('recovery_escalation_hours', parseInt(e.target.value) || 48)}
                    min={1}
                    max={336}
                  />
                  <p className="text-xs text-muted-foreground">
                    Escalate if not resolved within this time
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Recovery Stats */}
            {stats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recovery Performance (30 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-red-600">{stats.recovery_started}</p>
                      <p className="text-xs text-muted-foreground">Started</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{stats.recovery_resolved}</p>
                      <p className="text-xs text-muted-foreground">Resolved</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">{stats.recovery_pending}</p>
                      <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                  </div>
                  {stats.avg_recovery_time_hours > 0 && (
                    <p className="text-center text-sm text-muted-foreground mt-4">
                      Average resolution time: {stats.avg_recovery_time_hours} hours
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
