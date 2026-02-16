'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { UserWithBusiness } from '@/types';
import type { AnswerCertaintyMode, OverageMode } from '@/types/voice-receptionist';
import {
  ArrowLeft,
  Mic,
  Bot,
  Clock,
  AlertTriangle,
  DollarSign,
  Check,
  Loader2,
  Shield,
  Settings,
  Info,
  Users,
  Upload,
  Play,
  Pause,
  X,
  MapPin,
} from 'lucide-react';
import { DualContactSelector } from '@/components/voice/contact-selector';

const CERTAINTY_MODES: { value: AnswerCertaintyMode; label: string; description: string }[] = [
  {
    value: 'RING_TIMEOUT_ONLY',
    label: 'Ring Timeout Only',
    description: 'AI answers after phone rings for timeout duration',
  },
  {
    value: 'RING_TIMEOUT_OR_FORWARD',
    label: 'Ring Timeout or Forward',
    description: 'AI answers after timeout or when call is forwarded',
  },
  {
    value: 'EXPLICIT_FORWARD_ONLY',
    label: 'Explicit Forward Only',
    description: 'AI only answers when explicitly forwarded',
  },
];

export default function VoiceSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Settings state
  const [settings, setSettings] = useState<{
    answer_certainty_mode: AnswerCertaintyMode;
    ring_timeout_seconds: number;
    enable_daytime_ai_voice: boolean;
    voicemail_escape_enabled: boolean;
    synthflow_assistant_id: string;
    synthflow_voice_id: string;
    greeting_text: string;
    greeting_audio_url: string;
    after_hours_greeting: string;
    after_hours_audio_url: string;
    overage_mode: OverageMode;
    emergency_voice_escalation_enabled: boolean;
    max_voice_escalation_attempts: number;
    confidence_threshold_high: number;
    confidence_threshold_medium: number;
    default_primary_contact_id: string;
    default_backup_contact_id: string;
    default_escalation_wait_minutes: number;
  }>({
    answer_certainty_mode: 'RING_TIMEOUT_OR_FORWARD',
    ring_timeout_seconds: 20,
    enable_daytime_ai_voice: false,
    voicemail_escape_enabled: true,
    synthflow_assistant_id: '',
    synthflow_voice_id: '',
    greeting_text: '',
    greeting_audio_url: '',
    after_hours_greeting: '',
    after_hours_audio_url: '',
    overage_mode: 'hard_stop',
    emergency_voice_escalation_enabled: true,
    max_voice_escalation_attempts: 2,
    confidence_threshold_high: 0.85,
    confidence_threshold_medium: 0.60,
    default_primary_contact_id: '',
    default_backup_contact_id: '',
    default_escalation_wait_minutes: 5,
  });

  // Audio playback state
  const [playingAudio, setPlayingAudio] = useState<'greeting' | 'after_hours' | null>(null);
  const [uploadingAudio, setUploadingAudio] = useState<'greeting' | 'after_hours' | null>(null);

  // Usage state
  const [usage, setUsage] = useState<{
    included: number;
    used: number;
    remaining: number;
    percentUsed: number;
    isAtCap: boolean;
    overageApproved: boolean;
  } | null>(null);

  const loadData = useCallback(async () => {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      router.push('/login');
      return;
    }
    setUser(profile as UserWithBusiness);

    try {
      // Load voice settings
      const [settingsRes, usageRes] = await Promise.all([
        fetch('/api/voice/settings'),
        fetch('/api/voice/usage'),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        if (data.settings) {
          setSettings({
            answer_certainty_mode: data.settings.answer_certainty_mode || 'RING_TIMEOUT_OR_FORWARD',
            ring_timeout_seconds: data.settings.ring_timeout_seconds || 20,
            enable_daytime_ai_voice: data.settings.enable_daytime_ai_voice || false,
            voicemail_escape_enabled: data.settings.voicemail_escape_enabled ?? true,
            synthflow_assistant_id: data.settings.synthflow_assistant_id || '',
            synthflow_voice_id: data.settings.synthflow_voice_id || '',
            greeting_text: data.settings.greeting_text || '',
            greeting_audio_url: data.settings.greeting_audio_url || '',
            after_hours_greeting: data.settings.after_hours_greeting || '',
            after_hours_audio_url: data.settings.after_hours_audio_url || '',
            overage_mode: data.settings.overage_mode || 'hard_stop',
            emergency_voice_escalation_enabled: data.settings.emergency_voice_escalation_enabled ?? true,
            max_voice_escalation_attempts: data.settings.max_voice_escalation_attempts || 2,
            confidence_threshold_high: data.settings.confidence_threshold_high || 0.85,
            confidence_threshold_medium: data.settings.confidence_threshold_medium || 0.60,
            default_primary_contact_id: data.settings.default_primary_contact_id || '',
            default_backup_contact_id: data.settings.default_backup_contact_id || '',
            default_escalation_wait_minutes: data.settings.default_escalation_wait_minutes || 5,
          });
        }
      }

      if (usageRes.ok) {
        const data = await usageRes.json();
        if (data.usage) {
          setUsage(data.usage);
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
      const response = await fetch('/api/voice/settings', {
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
        description: 'Your voice receptionist settings have been updated.',
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

  async function toggleOverage(enable: boolean) {
    try {
      const response = await fetch('/api/voice/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: enable ? 'enable_overage' : 'disable_overage',
          acknowledged: enable,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresAcknowledgment) {
          const confirmed = confirm(
            `${data.terms.message}\n\nRate: ${data.terms.rateDescription}\n\nDo you agree to these terms?`
          );
          if (confirmed) {
            return toggleOverage(true);
          }
          return;
        }
        throw new Error(data.error);
      }

      setSettings({ ...settings, overage_mode: enable ? 'approved_overage' : 'hard_stop' });
      toast({
        title: enable ? 'Overage billing enabled' : 'Overage billing disabled',
        description: data.message,
      });
      loadData();
    } catch (error) {
      toast({
        title: 'Failed to update overage settings',
        description: error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  }

  if (loading || !user) {
    return <VoiceSettingsSkeleton />;
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
          <h1 className="text-lg font-semibold text-text">AI Voice Receptionist</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-6">
        {/* Usage Summary */}
        {usage && (
          <section className="card p-4">
            <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Voice Minutes Usage
            </h2>

            <div className="space-y-4">
              {/* Usage gauge */}
              <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    'absolute left-0 top-0 h-full transition-all',
                    usage.percentUsed >= 90
                      ? 'bg-danger'
                      : usage.percentUsed >= 70
                        ? 'bg-warning'
                        : 'bg-success'
                  )}
                  style={{ width: `${Math.min(100, usage.percentUsed)}%` }}
                />
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-text-muted">
                  {usage.used.toFixed(1)} / {usage.included} minutes used
                </span>
                <span
                  className={cn(
                    'font-medium',
                    usage.percentUsed >= 90
                      ? 'text-danger'
                      : usage.percentUsed >= 70
                        ? 'text-warning'
                        : 'text-success'
                  )}
                >
                  {usage.remaining.toFixed(1)} remaining
                </span>
              </div>

              {usage.isAtCap && !usage.overageApproved && (
                <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-danger flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-danger">Usage Cap Reached</p>
                    <p className="text-sm text-text-muted mt-1">
                      Voice AI is paused. Enable overage billing to continue.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Overage Settings */}
        {isOwner && (
          <section className="card p-4">
            <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Overage Billing
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-text">Allow Overage Minutes</p>
                  <p className="text-sm text-text-muted">
                    Continue using Voice AI beyond plan limits ($0.08/min)
                  </p>
                </div>
                <Switch
                  checked={settings.overage_mode === 'approved_overage'}
                  onCheckedChange={(checked) => toggleOverage(checked)}
                />
              </div>

              <div className="p-3 bg-info/10 border border-info/20 rounded-lg flex items-start gap-3">
                <Info className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
                <p className="text-sm text-text-muted">
                  {settings.overage_mode === 'hard_stop'
                    ? 'When you reach your limit, Voice AI will pause and calls will go to voicemail.'
                    : 'You will be charged $0.08 per minute for usage beyond your plan.'}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* AI Voice Settings */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Voice Settings
          </h2>

          <div className="space-y-4">
            {/* Daytime AI Voice */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text">Daytime AI Voice</p>
                <p className="text-sm text-text-muted">
                  Allow AI to answer during business hours
                </p>
              </div>
              <Switch
                checked={settings.enable_daytime_ai_voice}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enable_daytime_ai_voice: checked })
                }
              />
            </div>

            {/* Voicemail Escape */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text">Voicemail Escape (Press 9)</p>
                <p className="text-sm text-text-muted">
                  Allow callers to skip AI and leave voicemail
                </p>
              </div>
              <Switch
                checked={settings.voicemail_escape_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, voicemail_escape_enabled: checked })
                }
              />
            </div>

            {/* Answer Certainty Mode */}
            <div>
              <Label>Answer Certainty Mode</Label>
              <Select
                value={settings.answer_certainty_mode}
                onValueChange={(value) =>
                  setSettings({
                    ...settings,
                    answer_certainty_mode: value as AnswerCertaintyMode,
                  })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CERTAINTY_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value}>
                      <div>
                        <p className="font-medium">{mode.label}</p>
                        <p className="text-xs text-text-muted">{mode.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Ring Timeout */}
            <div>
              <Label>Ring Timeout (seconds)</Label>
              <Input
                type="number"
                min={5}
                max={60}
                value={settings.ring_timeout_seconds}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    ring_timeout_seconds: parseInt(e.target.value) || 20,
                  })
                }
                className="mt-1 w-32"
              />
            </div>
          </div>
        </section>

        {/* Greetings */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Greetings
          </h2>

          <div className="space-y-4">
            <div>
              <Label>Business Hours Greeting</Label>
              <Textarea
                placeholder="Hello! Thank you for calling. How can I help you today?"
                value={settings.greeting_text}
                onChange={(e) =>
                  setSettings({ ...settings, greeting_text: e.target.value })
                }
                rows={3}
                className="mt-1"
              />
              {/* Audio upload for greeting */}
              <div className="mt-2 flex items-center gap-2">
                {settings.greeting_audio_url ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (playingAudio === 'greeting') {
                          setPlayingAudio(null);
                        } else {
                          setPlayingAudio('greeting');
                          const audio = new Audio(settings.greeting_audio_url);
                          audio.onended = () => setPlayingAudio(null);
                          audio.play();
                        }
                      }}
                    >
                      {playingAudio === 'greeting' ? (
                        <Pause className="h-4 w-4 mr-1" />
                      ) : (
                        <Play className="h-4 w-4 mr-1" />
                      )}
                      {playingAudio === 'greeting' ? 'Stop' : 'Play'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSettings({ ...settings, greeting_audio_url: '' })
                      }
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingAudio('greeting');
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          formData.append('type', 'greeting');
                          const res = await fetch('/api/voice/audio', {
                            method: 'POST',
                            body: formData,
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setSettings({
                              ...settings,
                              greeting_audio_url: data.url,
                            });
                          }
                        } finally {
                          setUploadingAudio(null);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingAudio === 'greeting'}
                      asChild
                    >
                      <span>
                        {uploadingAudio === 'greeting' ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-1" />
                        )}
                        Upload Audio
                      </span>
                    </Button>
                  </label>
                )}
                <span className="text-xs text-text-muted">
                  Or use text-to-speech from the text above
                </span>
              </div>
            </div>

            <div>
              <Label>After Hours Greeting</Label>
              <Textarea
                placeholder="Thank you for calling. Our office is currently closed. Please leave a message..."
                value={settings.after_hours_greeting}
                onChange={(e) =>
                  setSettings({ ...settings, after_hours_greeting: e.target.value })
                }
                rows={3}
                className="mt-1"
              />
              {/* Audio upload for after hours */}
              <div className="mt-2 flex items-center gap-2">
                {settings.after_hours_audio_url ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (playingAudio === 'after_hours') {
                          setPlayingAudio(null);
                        } else {
                          setPlayingAudio('after_hours');
                          const audio = new Audio(settings.after_hours_audio_url);
                          audio.onended = () => setPlayingAudio(null);
                          audio.play();
                        }
                      }}
                    >
                      {playingAudio === 'after_hours' ? (
                        <Pause className="h-4 w-4 mr-1" />
                      ) : (
                        <Play className="h-4 w-4 mr-1" />
                      )}
                      {playingAudio === 'after_hours' ? 'Stop' : 'Play'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSettings({ ...settings, after_hours_audio_url: '' })
                      }
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingAudio('after_hours');
                        try {
                          const formData = new FormData();
                          formData.append('file', file);
                          formData.append('type', 'after_hours');
                          const res = await fetch('/api/voice/audio', {
                            method: 'POST',
                            body: formData,
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setSettings({
                              ...settings,
                              after_hours_audio_url: data.url,
                            });
                          }
                        } finally {
                          setUploadingAudio(null);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingAudio === 'after_hours'}
                      asChild
                    >
                      <span>
                        {uploadingAudio === 'after_hours' ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-1" />
                        )}
                        Upload Audio
                      </span>
                    </Button>
                  </label>
                )}
                <span className="text-xs text-text-muted">
                  Or use text-to-speech from the text above
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Default Contacts */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Default Contacts
          </h2>

          <div className="space-y-4">
            <DualContactSelector
              primaryContactId={settings.default_primary_contact_id || undefined}
              backupContactId={settings.default_backup_contact_id || undefined}
              onPrimaryChange={(val) =>
                setSettings({ ...settings, default_primary_contact_id: val || '' })
              }
              onBackupChange={(val) =>
                setSettings({ ...settings, default_backup_contact_id: val || '' })
              }
            />

            <div>
              <Label>Escalation Wait Time (minutes)</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={settings.default_escalation_wait_minutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    default_escalation_wait_minutes: parseInt(e.target.value) || 5,
                  })
                }
                className="mt-1 w-32"
              />
              <p className="text-xs text-text-muted mt-1">
                Time to wait before escalating to backup contact
              </p>
            </div>

            <div className="p-3 bg-info/10 border border-info/20 rounded-lg flex items-start gap-3">
              <Info className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
              <p className="text-sm text-text-muted">
                These are the default contacts for all locations. You can override these
                for specific locations in the{' '}
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => router.push('/settings/voice/locations')}
                >
                  Location Settings
                </button>
                .
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => router.push('/settings/voice/locations')}
              className="w-full"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Manage Location Overrides
            </Button>
          </div>
        </section>

        {/* Emergency Settings */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-danger" />
            Emergency Handling
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-text">Voice Escalation for Emergencies</p>
                <p className="text-sm text-text-muted">
                  Call staff directly for confirmed emergencies
                </p>
              </div>
              <Switch
                checked={settings.emergency_voice_escalation_enabled}
                onCheckedChange={(checked) =>
                  setSettings({
                    ...settings,
                    emergency_voice_escalation_enabled: checked,
                  })
                }
              />
            </div>

            <div>
              <Label>Max Escalation Attempts</Label>
              <Input
                type="number"
                min={1}
                max={5}
                value={settings.max_voice_escalation_attempts}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    max_voice_escalation_attempts: parseInt(e.target.value) || 2,
                  })
                }
                className="mt-1 w-32"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => router.push('/settings/voice/emergency-rules')}
              className="w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Emergency Rules
            </Button>
          </div>
        </section>

        {/* Confidence Thresholds */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            AI Confidence Thresholds
          </h2>

          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              When AI confidence is below these thresholds, it will ask for clarification
              or defer to a human rather than guessing.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>High Confidence ({(settings.confidence_threshold_high * 100).toFixed(0)}%)</Label>
                <Input
                  type="number"
                  min={0.5}
                  max={1}
                  step={0.05}
                  value={settings.confidence_threshold_high}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      confidence_threshold_high: parseFloat(e.target.value) || 0.85,
                    })
                  }
                  className="mt-1"
                />
                <p className="text-xs text-text-muted mt-1">AI proceeds with action</p>
              </div>

              <div>
                <Label>Medium Confidence ({(settings.confidence_threshold_medium * 100).toFixed(0)}%)</Label>
                <Input
                  type="number"
                  min={0.3}
                  max={0.84}
                  step={0.05}
                  value={settings.confidence_threshold_medium}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      confidence_threshold_medium: parseFloat(e.target.value) || 0.60,
                    })
                  }
                  className="mt-1"
                />
                <p className="text-xs text-text-muted mt-1">AI asks clarification</p>
              </div>
            </div>
          </div>
        </section>

        {/* Synthflow Integration */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Synthflow Integration
          </h2>

          <div className="space-y-4">
            <div>
              <Label>Assistant ID</Label>
              <Input
                placeholder="asst_..."
                value={settings.synthflow_assistant_id}
                onChange={(e) =>
                  setSettings({ ...settings, synthflow_assistant_id: e.target.value })
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label>Voice ID (optional)</Label>
              <Input
                placeholder="voice_..."
                value={settings.synthflow_voice_id}
                onChange={(e) =>
                  setSettings({ ...settings, synthflow_voice_id: e.target.value })
                }
                className="mt-1"
              />
            </div>
          </div>
        </section>

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

function VoiceSettingsSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="h-10 w-10 skeleton rounded-lg" />
          <div className="h-6 w-48 skeleton rounded" />
        </div>
      </header>
      <div className="px-4 py-4 space-y-6">
        <div className="card p-4 h-32 skeleton" />
        <div className="card p-4 h-48 skeleton" />
        <div className="card p-4 h-64 skeleton" />
      </div>
    </div>
  );
}
