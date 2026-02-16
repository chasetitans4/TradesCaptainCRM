'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UserWithBusiness } from '@/types';
import type { DeliveryChannel } from '@/types/proof-of-work';
import {
  ArrowLeft,
  Shield,
  Send,
  Clock,
  Camera,
  MapPin,
  Eye,
  Share2,
  QrCode,
  Check,
  Loader2,
  Info,
  FileCheck,
} from 'lucide-react';

const DELIVERY_CHANNELS: { value: DeliveryChannel; label: string; description: string }[] = [
  {
    value: 'SMS',
    label: 'SMS Only',
    description: 'Send Proof of Work via text message',
  },
  {
    value: 'EMAIL',
    label: 'Email Only',
    description: 'Send Proof of Work via email',
  },
  {
    value: 'BOTH',
    label: 'SMS & Email',
    description: 'Send via both channels for best delivery',
  },
];

interface PowSettings {
  pow_enabled: boolean;
  pow_auto_delivery: boolean;
  pow_delivery_channel: DeliveryChannel;
  pow_delivery_delay_minutes: number;
  pow_show_zip: boolean;
  pow_require_photos: boolean;
  pow_finalization_delay_minutes: number;
}

interface PowStats {
  total_sent: number;
  total_views: number;
  total_shares: number;
  avg_view_rate: number;
}

function ProofOfWorkSettingsSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-5 w-5 bg-muted rounded animate-pulse" />
          <div className="h-6 w-40 bg-muted rounded animate-pulse" />
        </div>
      </header>
      <div className="px-4 py-4 space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-4">
            <div className="h-6 w-32 bg-muted rounded animate-pulse mb-4" />
            <div className="space-y-3">
              <div className="h-10 bg-muted rounded animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProofOfWorkSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Settings state
  const [settings, setSettings] = useState<PowSettings>({
    pow_enabled: true,
    pow_auto_delivery: true,
    pow_delivery_channel: 'SMS',
    pow_delivery_delay_minutes: 15,
    pow_show_zip: true,
    pow_require_photos: false,
    pow_finalization_delay_minutes: 30,
  });

  // Stats state
  const [stats, setStats] = useState<PowStats | null>(null);

  const loadData = useCallback(async () => {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      router.push('/login');
      return;
    }
    setUser(profile as UserWithBusiness);

    try {
      const [settingsRes, statsRes] = await Promise.all([
        fetch('/api/proof-of-work/settings'),
        fetch('/api/proof-of-work/stats'),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        if (data.settings) {
          setSettings({
            pow_enabled: data.settings.pow_enabled ?? true,
            pow_auto_delivery: data.settings.pow_auto_delivery ?? true,
            pow_delivery_channel: data.settings.pow_delivery_channel || 'SMS',
            pow_delivery_delay_minutes: data.settings.pow_delivery_delay_minutes ?? 15,
            pow_show_zip: data.settings.pow_show_zip ?? true,
            pow_require_photos: data.settings.pow_require_photos ?? false,
            pow_finalization_delay_minutes: data.settings.pow_finalization_delay_minutes ?? 30,
          });
        }
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      toast({
        title: 'Failed to load settings',
        description: 'Please try again',
        variant: 'destructive',
      });
    }

    setLoading(false);
  }, [router, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function saveSettings() {
    setSaving(true);
    try {
      const response = await fetch('/api/proof-of-work/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      toast({
        title: 'Settings saved',
        description: 'Your Proof of Work settings have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Failed to save settings',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) {
    return <ProofOfWorkSettingsSkeleton />;
  }

  const isOwner = user.role === 'owner';

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5 text-text" />
          </button>
          <h1 className="text-lg font-semibold text-text">Proof of Work™</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-6">
        {/* Stats Summary */}
        {stats && (
          <section className="card p-4">
            <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Performance
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-text">{stats.total_sent}</p>
                <p className="text-sm text-text-muted">Sent</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-text">{stats.total_views}</p>
                <p className="text-sm text-text-muted">Views</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-text">{stats.total_shares}</p>
                <p className="text-sm text-text-muted">Shares</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold text-text">
                  {(stats.avg_view_rate * 100).toFixed(0)}%
                </p>
                <p className="text-sm text-text-muted">View Rate</p>
              </div>
            </div>
          </section>
        )}

        {/* Master Toggle */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Proof of Work
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text">Enable Proof of Work</p>
                <p className="text-sm text-text-muted">
                  Generate verified work records for completed jobs
                </p>
              </div>
              <Switch
                checked={settings.pow_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, pow_enabled: checked })
                }
                disabled={!isOwner}
              />
            </div>

            <div className="p-3 bg-info/10 border border-info/20 rounded-lg flex items-start gap-3">
              <Info className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
              <p className="text-sm text-text-muted">
                Proof of Work creates verified records showing when your technician arrived,
                what work was done, and photos of the job. Homeowners can view and share these
                records.
              </p>
            </div>
          </div>
        </section>

        {/* Delivery Settings */}
        {settings.pow_enabled && (
          <section className="card p-4">
            <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Delivery Settings
            </h2>

            <div className="space-y-4">
              {/* Auto Delivery */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-text">Auto-Deliver</p>
                  <p className="text-sm text-text-muted">
                    Automatically send to customers after job completion
                  </p>
                </div>
                <Switch
                  checked={settings.pow_auto_delivery}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, pow_auto_delivery: checked })
                  }
                />
              </div>

              {/* Delivery Channel */}
              <div>
                <Label className="text-text mb-2 block">Delivery Channel</Label>
                <Select
                  value={settings.pow_delivery_channel}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      pow_delivery_channel: value as DeliveryChannel,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELIVERY_CHANNELS.map((channel) => (
                      <SelectItem key={channel.value} value={channel.value}>
                        <div>
                          <span>{channel.label}</span>
                          <span className="text-xs text-text-muted ml-2">
                            {channel.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Delivery Delay */}
              <div>
                <Label className="text-text mb-2 block flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Delivery Delay (minutes)
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={settings.pow_delivery_delay_minutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pow_delivery_delay_minutes: parseInt(e.target.value) || 0,
                    })
                  }
                />
                <p className="text-xs text-text-muted mt-1">
                  Wait this many minutes after job completion before sending
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Photo & Verification Settings */}
        {settings.pow_enabled && (
          <section className="card p-4">
            <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Photo & Verification
            </h2>

            <div className="space-y-4">
              {/* Require Photos */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-text">Require Photos</p>
                  <p className="text-sm text-text-muted">
                    Must have at least one verified photo to send
                  </p>
                </div>
                <Switch
                  checked={settings.pow_require_photos}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, pow_require_photos: checked })
                  }
                />
              </div>

              {/* Show ZIP Code */}
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-text-muted mt-0.5" />
                  <div>
                    <p className="font-medium text-text">Show ZIP Code</p>
                    <p className="text-sm text-text-muted">
                      Display ZIP code on public page (city/state always shown)
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.pow_show_zip}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, pow_show_zip: checked })
                  }
                />
              </div>
            </div>
          </section>
        )}

        {/* Finalization Settings */}
        {settings.pow_enabled && (
          <section className="card p-4">
            <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              Record Finalization
            </h2>

            <div className="space-y-4">
              <div>
                <Label className="text-text mb-2 block">
                  Finalization Delay (minutes)
                </Label>
                <Input
                  type="number"
                  min={15}
                  max={480}
                  value={settings.pow_finalization_delay_minutes}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      pow_finalization_delay_minutes: parseInt(e.target.value) || 30,
                    })
                  }
                />
                <p className="text-xs text-text-muted mt-1">
                  After this time, the record becomes immutable (cannot be edited)
                </p>
              </div>

              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg flex items-start gap-3">
                <Info className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-warning">Immutability</p>
                  <p className="text-sm text-text-muted mt-1">
                    Once finalized, the Proof of Work record cannot be modified. This ensures
                    trust and authenticity for homeowners.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* QR Code Info */}
        {settings.pow_enabled && (
          <section className="card p-4">
            <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              QR Codes
            </h2>

            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-text-muted">
                Each Proof of Work includes a unique QR code that links to the verified
                record. Technicians can display or print these for customers at job
                completion.
              </p>
            </div>
          </section>
        )}

        {/* Save Button */}
        <Button onClick={saveSettings} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
