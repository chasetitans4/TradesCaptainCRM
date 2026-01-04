'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
} from '@/components/ui';
import {
  ArrowLeft,
  MessageSquare,
  Calendar,
  Clock,
  Receipt,
  FileText,
  Bell,
  Loader2,
  Check,
  Star,
  Route,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FeatureSettings {
  ai_sms_enabled: boolean;
  auto_appointment_reminders: boolean;
  auto_review_requests: boolean;
  online_booking_enabled: boolean;
  route_optimization_enabled: boolean;
  timesheets_enabled: boolean;
  receipts_enabled: boolean;
  quotes_enabled: boolean;
  invoices_enabled: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
}

interface FeatureToggle {
  key: keyof FeatureSettings;
  label: string;
  description: string;
  icon: React.ElementType;
}

const COMMUNICATION_FEATURES: FeatureToggle[] = [
  {
    key: 'ai_sms_enabled',
    label: 'AI SMS Auto-Responses',
    description: 'Automatically respond to customer texts',
    icon: MessageSquare,
  },
  {
    key: 'auto_appointment_reminders',
    label: 'Appointment Reminders',
    description: 'Send reminders before scheduled jobs',
    icon: Bell,
  },
  {
    key: 'auto_review_requests',
    label: 'Review Requests',
    description: 'Request Google reviews after jobs',
    icon: Star,
  },
];

const SCHEDULING_FEATURES: FeatureToggle[] = [
  {
    key: 'route_optimization_enabled',
    label: 'Route Optimization',
    description: 'Optimize daily routes for technicians',
    icon: Route,
  },
  {
    key: 'online_booking_enabled',
    label: 'Online Booking',
    description: 'Let customers book appointments online',
    icon: Calendar,
  },
];

const CRM_FEATURES: FeatureToggle[] = [
  {
    key: 'timesheets_enabled',
    label: 'Timesheets',
    description: 'Track technician hours',
    icon: Clock,
  },
  {
    key: 'receipts_enabled',
    label: 'Receipt Tracking',
    description: 'Save and tag receipts to jobs',
    icon: Receipt,
  },
  {
    key: 'quotes_enabled',
    label: 'Quotes',
    description: 'Create and send quotes',
    icon: FileText,
  },
  {
    key: 'invoices_enabled',
    label: 'Invoices',
    description: 'Create and send invoices',
    icon: FileText,
  },
];

const NOTIFICATION_FEATURES: FeatureToggle[] = [
  {
    key: 'email_notifications',
    label: 'Email Notifications',
    description: 'Receive updates via email',
    icon: Bell,
  },
  {
    key: 'sms_notifications',
    label: 'SMS Notifications',
    description: 'Receive updates via text message',
    icon: MessageSquare,
  },
  {
    key: 'push_notifications',
    label: 'Push Notifications',
    description: 'Receive updates in the app',
    icon: Bell,
  },
];

export default function FeaturesSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<FeatureSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/features');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data = await res.json();
      setSettings(data.settings);
    } catch (_error) {
      toast({ title: 'Failed to load features', description: 'Please try again', variant: 'destructive' });
      setError('Failed to load feature settings');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function toggleFeature(key: keyof FeatureSettings) {
    if (!settings) return;

    const newValue = !settings[key];
    const updatedSettings = { ...settings, [key]: newValue };
    setSettings(updatedSettings);
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { [key]: newValue } }),
      });

      if (!res.ok) {
        throw new Error('Failed to update setting');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (_error) {
      // Revert on error
      setSettings({ ...settings, [key]: !newValue });
      setError('Failed to save setting');
      toast({ title: 'Failed to save setting', description: 'Please try again', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
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
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold text-text">Feature Settings</h1>
        {saving && <Loader2 className="h-4 w-4 animate-spin text-primary ml-auto" />}
        {success && <Check className="h-4 w-4 text-success ml-auto" />}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {error && (
          <Alert variant="danger">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Communication */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Communication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-0">
            {COMMUNICATION_FEATURES.map((feature) => (
              <FeatureRow
                key={feature.key}
                feature={feature}
                enabled={settings?.[feature.key] ?? false}
                onToggle={() => toggleFeature(feature.key)}
              />
            ))}
          </CardContent>
        </Card>

        {/* Scheduling */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scheduling</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-0">
            {SCHEDULING_FEATURES.map((feature) => (
              <FeatureRow
                key={feature.key}
                feature={feature}
                enabled={settings?.[feature.key] ?? false}
                onToggle={() => toggleFeature(feature.key)}
              />
            ))}
          </CardContent>
        </Card>

        {/* CRM */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CRM</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-0">
            {CRM_FEATURES.map((feature) => (
              <FeatureRow
                key={feature.key}
                feature={feature}
                enabled={settings?.[feature.key] ?? false}
                onToggle={() => toggleFeature(feature.key)}
              />
            ))}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-0">
            {NOTIFICATION_FEATURES.map((feature) => (
              <FeatureRow
                key={feature.key}
                feature={feature}
                enabled={settings?.[feature.key] ?? false}
                onToggle={() => toggleFeature(feature.key)}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FeatureRow({
  feature,
  enabled,
  onToggle,
}: {
  feature: FeatureToggle;
  enabled: boolean;
  onToggle: () => void;
}) {
  const Icon = feature.icon;

  return (
    <div
      className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
          <Icon className="h-4 w-4 text-text-muted" />
        </div>
        <div>
          <p className="font-medium text-text text-sm">{feature.label}</p>
          <p className="text-xs text-text-muted">{feature.description}</p>
        </div>
      </div>
      <Toggle enabled={enabled} />
    </div>
  );
}

function Toggle({ enabled }: { enabled: boolean }) {
  return (
    <div
      className={`w-11 h-6 rounded-full transition-colors relative ${
        enabled ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </div>
  );
}
