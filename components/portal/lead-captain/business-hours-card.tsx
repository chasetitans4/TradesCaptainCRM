'use client';

import { useState, useEffect } from 'react';
import { Clock, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PortalLeadCaptainConfig } from '@/types/portal/lead-captain';
import type { BusinessHours, DayOfWeek } from '@/types/leads-captain';

interface BusinessHoursCardProps {
  config: PortalLeadCaptainConfig;
  onSave: (updates: Partial<PortalLeadCaptainConfig>) => Promise<void>;
}

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

const TIMES = [
  '00:00', '00:30', '01:00', '01:30', '02:00', '02:30', '03:00', '03:30',
  '04:00', '04:30', '05:00', '05:30', '06:00', '06:30', '07:00', '07:30',
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30',
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (AZ)' },
  { value: 'America/Anchorage', label: 'Alaska (AK)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HI)' },
];

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export function BusinessHoursCard({ config, onSave }: BusinessHoursCardProps) {
  const [businessHours, setBusinessHours] = useState<BusinessHours>(config.business_hours);
  const [timezone, setTimezone] = useState(config.timezone);
  const [emergencyService, setEmergencyService] = useState(config.emergency_service);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    setHasChanges(
      JSON.stringify(businessHours) !== JSON.stringify(config.business_hours) ||
      timezone !== config.timezone ||
      emergencyService !== config.emergency_service
    );
  }, [businessHours, timezone, emergencyService, config]);

  function updateDayHours(
    day: DayOfWeek,
    field: 'enabled' | 'open' | 'close',
    value: boolean | string | null
  ) {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        business_hours: businessHours,
        timezone,
        emergency_service: emergencyService,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Business Hours
        </CardTitle>
        <CardDescription>
          Set when your business is open for AI to provide accurate availability info
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timezone */}
        <div className="space-y-2">
          <Label htmlFor="timezone">Time Zone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger id="timezone" className="w-full max-w-xs">
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

        {/* Hours Grid */}
        <div className="space-y-3">
          <Label>Operating Hours</Label>
          <div className="space-y-2">
            {DAYS.map(({ key, label }) => (
              <div
                key={key}
                className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0"
              >
                <div className="w-24 flex items-center gap-2">
                  <Switch
                    checked={businessHours[key].enabled}
                    onCheckedChange={(checked) => updateDayHours(key, 'enabled', checked)}
                  />
                  <span className="text-sm font-medium">{label}</span>
                </div>

                {businessHours[key].enabled ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Select
                      value={businessHours[key].open || '09:00'}
                      onValueChange={(value) => updateDayHours(key, 'open', value)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMES.map((time) => (
                          <SelectItem key={time} value={time}>
                            {formatTime(time)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-gray-500">to</span>
                    <Select
                      value={businessHours[key].close || '17:00'}
                      onValueChange={(value) => updateDayHours(key, 'close', value)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMES.map((time) => (
                          <SelectItem key={time} value={time}>
                            {formatTime(time)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">Closed</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Emergency Service */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="space-y-0.5">
            <Label htmlFor="emergency">24/7 Emergency Service</Label>
            <p className="text-sm text-gray-500">
              Indicate that you offer emergency service outside business hours
            </p>
          </div>
          <Switch
            id="emergency"
            checked={emergencyService}
            onCheckedChange={setEmergencyService}
          />
        </div>

        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </CardContent>
    </Card>
  );
}
