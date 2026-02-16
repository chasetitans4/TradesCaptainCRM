'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Clock, Copy } from 'lucide-react';

interface BusinessHours {
  [day: string]: { start: string; end: string } | null;
}

interface BusinessHoursEditorProps {
  value: BusinessHours;
  onChange: (value: BusinessHours) => void;
  disabled?: boolean;
  className?: string;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

const DEFAULT_HOURS = { start: '09:00', end: '17:00' };

/**
 * Business Hours Editor Component
 * Allows configuration of business hours for each day of the week.
 * Used in voice settings for global and location-specific configurations.
 */
export function BusinessHoursEditor({
  value,
  onChange,
  disabled = false,
  className,
}: BusinessHoursEditorProps) {
  const [copySource, setCopySource] = useState<string | null>(null);

  const toggleDay = (day: string) => {
    const newValue = { ...value };
    if (newValue[day]) {
      newValue[day] = null;
    } else {
      newValue[day] = DEFAULT_HOURS;
    }
    onChange(newValue);
  };

  const updateTime = (day: string, field: 'start' | 'end', time: string) => {
    const newValue = { ...value };
    if (newValue[day]) {
      newValue[day] = { ...newValue[day]!, [field]: time };
      onChange(newValue);
    }
  };

  const copyToAll = (sourceDay: string) => {
    const sourceHours = value[sourceDay];
    if (!sourceHours) return;

    const newValue: BusinessHours = {};
    DAYS_OF_WEEK.forEach(({ key }) => {
      newValue[key] = { ...sourceHours };
    });
    onChange(newValue);
    setCopySource(sourceDay);
    setTimeout(() => setCopySource(null), 2000);
  };

  const setAllWeekdays = () => {
    const newValue: BusinessHours = {};
    DAYS_OF_WEEK.forEach(({ key }) => {
      if (['saturday', 'sunday'].includes(key)) {
        newValue[key] = null;
      } else {
        newValue[key] = DEFAULT_HOURS;
      }
    });
    onChange(newValue);
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-text flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Business Hours
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={setAllWeekdays}
          disabled={disabled}
        >
          Set Weekdays (9-5)
        </Button>
      </div>

      <div className="space-y-2">
        {DAYS_OF_WEEK.map(({ key, label, short }) => {
          const hours = value[key];
          const isOpen = hours !== null && hours !== undefined;

          return (
            <div
              key={key}
              className={cn(
                'flex items-center gap-3 p-2 rounded-lg transition-colors',
                isOpen ? 'bg-success/5' : 'bg-muted/30'
              )}
            >
              {/* Day toggle */}
              <div className="w-20 flex items-center gap-2">
                <Switch
                  checked={isOpen}
                  onCheckedChange={() => toggleDay(key)}
                  disabled={disabled}
                />
                <span className={cn('text-sm font-medium', !isOpen && 'text-text-muted')}>
                  {short}
                </span>
              </div>

              {/* Time inputs or closed label */}
              {isOpen ? (
                <>
                  <Input
                    type="time"
                    value={hours?.start || '09:00'}
                    onChange={(e) => updateTime(key, 'start', e.target.value)}
                    disabled={disabled}
                    className="w-28"
                  />
                  <span className="text-text-muted">to</span>
                  <Input
                    type="time"
                    value={hours?.end || '17:00'}
                    onChange={(e) => updateTime(key, 'end', e.target.value)}
                    disabled={disabled}
                    className="w-28"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToAll(key)}
                    disabled={disabled}
                    className="text-xs"
                    title="Copy to all days"
                  >
                    <Copy className="h-3 w-3" />
                    {copySource === key && <span className="ml-1 text-success">Copied!</span>}
                  </Button>
                </>
              ) : (
                <span className="text-sm text-text-muted italic">Closed</span>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-text-muted">
        Set the hours when your business is available. Outside these hours, calls will be handled
        as after-hours with appropriate greeting and escalation rules.
      </p>
    </div>
  );
}

/**
 * Compact Business Hours Display
 * Read-only display of business hours for overview cards
 */
interface CompactHoursDisplayProps {
  hours: BusinessHours;
  className?: string;
}

export function CompactHoursDisplay({ hours, className }: CompactHoursDisplayProps) {
  const openDays = DAYS_OF_WEEK.filter(({ key }) => hours[key]);

  if (openDays.length === 0) {
    return (
      <span className={cn('text-sm text-text-muted', className)}>
        No hours set (using global)
      </span>
    );
  }

  // Check if all days have the same hours
  const firstHours = hours[openDays[0].key];
  const allSame = openDays.every(
    ({ key }) =>
      hours[key]?.start === firstHours?.start && hours[key]?.end === firstHours?.end
  );

  if (allSame && openDays.length === 5 && !hours.saturday && !hours.sunday) {
    return (
      <span className={cn('text-sm', className)}>
        Mon-Fri: {firstHours?.start} - {firstHours?.end}
      </span>
    );
  }

  if (allSame && openDays.length === 7) {
    return (
      <span className={cn('text-sm', className)}>
        Every day: {firstHours?.start} - {firstHours?.end}
      </span>
    );
  }

  return (
    <span className={cn('text-sm', className)}>
      {openDays.length} days configured
    </span>
  );
}
