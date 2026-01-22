'use client';

import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle,
  Loader2,
} from 'lucide-react';

interface TimeSlot {
  time: string;
  label: string;
  available: boolean;
}

interface DayAvailability {
  date: string;
  dayName: string;
  dayNumber: number;
  month: string;
  slots: TimeSlot[];
  isToday: boolean;
  isPast: boolean;
}

interface AvailabilityPickerProps {
  businessId: string;
  selectedDate?: string;
  selectedTime?: string;
  onSelect: (date: string, time: string) => void;
  className?: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function AvailabilityPicker({
  businessId,
  selectedDate,
  selectedTime,
  onSelect,
  className,
}: AvailabilityPickerProps) {
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [businessHours, setBusinessHours] = useState<{ start: string; end: string } | null>(null);

  // Calculate the start of the week being displayed
  const weekStart = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + weekOffset * 7);
    // If we're on week 0, start from today, otherwise start from Monday
    if (weekOffset === 0) {
      return date;
    }
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date;
  }, [weekOffset]);

  // Load availability data
  useEffect(() => {
    async function loadAvailability() {
      setLoading(true);
      try {
        const startDate = new Date(weekStart);
        const endDate = new Date(weekStart);
        endDate.setDate(endDate.getDate() + 7);

        const response = await fetch(
          `/api/portal/availability?businessId=${businessId}&start=${startDate.toISOString()}&end=${endDate.toISOString()}`
        );

        if (response.ok) {
          const data = await response.json();
          setAvailability(data.availability || []);
          setBusinessHours(data.businessHours || null);
        } else {
          // Generate mock availability if API not ready
          setAvailability(generateMockAvailability(weekStart));
        }
      } catch (error) {
        // Generate mock availability on error
        setAvailability(generateMockAvailability(weekStart));
      } finally {
        setLoading(false);
      }
    }

    loadAvailability();
  }, [businessId, weekStart]);

  // Select first available day when data loads
  useEffect(() => {
    if (availability.length > 0 && !selectedDate) {
      const firstAvailable = availability.findIndex(
        (day) => !day.isPast && day.slots.some((s) => s.available)
      );
      if (firstAvailable >= 0) {
        setActiveDayIndex(firstAvailable);
      }
    }
  }, [availability, selectedDate]);

  const activeDay = availability[activeDayIndex];
  const canGoBack = weekOffset > 0;
  const canGoForward = weekOffset < 4; // Allow up to 5 weeks ahead

  const handleDaySelect = (index: number) => {
    setActiveDayIndex(index);
  };

  const handleTimeSelect = (time: string) => {
    if (activeDay) {
      onSelect(activeDay.date, time);
    }
  };

  if (loading) {
    return <AvailabilityPickerSkeleton />;
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekOffset((prev) => prev - 1)}
          disabled={!canGoBack}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">
          {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : `In ${weekOffset} weeks`}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekOffset((prev) => prev + 1)}
          disabled={!canGoForward}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day Selector */}
      <div className="grid grid-cols-7 gap-1">
        {availability.map((day, index) => {
          const hasSlots = day.slots.some((s) => s.available);
          const isSelected = index === activeDayIndex;
          const isDisabled = day.isPast || !hasSlots;

          return (
            <button
              key={day.date}
              onClick={() => !isDisabled && handleDaySelect(index)}
              disabled={isDisabled}
              className={cn(
                'flex flex-col items-center p-2 rounded-lg transition-colors',
                isSelected && 'bg-primary text-primary-foreground',
                !isSelected && !isDisabled && 'hover:bg-muted',
                isDisabled && 'opacity-40 cursor-not-allowed',
                day.isToday && !isSelected && 'ring-1 ring-primary'
              )}
            >
              <span className="text-xs">{day.dayName}</span>
              <span className="text-lg font-semibold">{day.dayNumber}</span>
              {hasSlots && !isDisabled && (
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full mt-1',
                    isSelected ? 'bg-primary-foreground' : 'bg-green-500'
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Time Slots */}
      {activeDay && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>
              {activeDay.dayName}, {activeDay.month} {activeDay.dayNumber}
            </span>
          </div>

          {activeDay.slots.filter((s) => s.available).length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              No available times on this day
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {activeDay.slots
                .filter((slot) => slot.available)
                .map((slot) => {
                  const isTimeSelected =
                    selectedDate === activeDay.date && selectedTime === slot.time;

                  return (
                    <button
                      key={slot.time}
                      onClick={() => handleTimeSelect(slot.time)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors',
                        isTimeSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:border-primary hover:bg-primary/5'
                      )}
                    >
                      {isTimeSelected ? (
                        <CheckCircle className="h-3.5 w-3.5" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {slot.label}
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Selected Summary */}
      {selectedDate && selectedTime && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <div className="text-sm">
            <p className="font-medium text-green-800">Selected Appointment</p>
            <p className="text-green-600">
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}{' '}
              at {selectedTime}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function generateMockAvailability(weekStart: Date): DayAvailability[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: DayAvailability[] = [];
  const currentDate = new Date(weekStart);

  for (let i = 0; i < 7; i++) {
    const date = new Date(currentDate);
    date.setDate(date.getDate() + i);

    const isPast = date < today;
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    // Generate time slots
    const slots: TimeSlot[] = [];
    if (!isWeekend) {
      const times = ['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];
      times.forEach((time) => {
        // Randomly make some slots unavailable
        const available = !isPast && Math.random() > 0.3;
        slots.push({ time, label: time, available });
      });
    }

    days.push({
      date: date.toISOString().split('T')[0],
      dayName: DAY_NAMES[date.getDay()],
      dayNumber: date.getDate(),
      month: MONTH_NAMES[date.getMonth()],
      slots,
      isToday,
      isPast,
    });
  }

  return days;
}

function AvailabilityPickerSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-8" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    </div>
  );
}

export default AvailabilityPicker;
