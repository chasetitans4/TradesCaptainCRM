'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { UserWithBusiness, CalendarConnection, ScheduleBlock } from '@/types';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Coffee,
  Loader2,
  Plus,
  Trash2,
  Unlink,
  Car,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CALENDAR_PROVIDERS = [
  { id: 'google', name: 'Google Calendar', icon: '📅' },
  { id: 'icloud', name: 'Apple iCloud', icon: '🍎' },
  { id: 'microsoft', name: 'Outlook / Microsoft 365', icon: '📧' },
];

interface WorkingHoursData {
  day_of_week: number;
  is_working_day: boolean;
  start_time: string;
  end_time: string;
}

export default function CalendarSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Calendar connection
  const [connection, setConnection] = useState<(CalendarConnection & { provider_name?: string }) | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Working hours
  const [workingHours, setWorkingHours] = useState<WorkingHoursData[]>([]);
  const [workingHoursSource, setWorkingHoursSource] = useState<'default' | 'business' | 'user'>('default');

  // Schedule blocks
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [newBlock, setNewBlock] = useState({
    label: '',
    days: [] as number[],
    start_time: '12:00',
    end_time: '13:00',
  });

  // Drive time
  const [driveTimeEnabled, setDriveTimeEnabled] = useState(true);
  const [driveTimeMinutes, setDriveTimeMinutes] = useState(30);

  // Success/error messages from URL
  const successMessage = searchParams.get('success');
  const errorMessage = searchParams.get('error');

  const loadCalendarConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/connection');
      const data = await response.json();
      if (data.connected) {
        setConnection(data.connection);
      }
    } catch (_error) {
      toast({ title: 'Failed to load calendar connection', description: 'Please try again', variant: 'destructive' });
    }
  }, [toast]);

  const loadWorkingHours = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/working-hours');
      const data = await response.json();
      setWorkingHours(data.hours);
      setWorkingHoursSource(data.source);
    } catch (_error) {
      toast({ title: 'Failed to load working hours', description: 'Using defaults', variant: 'destructive' });
      setWorkingHours(generateDefaultHours());
    }
  }, [toast]);

  const loadScheduleBlocks = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/schedule-blocks');
      const data = await response.json();
      setScheduleBlocks(data.blocks || []);
    } catch (_error) {
      toast({ title: 'Failed to load schedule blocks', description: 'Please try again', variant: 'destructive' });
    }
  }, [toast]);

  const loadDriveTimeSettings = useCallback(async (_businessId: string) => {
    try {
      const response = await fetch('/api/calendar/drive-time');
      const data = await response.json();
      setDriveTimeEnabled(data.enabled ?? true);
      setDriveTimeMinutes(data.default_minutes ?? 30);
    } catch (_error) {
      toast({ title: 'Failed to load drive time settings', description: 'Please try again', variant: 'destructive' });
    }
  }, [toast]);

  const loadData = useCallback(async () => {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      router.push('/login');
      return;
    }
    setUser(profile as UserWithBusiness);

    await Promise.all([
      loadCalendarConnection(),
      loadWorkingHours(),
      loadScheduleBlocks(),
      loadDriveTimeSettings(profile.business_id),
    ]);

    setLoading(false);
  }, [router, loadCalendarConnection, loadWorkingHours, loadScheduleBlocks, loadDriveTimeSettings]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  

  

  

  

  function generateDefaultHours(): WorkingHoursData[] {
    return [
      { day_of_week: 0, is_working_day: false, start_time: '08:00', end_time: '17:00' },
      { day_of_week: 1, is_working_day: true, start_time: '08:00', end_time: '17:00' },
      { day_of_week: 2, is_working_day: true, start_time: '08:00', end_time: '17:00' },
      { day_of_week: 3, is_working_day: true, start_time: '08:00', end_time: '17:00' },
      { day_of_week: 4, is_working_day: true, start_time: '08:00', end_time: '17:00' },
      { day_of_week: 5, is_working_day: true, start_time: '08:00', end_time: '17:00' },
      { day_of_week: 6, is_working_day: false, start_time: '08:00', end_time: '17:00' },
    ];
  }

  async function handleConnectCalendar(provider: string) {
    setConnecting(true);
    window.location.href = `/api/auth/nylas?provider=${provider}`;
  }

  async function handleDisconnectCalendar() {
    if (!confirm('Are you sure you want to disconnect your calendar?')) return;

    setDisconnecting(true);
    try {
      const response = await fetch('/api/calendar/disconnect', { method: 'POST' });
      if (response.ok) {
        setConnection(null);
      }
    } catch (_error) {
      toast({ title: 'Failed to disconnect calendar', description: 'Please try again', variant: 'destructive' });
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleSaveWorkingHours() {
    setSaving(true);
    try {
      const response = await fetch('/api/calendar/working-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: workingHours, scope: 'business' }),
      });
      if (!response.ok) throw new Error('Failed to save');
    } catch (_error) {
      toast({ title: 'Failed to save working hours', description: 'Please try again', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  function updateWorkingHours(dayOfWeek: number, updates: Partial<WorkingHoursData>) {
    setWorkingHours((prev) =>
      prev.map((h) =>
        h.day_of_week === dayOfWeek ? { ...h, ...updates } : h
      )
    );
  }

  async function handleAddBlock() {
    if (!newBlock.label.trim() || newBlock.days.length === 0) return;

    setSaving(true);
    try {
      // Create a block for each selected day
      for (const day of newBlock.days) {
        await fetch('/api/calendar/schedule-blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            day_of_week: day,
            start_time: newBlock.start_time,
            end_time: newBlock.end_time,
            label: newBlock.label,
            is_recurring: true,
            scope: 'business',
          }),
        });
      }
      await loadScheduleBlocks();
      setShowAddBlock(false);
      setNewBlock({ label: '', days: [], start_time: '12:00', end_time: '13:00' });
    } catch (_error) {
      toast({ title: 'Failed to add block', description: 'Please try again', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteBlock(blockId: string) {
    try {
      await fetch(`/api/calendar/schedule-blocks/${blockId}`, { method: 'DELETE' });
      setScheduleBlocks((prev) => prev.filter((b) => b.id !== blockId));
    } catch (_error) {
      toast({ title: 'Failed to delete block', description: 'Please try again', variant: 'destructive' });
    }
  }

  async function handleSaveDriveTime() {
    setSaving(true);
    try {
      await fetch('/api/calendar/drive-time', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: driveTimeEnabled,
          default_minutes: driveTimeMinutes,
        }),
      });
    } catch (_error) {
      toast({ title: 'Failed to save drive time settings', description: 'Please try again', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  function toggleDay(day: number) {
    setNewBlock((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }));
  }

  if (loading || !user) {
    return <CalendarSettingsSkeleton />;
  }

  // Check if user has Pro tier
  const isPro = user.business?.plan_tier === 'pro';

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft className="h-5 w-5 text-text" />
          </button>
          <h1 className="text-lg font-semibold text-text">Calendar Settings</h1>
        </div>
      </header>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="mx-4 mt-4 p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2 text-success">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm">
            {successMessage === 'connected'
              ? 'Calendar connected successfully!'
              : successMessage}
          </span>
        </div>
      )}
      {errorMessage && (
        <div className="mx-4 mt-4 p-3 bg-danger/10 border border-danger/20 rounded-lg flex items-center gap-2 text-danger">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="text-sm">
            {errorMessage === 'oauth_failed'
              ? 'Failed to connect calendar. Please try again.'
              : errorMessage === 'upgrade_required'
              ? 'Calendar integration requires Pro plan.'
              : errorMessage}
          </span>
        </div>
      )}

      <div className="px-4 py-4 space-y-6">
        {/* Upgrade prompt for non-Pro users */}
        {!isPro && (
          <div className="card p-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-text">Upgrade to Pro</h3>
                <p className="text-sm text-text-muted mt-1">
                  Calendar integration is available on the Pro plan. Sync your jobs
                  with Google Calendar, iCloud, or Outlook.
                </p>
                <Button className="mt-3" size="sm">
                  Upgrade Now
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Connection */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Calendar Connection
          </h2>

          {connection ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-success/5 border border-success/20 rounded-lg">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Check className="h-5 w-5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text">Connected</p>
                  <p className="text-sm text-text-muted truncate">
                    {connection.provider_name || connection.provider} • {connection.email}
                  </p>
                  {connection.last_sync_at && (
                    <p className="text-xs text-text-muted mt-0.5">
                      Last synced: {new Date(connection.last_sync_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full text-danger border-danger/30 hover:bg-danger/5"
                onClick={handleDisconnectCalendar}
                disabled={disconnecting}
              >
                {disconnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  <>
                    <Unlink className="h-4 w-4 mr-2" />
                    Disconnect Calendar
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-text-muted">
                Connect your calendar to sync jobs and see your personal events.
              </p>
              {CALENDAR_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleConnectCalendar(provider.id)}
                  disabled={!isPro || connecting}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors',
                    isPro
                      ? 'border-border hover:bg-muted/50 active:bg-muted'
                      : 'border-border/50 opacity-50 cursor-not-allowed'
                  )}
                >
                  <span className="text-2xl">{provider.icon}</span>
                  <span className="font-medium text-text">{provider.name}</span>
                  <ChevronRight className="h-5 w-5 text-text-muted ml-auto" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Working Hours */}
        <section className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Working Hours
            </h2>
            {workingHoursSource === 'default' && (
              <Badge variant="secondary">Default</Badge>
            )}
          </div>

          <div className="space-y-3">
            {workingHours.map((day) => (
              <div
                key={day.day_of_week}
                className="flex items-center gap-3 py-2 border-b border-border last:border-0"
              >
                <Switch
                  checked={day.is_working_day}
                  onCheckedChange={(checked) =>
                    updateWorkingHours(day.day_of_week, { is_working_day: checked })
                  }
                />
                <span className="w-24 font-medium text-text">
                  {DAY_NAMES[day.day_of_week]}
                </span>
                {day.is_working_day ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={day.start_time}
                      onChange={(e) =>
                        updateWorkingHours(day.day_of_week, {
                          start_time: e.target.value,
                        })
                      }
                      className="w-28"
                    />
                    <span className="text-text-muted">to</span>
                    <Input
                      type="time"
                      value={day.end_time}
                      onChange={(e) =>
                        updateWorkingHours(day.day_of_week, {
                          end_time: e.target.value,
                        })
                      }
                      className="w-28"
                    />
                  </div>
                ) : (
                  <span className="text-text-muted">Off</span>
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={handleSaveWorkingHours}
            disabled={saving}
            className="w-full mt-4"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save Working Hours
              </>
            )}
          </Button>
        </section>

        {/* Schedule Blocks */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
            <Coffee className="h-5 w-5 text-primary" />
            Breaks & Blocked Time
          </h2>

          {scheduleBlocks.length === 0 && !showAddBlock ? (
            <div className="text-center py-6">
              <Coffee className="h-8 w-8 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted mb-3">
                No breaks configured yet
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddBlock(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Break
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {scheduleBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-text">{block.label}</p>
                      <p className="text-sm text-text-muted">
                        {block.is_recurring && block.day_of_week != null
                          ? `${DAY_NAMES[block.day_of_week as number]}s, `
                          : block.specific_date
                          ? `${block.specific_date}, `
                          : ''}
                        {block.start_time} - {block.end_time}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteBlock(block.id)}
                      className="p-2 text-text-muted hover:text-danger transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {showAddBlock ? (
                <div className="border border-border rounded-lg p-4 space-y-4">
                  <div>
                    <Label>Block Name</Label>
                    <Input
                      placeholder="e.g., Lunch, School pickup"
                      value={newBlock.label}
                      onChange={(e) =>
                        setNewBlock((prev) => ({ ...prev, label: e.target.value }))
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Days</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {SHORT_DAY_NAMES.map((name, index) => (
                        <button
                          key={index}
                          onClick={() => toggleDay(index)}
                          className={cn(
                            'px-3 py-1.5 text-sm rounded-full transition-colors',
                            newBlock.days.includes(index)
                              ? 'bg-primary text-white'
                              : 'bg-muted text-text hover:bg-muted/80'
                          )}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={newBlock.start_time}
                        onChange={(e) =>
                          setNewBlock((prev) => ({
                            ...prev,
                            start_time: e.target.value,
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div className="flex-1">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={newBlock.end_time}
                        onChange={(e) =>
                          setNewBlock((prev) => ({
                            ...prev,
                            end_time: e.target.value,
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowAddBlock(false);
                        setNewBlock({
                          label: '',
                          days: [],
                          start_time: '12:00',
                          end_time: '13:00',
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleAddBlock}
                      disabled={
                        saving || !newBlock.label.trim() || newBlock.days.length === 0
                      }
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        'Add Block'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddBlock(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Break
                </Button>
              )}
            </>
          )}
        </section>

        {/* Drive Time */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Drive Time Buffer
          </h2>

          <p className="text-sm text-text-muted mb-4">
            Add buffer time between jobs to account for travel.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text">Enable drive time</p>
                <p className="text-sm text-text-muted">
                  Block time before/after jobs
                </p>
              </div>
              <Switch
                checked={driveTimeEnabled}
                onCheckedChange={setDriveTimeEnabled}
              />
            </div>

            {driveTimeEnabled && (
              <div>
                <Label>Default buffer (minutes)</Label>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={driveTimeMinutes}
                  onChange={(e) =>
                    setDriveTimeMinutes(parseInt(e.target.value) || 0)
                  }
                  className="mt-1 w-32"
                />
              </div>
            )}

            <Button onClick={handleSaveDriveTime} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Drive Time Settings
                </>
              )}
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function CalendarSettingsSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 skeleton rounded-lg" />
          <div className="h-6 w-40 skeleton rounded" />
        </div>
      </header>
      <div className="px-4 py-4 space-y-6">
        <div className="card p-4 h-48 skeleton" />
        <div className="card p-4 h-64 skeleton" />
        <div className="card p-4 h-32 skeleton" />
      </div>
    </div>
  );
}
