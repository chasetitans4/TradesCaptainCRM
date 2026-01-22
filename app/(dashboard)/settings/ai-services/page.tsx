'use client';

// =====================================================
// AI SERVICES SETTINGS PAGE (v6.3)
// Master control for enabling/disabling all AI services
// v6.3: Leads Captain is now a $49/mo add-on
// =====================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  AlertDescription,
  Switch,
  Badge,
} from '@/components/ui';
import {
  Bot,
  MessageSquare,
  Phone,
  Settings,
  ArrowRight,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';

interface AIServicesStatus {
  aiServicesEnabled: boolean;
  hasLeadsCaptainAddon: boolean;
  planType: string;
  planTier: 'starter' | 'pro' | 'enterprise';
  smsLimit: number;
  addonPrice: number;
  settingsPath: string;
}

// SMS limits by plan tier (when LC addon is active)
const SMS_LIMITS: Record<string, number> = {
  starter: 1000,
  pro: 2000,
  enterprise: 3000,
};

export default function AIServicesPage() {
  const router = useRouter();
  const [status, setStatus] = useState<AIServicesStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch('/api/settings/ai-services');
      if (!res.ok) throw new Error('Failed to load settings');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setError('Failed to load AI services settings');
    } finally {
      setLoading(false);
    }
  }

  async function toggleAIServices(enabled: boolean) {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/settings/ai-services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.addonRequired) {
          setError('AI services require the Leads Captain add-on. Purchase it from your billing settings.');
        } else {
          throw new Error(data.error || 'Failed to update settings');
        }
        return;
      }

      setStatus((prev) => prev ? { ...prev, aiServicesEnabled: enabled } : null);
      setSuccess(enabled ? 'AI services enabled successfully!' : 'AI services disabled.');
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const planDisplayName = status?.planType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  const hasAddon = status?.hasLeadsCaptainAddon ?? false;
  const smsLimit = hasAddon ? (SMS_LIMITS[status?.planTier || 'starter'] || 1000) : 0;

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <Bot className="h-7 w-7 text-primary" />
          AI Services
        </h1>
        <p className="text-text-muted mt-1">
          Control AI-powered features for your business
        </p>
      </div>

      {error && (
        <Alert variant="danger">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Leads Captain Add-on Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Leads Captain Add-on</span>
            <Badge variant={hasAddon ? 'success' : 'warning'}>
              {hasAddon ? 'Active' : 'Not Purchased'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasAddon ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800">Unlock AI Services</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Add Leads Captain for <strong>$49/mo</strong> to enable AI-powered features:
                  </p>
                  <ul className="text-sm text-blue-700 mt-2 list-disc list-inside space-y-1">
                    <li>AI SMS auto-responder</li>
                    <li>Missed call text-back</li>
                    <li>{smsLimit > 0 ? smsLimit.toLocaleString() : SMS_LIMITS[status?.planTier || 'starter']?.toLocaleString()} SMS messages/month</li>
                    <li>Lead capture automation</li>
                  </ul>
                </div>
              </div>
              <Button onClick={() => router.push('/settings/billing?addon=leads_captain')} className="w-full">
                <CreditCard className="h-4 w-4 mr-2" />
                Add Leads Captain ($49/mo)
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-800">Leads Captain Active</p>
                  <p className="text-sm text-green-700">
                    You have {smsLimit.toLocaleString()} SMS messages/month included with your {planDisplayName}.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Master Toggle - Only show if they have the add-on */}
      {hasAddon && (
        <Card>
          <CardHeader>
            <CardTitle>AI Services Master Toggle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  status?.aiServicesEnabled ? 'bg-primary text-white' : 'bg-muted text-text-muted'
                }`}>
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Enable AI Services</p>
                  <p className="text-sm text-text-muted">
                    {status?.aiServicesEnabled
                      ? 'AI is responding to your customers'
                      : 'AI services are currently disabled'
                    }
                  </p>
                </div>
              </div>
              <Switch
                checked={status?.aiServicesEnabled ?? false}
                onCheckedChange={toggleAIServices}
                disabled={saving}
              />
            </div>

            {status?.aiServicesEnabled && (
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription>
                  AI is active! Configure detailed settings below.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Features - Only show if they have the add-on */}
      {hasAddon && (
        <Card>
          <CardHeader>
            <CardTitle>AI-Powered Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`p-4 border rounded-lg ${!status?.aiServicesEnabled ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">AI SMS Auto-Responder</p>
                    <Badge variant={status?.aiServicesEnabled ? 'success' : 'secondary'}>
                      {status?.aiServicesEnabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-muted mt-1">
                    Automatically respond to customer text messages with AI
                  </p>
                  {status?.aiServicesEnabled && (
                    <Button
                      variant="link"
                      size="sm"
                      className="px-0 mt-2"
                      onClick={() => router.push('/settings/ai-sms')}
                    >
                      Configure Settings
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className={`p-4 border rounded-lg ${!status?.aiServicesEnabled ? 'opacity-50' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Phone className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Missed Call Text-Back</p>
                    <Badge variant={status?.aiServicesEnabled ? 'success' : 'secondary'}>
                      {status?.aiServicesEnabled ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-muted mt-1">
                    Automatically text customers who call when you can&apos;t answer
                  </p>
                  {status?.aiServicesEnabled && (
                    <Button
                      variant="link"
                      size="sm"
                      className="px-0 mt-2"
                      onClick={() => router.push('/leads-captain/settings')}
                    >
                      Configure Settings
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Box */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-text-muted flex-shrink-0 mt-0.5" />
            <div className="text-sm text-text-muted">
              <p className="font-medium text-text">Need to change these settings later?</p>
              <p className="mt-1">
                You can always return to this page at <strong>Settings &gt; AI Services</strong> to
                manage your AI features. {!hasAddon && 'Purchase the Leads Captain add-on anytime to unlock AI capabilities.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
