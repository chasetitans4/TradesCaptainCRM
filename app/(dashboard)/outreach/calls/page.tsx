'use client';

import { useEffect, useState } from 'react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Phone,
  Video,
  Clock,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import type { ScheduledCallWithContact } from '@/types/outreach';

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-green-500',
  no_show: 'bg-red-500',
  cancelled: 'bg-gray-400',
  pending_admin_approval: 'bg-orange-500',
};

const statusLabels: Record<string, string> = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  no_show: 'No Show',
  cancelled: 'Cancelled',
  pending_admin_approval: 'Pending Approval',
};

export default function OutreachCallsPage() {
  const [calls, setCalls] = useState<ScheduledCallWithContact[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const fetchCalls = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/api/outreach/calls?${params}`);
      const data = await response.json();
      setCalls(data.data || []);
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [statusFilter]);

  const getCallsForDate = (date: Date) => {
    return calls.filter((call) =>
      isSameDay(new Date(call.scheduled_at), date)
    );
  };

  const goToPreviousWeek = () => {
    setWeekStart((prev) => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setWeekStart((prev) => addDays(prev, 7));
  };

  const goToToday = () => {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    setSelectedDate(new Date());
  };

  const selectedDateCalls = getCallsForDate(selectedDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Scheduled Calls</h1>
          <p className="text-muted-foreground">
            Manage your outreach call schedule
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Week Navigation */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {format(weekStart, 'MMMM yyyy')}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextWeek}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dayCalls = getCallsForDate(day);
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'p-3 rounded-lg text-center transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : isToday
                      ? 'bg-primary/10'
                      : 'hover:bg-muted'
                  )}
                >
                  <p className="text-xs font-medium uppercase">
                    {format(day, 'EEE')}
                  </p>
                  <p className="text-2xl font-bold my-1">
                    {format(day, 'd')}
                  </p>
                  {dayCalls.length > 0 && (
                    <div className="flex justify-center gap-0.5">
                      {dayCalls.slice(0, 3).map((call) => (
                        <div
                          key={call.id}
                          className={cn(
                            'w-2 h-2 rounded-full',
                            statusColors[call.status]
                          )}
                        />
                      ))}
                      {dayCalls.length > 3 && (
                        <span className="text-xs">+{dayCalls.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Calls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            {selectedDateCalls.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedDateCalls.length} calls
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedDateCalls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No Calls Scheduled</p>
              <p className="text-sm">No calls are scheduled for this day.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateCalls
                .sort(
                  (a, b) =>
                    new Date(a.scheduled_at).getTime() -
                    new Date(b.scheduled_at).getTime()
                )
                .map((call) => {
                  const contact = call.contact;
                  const contactInitials = contact?.name
                    ? contact.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : '?';

                  return (
                    <div
                      key={call.id}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-lg border',
                        call.status === 'completed' && 'opacity-60'
                      )}
                    >
                      <div
                        className={cn(
                          'w-1 h-12 rounded-full',
                          statusColors[call.status]
                        )}
                      />

                      <div className="flex items-center gap-2 text-lg font-medium min-w-[80px]">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        {format(new Date(call.scheduled_at), 'h:mm a')}
                      </div>

                      <Avatar fallback={contactInitials} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {contact?.name || 'Unknown Contact'}
                          </p>
                          <Badge
                            variant="secondary"
                            className="text-xs"
                          >
                            {statusLabels[call.status]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {contact?.company_name && (
                            <span>{contact.company_name}</span>
                          )}
                          <span className="flex items-center gap-1">
                            {call.call_type === 'zoom' ? (
                              <Video className="w-3 h-3" />
                            ) : (
                              <Phone className="w-3 h-3" />
                            )}
                            {call.call_type === 'phone'
                              ? contact?.phone
                              : call.call_type}
                          </span>
                          <span>{call.duration_minutes} min</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {call.status === 'completed' && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                        {call.status === 'no_show' && (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        {call.status === 'pending_admin_approval' && (
                          <AlertTriangle className="w-5 h-5 text-orange-500" />
                        )}
                        {call.status === 'scheduled' && (
                          <Button size="sm">View</Button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
