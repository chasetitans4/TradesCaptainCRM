'use client';

// =====================================================
// LEADS CAPTAIN v2 SETTINGS PAGE
// Business context, hours, AI settings, intents
// =====================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import type { LeadsCaptainConfig, LeadsCaptainIntent, UpdateConfigRequest } from '@/types/leads-captain';
import { logger } from '@/lib/logger';

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'America/Phoenix', label: 'Arizona Time' },
];

const BUSINESS_TYPES = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'general', label: 'General Contractor' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'other', label: 'Other' },
];

export default function LeadsCaptainSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<LeadsCaptainConfig | null>(null);
  const [intents, setIntents] = useState<LeadsCaptainIntent[]>([]);
  const [formData, setFormData] = useState<UpdateConfigRequest>({});
  const [intentChanges, setIntentChanges] = useState<Record<string, boolean>>({});
  const lcSettingsLogger = logger.child({ context: 'leads-captain.settings' });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [configRes, intentsRes] = await Promise.all([
        fetch('/api/leads-captain/v2/config'),
        fetch('/api/leads-captain/v2/intents'),
      ]);

      const configData = await configRes.json();
      const intentsData = await intentsRes.json();

      if (configData.needs_setup || configData.error || !configData.config) {
        router.push('/leads-captain');
        return;
      }

      setConfig(configData.config);
      setIntents(intentsData.intents || []);
      setFormData(configData.config || {});
    } catch (error) {
      lcSettingsLogger.error({
        msg: 'Error fetching settings',
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Save config changes
      const configRes = await fetch('/api/leads-captain/v2/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!configRes.ok) {
        throw new Error('Failed to save config');
      }

      // Save intent changes if any
      if (Object.keys(intentChanges).length > 0) {
        const intentUpdates = Object.entries(intentChanges).map(([code, enabled]) => ({
          intent_code: code,
          enabled,
        }));

        await fetch('/api/leads-captain/v2/intents', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intents: intentUpdates }),
        });
      }

      toast.success('Settings saved');
      setIntentChanges({});
      fetchSettings();
    } catch (error) {
      lcSettingsLogger.error({
        msg: 'Error saving settings',
        error: error instanceof Error ? error.message : String(error),
      });
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (key: keyof UpdateConfigRequest, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleIntent = (intentCode: string, enabled: boolean) => {
    setIntentChanges((prev) => ({ ...prev, [intentCode]: enabled }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const groupedIntents = intents.reduce((acc, intent) => {
    const category = intent.intent_category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(intent);
    return acc;
  }, {} as Record<string, LeadsCaptainIntent[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/leads-captain')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Leads Captain Settings</h1>
            <p className="text-muted-foreground">Configure your AI SMS response system</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="business" className="space-y-4">
        <TabsList>
          <TabsTrigger value="business">Business Info</TabsTrigger>
          <TabsTrigger value="response">Response Style</TabsTrigger>
          <TabsTrigger value="ai">AI Settings</TabsTrigger>
          <TabsTrigger value="intents">Intents</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
        </TabsList>

        {/* Business Info Tab */}
        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                This information is used in templates and AI responses
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name || ''}
                    onChange={(e) => updateFormData('business_name', e.target.value)}
                    placeholder="ABC Plumbing"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="business_type">Business Type</Label>
                  <Select
                    value={formData.business_type || ''}
                    onValueChange={(v) => updateFormData('business_type', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner_name">Owner Name</Label>
                  <Input
                    id="owner_name"
                    value={formData.owner_name || ''}
                    onChange={(e) => updateFormData('owner_name', e.target.value)}
                    placeholder="John Smith"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={formData.timezone || 'America/Chicago'}
                    onValueChange={(v) => updateFormData('timezone', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="service_area">Service Area</Label>
                <Input
                  id="service_area"
                  value={formData.service_area || ''}
                  onChange={(e) => updateFormData('service_area', e.target.value)}
                  placeholder="Austin metro area and surrounding counties"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="main_phone">Main Phone</Label>
                  <Input
                    id="main_phone"
                    value={formData.main_phone || ''}
                    onChange={(e) => updateFormData('main_phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_phone">Emergency Phone</Label>
                  <Input
                    id="emergency_phone"
                    value={formData.emergency_phone || ''}
                    onChange={(e) => updateFormData('emergency_phone', e.target.value)}
                    placeholder="(555) 987-6543"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="booking_link">Booking Link</Label>
                  <Input
                    id="booking_link"
                    value={formData.booking_link || ''}
                    onChange={(e) => updateFormData('booking_link', e.target.value)}
                    placeholder="https://calendly.com/..."
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="emergency_service"
                  checked={formData.emergency_service ?? false}
                  onCheckedChange={(v) => updateFormData('emergency_service', v)}
                />
                <Label htmlFor="emergency_service">Offer 24/7 emergency service</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Response Style Tab */}
        <TabsContent value="response">
          <Card>
            <CardHeader>
              <CardTitle>Response Style</CardTitle>
              <CardDescription>
                How AI and templates should communicate with customers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select
                  value={formData.tone || 'friendly_professional'}
                  onValueChange={(v) => updateFormData('tone', v)}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual - Like texting a friend</SelectItem>
                    <SelectItem value="friendly_professional">Friendly Professional (Recommended)</SelectItem>
                    <SelectItem value="formal">Formal - Business appropriate</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="use_emojis"
                  checked={formData.use_emojis ?? true}
                  onCheckedChange={(v) => updateFormData('use_emojis', v)}
                />
                <Label htmlFor="use_emojis">Use emojis in responses</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Settings Tab */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle>AI Settings</CardTitle>
              <CardDescription>
                Configure how AI handles conversations when no rule matches
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="ai_enabled"
                  checked={formData.ai_enabled ?? true}
                  onCheckedChange={(v) => updateFormData('ai_enabled', v)}
                />
                <Label htmlFor="ai_enabled">Enable AI responses (fallback when no rule matches)</Label>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Confidence Threshold</Label>
                    <span className="text-sm text-muted-foreground">
                      {formData.ai_confidence_threshold || 70}%
                    </span>
                  </div>
                  <Slider
                    value={[formData.ai_confidence_threshold || 70]}
                    onValueChange={([v]) => updateFormData('ai_confidence_threshold', v)}
                    min={30}
                    max={95}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Below this threshold, responses may require approval
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>AI Creativity Level</Label>
                  <Select
                    value={formData.ai_creativity_level || 'low'}
                    onValueChange={(v) => updateFormData('ai_creativity_level', v)}
                  >
                    <SelectTrigger className="w-[300px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None - Stick strictly to templates</SelectItem>
                      <SelectItem value="low">Low - Minor variations (Recommended)</SelectItem>
                      <SelectItem value="medium">Medium - More natural conversation</SelectItem>
                      <SelectItem value="high">High - Creative responses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Max AI Messages Per Conversation</Label>
                    <span className="text-sm text-muted-foreground">
                      {formData.ai_max_messages || 5}
                    </span>
                  </div>
                  <Slider
                    value={[formData.ai_max_messages || 5]}
                    onValueChange={([v]) => updateFormData('ai_max_messages', v)}
                    min={1}
                    max={20}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    After this many AI messages, the conversation requires human attention
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Pricing Disclosure</Label>
                  <Select
                    value={formData.ai_pricing_mode || 'ranges'}
                    onValueChange={(v) => updateFormData('ai_pricing_mode', v)}
                  >
                    <SelectTrigger className="w-[300px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never discuss pricing</SelectItem>
                      <SelectItem value="ranges">Give price ranges only (Recommended)</SelectItem>
                      <SelectItem value="specific">Share specific prices from list</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Intents Tab */}
        <TabsContent value="intents">
          <Card>
            <CardHeader>
              <CardTitle>Intent Recognition</CardTitle>
              <CardDescription>
                Choose which intents AI should recognize in messages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(groupedIntents).map(([category, categoryIntents]) => (
                <div key={category} className="space-y-3">
                  <h3 className="font-medium capitalize">{category} Intents</h3>
                  <div className="grid gap-2 md:grid-cols-2">
                    {categoryIntents.map((intent) => {
                      const isEnabled = intentChanges[intent.intent_code] ?? intent.enabled;
                      return (
                        <div
                          key={intent.id}
                          className="flex items-start space-x-3 p-3 rounded-lg border"
                        >
                          <Checkbox
                            id={intent.intent_code}
                            checked={isEnabled}
                            onCheckedChange={(checked) =>
                              toggleIntent(intent.intent_code, checked as boolean)
                            }
                          />
                          <div className="flex-1">
                            <Label htmlFor={intent.intent_code} className="cursor-pointer">
                              {intent.intent_label}
                            </Label>
                            {intent.example_phrases?.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                e.g., "{intent.example_phrases[0]}"
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Tab */}
        <TabsContent value="admin">
          <Card>
            <CardHeader>
              <CardTitle>Admin Settings</CardTitle>
              <CardDescription>System-wide controls and approval settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Global Mode</Label>
                <Select
                  value={formData.global_mode || 'normal'}
                  onValueChange={(v) => updateFormData('global_mode', v)}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal - AI + Rules active</SelectItem>
                    <SelectItem value="templates_only">Templates Only - No AI</SelectItem>
                    <SelectItem value="paused">Paused - No automatic responses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Require Approval</Label>
                <Select
                  value={formData.require_approval || 'never'}
                  onValueChange={(v) => updateFormData('require_approval', v)}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never - Send all responses automatically</SelectItem>
                    <SelectItem value="low_confidence">Low Confidence - Require approval below threshold</SelectItem>
                    <SelectItem value="first_message">First Message - Approve first response in each conversation</SelectItem>
                    <SelectItem value="all">All - Approve every AI response</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Approval Timeout</Label>
                  <span className="text-sm text-muted-foreground">
                    {formData.approval_timeout_minutes || 5} minutes
                  </span>
                </div>
                <Slider
                  value={[formData.approval_timeout_minutes || 5]}
                  onValueChange={([v]) => updateFormData('approval_timeout_minutes', v)}
                  min={1}
                  max={30}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Messages are auto-sent after timeout if not reviewed
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
