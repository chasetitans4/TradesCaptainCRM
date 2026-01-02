'use client';

import { useState, useEffect } from 'react';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, User, AlertTriangle, CheckCircle } from 'lucide-react';
import type { AvailableTimeSlot } from '@/types/outreach';

interface CallSchedulerProps {
  contactId: string;
  contactTimezone?: string;
  onSchedule: (scheduledAt: Date, agentId?: string) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function CallScheduler({
  contactId,
  contactTimezone,
  onSchedule,
  onCancel,
  isLoading,
}: CallSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<AvailableTimeSlot | null>(null);
  const [slots, setSlots] = useState<AvailableTimeSlot[]>([]);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [overflowReason, setOverflowReason] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  // Fetch available slots
  useEffect(() => {
    async function fetchSlots() {
      setLoadingSlots(true);
      try {
        const params = new URLSearchParams();
        if (contactTimezone) {
          params.set('timezone', contactTimezone);
        }

        const response = await fetch(`/api/outreach/availability?${params}`);
        const data = await response.json();

        setSlots(data.available_slots || []);
        setHasOverflow(data.has_overflow || false);
        setOverflowReason(data.overflow_reason || null);

        // Auto-select first available date
        if (data.available_slots?.length > 0) {
          const firstSlotDate = parseISO(data.available_slots[0].start);
          setSelectedDate(firstSlotDate);
        }
      } catch (error) {
        console.error('Error fetching slots:', error);
      } finally {
        setLoadingSlots(false);
      }
    }

    fetchSlots();
  }, [contactTimezone]);

  // Get unique dates from slots
  const availableDates = slots.reduce((dates, slot) => {
    const slotDate = parseISO(slot.start);
    if (!dates.some((d) => isSameDay(d, slotDate))) {
      dates.push(slotDate);
    }
    return dates;
  }, [] as Date[]);

  // Get slots for selected date
  const slotsForDate = selectedDate
    ? slots.filter((slot) => isSameDay(parseISO(slot.start), selectedDate))
    : [];

  // Group slots by agent
  const slotsByAgent = slotsForDate.reduce((groups, slot) => {
    const agentName = slot.agent_name || 'Available';
    if (!groups[agentName]) {
      groups[agentName] = [];
    }
    groups[agentName].push(slot);
    return groups;
  }, {} as Record<string, AvailableTimeSlot[]>);

  const handleSchedule = async () => {
    if (!selectedSlot) return;

    setScheduling(true);
    try {
      await onSchedule(new Date(selectedSlot.start), selectedSlot.agent_id);
    } finally {
      setScheduling(false);
    }
  };

  if (loadingSlots) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasOverflow) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
            <h3 className="text-lg font-semibold">No Available Slots</h3>
            <p className="text-muted-foreground">
              {overflowReason === 'no_availability_3day'
                ? 'There are no available time slots within the next 3 business days.'
                : 'All agents are currently at capacity.'}
            </p>
            <p className="text-sm text-muted-foreground">
              This request will be sent to an admin for manual scheduling.
            </p>
            <div className="flex gap-2 justify-center">
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button onClick={() => onSchedule(new Date(), undefined)}>
                Request Admin Review
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                setSelectedDate(date);
                setSelectedSlot(null);
              }}
              disabled={(date) =>
                !availableDates.some((d) => isSameDay(d, date))
              }
              modifiers={{
                available: availableDates,
              }}
              modifiersStyles={{
                available: { fontWeight: 'bold' },
              }}
            />
          </CardContent>
        </Card>

        {/* Time Slots */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedDate
                ? `Available Times - ${format(selectedDate, 'EEEE, MMMM d')}`
                : 'Select a Date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedDate ? (
              <p className="text-muted-foreground text-center py-8">
                Please select a date to see available times
              </p>
            ) : slotsForDate.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No available times for this date
              </p>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {Object.entries(slotsByAgent).map(([agentName, agentSlots]) => (
                  <div key={agentName} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{agentName}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {agentSlots.map((slot) => {
                        const time = format(parseISO(slot.start), 'h:mm a');
                        const isSelected = selectedSlot?.start === slot.start;

                        return (
                          <Button
                            key={`${slot.start}-${slot.agent_id}`}
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            className="justify-start"
                            onClick={() => setSelectedSlot(slot)}
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            {time}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Selected Slot Summary */}
      {selectedSlot && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium">
                    {format(parseISO(selectedSlot.start), 'EEEE, MMMM d, yyyy')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(parseISO(selectedSlot.start), 'h:mm a')} -{' '}
                    {format(parseISO(selectedSlot.end), 'h:mm a')}
                    {selectedSlot.agent_name && ` with ${selectedSlot.agent_name}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {onCancel && (
                  <Button variant="outline" onClick={onCancel} disabled={scheduling}>
                    Cancel
                  </Button>
                )}
                <Button onClick={handleSchedule} disabled={scheduling}>
                  {scheduling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Scheduling...
                    </>
                  ) : (
                    'Schedule Call'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
