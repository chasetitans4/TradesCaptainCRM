'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { UserWithBusiness, AvailablePhoneNumber, CallForwardingMode } from '@/types';
import {
  ArrowLeft,
  Phone,
  PhoneCall,
  PhoneForwarded,
  Voicemail,
  Check,
  Loader2,
  Search,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';

const FORWARDING_MODES: { value: CallForwardingMode; label: string; description: string }[] = [
  { value: 'voicemail', label: 'Voicemail Only', description: 'Send all calls to voicemail' },
  { value: 'forward_owner', label: 'Forward to Owner', description: 'Forward to primary number' },
  { value: 'forward_custom', label: 'Forward to Custom', description: 'Forward to specified number' },
  { value: 'forward_sequential', label: 'Sequential', description: 'Try numbers in order' },
  { value: 'forward_simultaneous', label: 'Simultaneous', description: 'Ring all numbers at once' },
];

export default function PhoneSettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Phone number state
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [phoneSid, setPhoneSid] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [areaCode, setAreaCode] = useState('');
  const [availableNumbers, setAvailableNumbers] = useState<AvailablePhoneNumber[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  // Call forwarding state
  const [forwardingMode, setForwardingMode] = useState<CallForwardingMode>('voicemail');
  const [forwardNumbers, setForwardNumbers] = useState<string[]>([]);
  const [ringTimeout, setRingTimeout] = useState(20);
  const [businessHoursOnly, setBusinessHoursOnly] = useState(false);
  const [afterHoursMode, setAfterHoursMode] = useState<CallForwardingMode>('voicemail');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      router.push('/login');
      return;
    }
    setUser(profile as UserWithBusiness);

    // Load phone settings
    try {
      const response = await fetch('/api/phone/settings');
      const data = await response.json();

      if (response.ok) {
        setPhoneNumber(data.phone_number);
        setPhoneSid(data.phone_sid);
        setForwardingMode(data.call_forwarding?.mode || 'voicemail');
        setForwardNumbers(data.call_forwarding?.forward_numbers || []);
        setRingTimeout(data.call_forwarding?.ring_timeout || 20);
        setBusinessHoursOnly(data.call_forwarding?.business_hours_only || false);
        setAfterHoursMode(data.call_forwarding?.after_hours_mode || 'voicemail');
      }
    } catch (error) {
      console.error('Error loading phone settings:', error);
    }

    setLoading(false);
  }

  async function searchNumbers() {
    if (!areaCode || areaCode.length !== 3) return;

    setSearching(true);
    try {
      const response = await fetch(`/api/phone/available?areaCode=${areaCode}`);
      const data = await response.json();

      if (response.ok) {
        setAvailableNumbers(data.numbers || []);
      }
    } catch (error) {
      console.error('Error searching numbers:', error);
    } finally {
      setSearching(false);
    }
  }

  async function provisionNumber(number: string) {
    setProvisioning(true);
    try {
      const response = await fetch('/api/phone/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: number }),
      });

      if (response.ok) {
        const data = await response.json();
        setPhoneNumber(data.phone_number);
        setPhoneSid(data.phone_sid);
        setShowSearch(false);
        setAvailableNumbers([]);
      }
    } catch (error) {
      console.error('Error provisioning number:', error);
    } finally {
      setProvisioning(false);
    }
  }

  async function releaseNumber() {
    if (!confirm('Are you sure you want to release this phone number? This cannot be undone and you may not be able to get this number back.')) {
      return;
    }

    setReleasing(true);
    try {
      const response = await fetch('/api/phone/release', { method: 'POST' });

      if (response.ok) {
        setPhoneNumber(null);
        setPhoneSid(null);
      }
    } catch (error) {
      console.error('Error releasing number:', error);
    } finally {
      setReleasing(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const response = await fetch('/api/phone/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_forwarding: {
            mode: forwardingMode,
            forward_numbers: forwardNumbers.filter(Boolean),
            ring_timeout: ringTimeout,
            business_hours_only: businessHoursOnly,
            after_hours_mode: afterHoursMode,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  }

  function formatPhoneDisplay(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    const local = digits.startsWith('1') && digits.length === 11
      ? digits.substring(1)
      : digits;

    if (local.length === 10) {
      return `(${local.substring(0, 3)}) ${local.substring(3, 6)}-${local.substring(6)}`;
    }
    return phone;
  }

  function addForwardNumber() {
    if (forwardNumbers.length < 3) {
      setForwardNumbers([...forwardNumbers, '']);
    }
  }

  function removeForwardNumber(index: number) {
    setForwardNumbers(forwardNumbers.filter((_, i) => i !== index));
  }

  function updateForwardNumber(index: number, value: string) {
    const updated = [...forwardNumbers];
    updated[index] = value;
    setForwardNumbers(updated);
  }

  if (loading || !user) {
    return <PhoneSettingsSkeleton />;
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
          <h1 className="text-lg font-semibold text-text">Phone Settings</h1>
        </div>
      </header>

      <div className="px-4 py-4 space-y-6">
        {/* Business Phone Number */}
        <section className="card p-4">
          <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Business Phone Number
          </h2>

          {phoneNumber ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-success/5 border border-success/20 rounded-lg">
                <div className="p-3 bg-success/10 rounded-full">
                  <Phone className="h-6 w-6 text-success" />
                </div>
                <div className="flex-1">
                  <p className="text-xl font-semibold text-text">
                    {formatPhoneDisplay(phoneNumber)}
                  </p>
                  <p className="text-sm text-text-muted">
                    Your dedicated business number
                  </p>
                </div>
              </div>

              {isOwner && (
                <Button
                  variant="outline"
                  className="w-full text-danger border-danger/30 hover:bg-danger/5"
                  onClick={releaseNumber}
                  disabled={releasing}
                >
                  {releasing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Releasing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Release Number
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {!showSearch ? (
                <>
                  <p className="text-sm text-text-muted">
                    Get a dedicated phone number for your business. Customers can text
                    and call this number, and it will be synced with your CRM.
                  </p>
                  {isOwner ? (
                    <Button onClick={() => setShowSearch(true)} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Get a Phone Number
                    </Button>
                  ) : (
                    <p className="text-sm text-warning flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Only the business owner can provision phone numbers
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Area code (e.g., 512)"
                      value={areaCode}
                      onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, '').slice(0, 3))}
                      maxLength={3}
                      className="flex-1"
                    />
                    <Button onClick={searchNumbers} disabled={areaCode.length !== 3 || searching}>
                      {searching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {availableNumbers.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {availableNumbers.map((num) => (
                        <button
                          key={num.phone_number}
                          onClick={() => provisionNumber(num.phone_number)}
                          disabled={provisioning}
                          className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                        >
                          <div className="text-left">
                            <p className="font-medium text-text">
                              {formatPhoneDisplay(num.phone_number)}
                            </p>
                            <p className="text-sm text-text-muted">
                              {num.locality}, {num.region}
                            </p>
                          </div>
                          {provisioning ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Badge>Select</Badge>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <Button variant="outline" onClick={() => setShowSearch(false)} className="w-full">
                    Cancel
                  </Button>
                </>
              )}
            </div>
          )}
        </section>

        {/* Call Forwarding - only show if phone number exists */}
        {phoneNumber && (
          <>
            <section className="card p-4">
              <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
                <PhoneForwarded className="h-5 w-5 text-primary" />
                Call Forwarding
              </h2>

              <div className="space-y-4">
                <div>
                  <Label>Forwarding Mode</Label>
                  <div className="mt-2 space-y-2">
                    {FORWARDING_MODES.map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => setForwardingMode(mode.value)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors',
                          forwardingMode === mode.value
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50'
                        )}
                      >
                        {forwardingMode === mode.value ? (
                          <Check className="h-5 w-5 text-primary" />
                        ) : (
                          <div className="h-5 w-5" />
                        )}
                        <div className="text-left">
                          <p className="font-medium text-text">{mode.label}</p>
                          <p className="text-sm text-text-muted">{mode.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Forward numbers */}
                {forwardingMode !== 'voicemail' && (
                  <div>
                    <Label>Forward to Numbers</Label>
                    <div className="mt-2 space-y-2">
                      {forwardNumbers.map((num, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            type="tel"
                            placeholder="(555) 123-4567"
                            value={num}
                            onChange={(e) => updateForwardNumber(index, e.target.value)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeForwardNumber(index)}
                          >
                            <Trash2 className="h-4 w-4 text-text-muted" />
                          </Button>
                        </div>
                      ))}
                      {forwardNumbers.length < 3 && (
                        <Button variant="outline" size="sm" onClick={addForwardNumber}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Number
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Ring timeout */}
                {forwardingMode !== 'voicemail' && (
                  <div>
                    <Label>Ring Timeout (seconds)</Label>
                    <Input
                      type="number"
                      min={10}
                      max={60}
                      value={ringTimeout}
                      onChange={(e) => setRingTimeout(parseInt(e.target.value) || 20)}
                      className="mt-1 w-32"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Business Hours */}
            <section className="card p-4">
              <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-primary" />
                After Hours
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text">Business Hours Only</p>
                    <p className="text-sm text-text-muted">
                      Only forward calls during business hours
                    </p>
                  </div>
                  <Switch
                    checked={businessHoursOnly}
                    onCheckedChange={setBusinessHoursOnly}
                  />
                </div>

                {businessHoursOnly && (
                  <div>
                    <Label>After Hours Behavior</Label>
                    <div className="mt-2 space-y-2">
                      {FORWARDING_MODES.slice(0, 2).map((mode) => (
                        <button
                          key={mode.value}
                          onClick={() => setAfterHoursMode(mode.value)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors',
                            afterHoursMode === mode.value
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted/50'
                          )}
                        >
                          {afterHoursMode === mode.value ? (
                            <Check className="h-5 w-5 text-primary" />
                          ) : (
                            <div className="h-5 w-5" />
                          )}
                          <div className="text-left">
                            <p className="font-medium text-text">{mode.label}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
          </>
        )}
      </div>
    </div>
  );
}

function PhoneSettingsSkeleton() {
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
      </div>
    </div>
  );
}
