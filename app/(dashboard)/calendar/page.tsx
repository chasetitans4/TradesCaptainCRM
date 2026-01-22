'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { UserWithBusiness, CalendarDisplayEvent } from '@/types';
import { AddressLink } from '@/components/ui/address-link';
import { ScheduleCalendar, CalendarJob, CrewMember } from '@/components/calendar/schedule-calendar';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  MapPin,
  Phone,
  RefreshCw,
  Settings,
  LayoutGrid,
  List,
  Users,
} from 'lucide-react';
import { showError, showSuccess } from '@/lib/toast';

type ViewMode = 'day' | 'week' | 'month';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function CalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<CalendarDisplayEvent[]>([]);
  const [technicians, setTechnicians] = useState<CrewMember[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Load user
  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile) {
        router.push('/login');
        return;
      }
      setUser(profile as UserWithBusiness);
      setLoading(false);
    }
    loadUser();
  }, [router]);

  // Load technicians
  const loadTechnicians = useCallback(async () => {
    try {
      const response = await fetch('/api/dispatch/technicians');
      if (response.ok) {
        const data = await response.json();
        setTechnicians(data.technicians || []);
      }
    } catch (error) {
      console.error('Error loading technicians:', error);
    }
  }, []);

  // Load events for current date range
  const loadEvents = useCallback(async () => {
    if (!user) return;

    setRefreshing(true);

    // Calculate date range - always load at least a week for the schedule view
    let start: Date;
    let end: Date;

    if (viewMode === 'month') {
      start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    } else if (viewMode === 'week') {
      // For week view, load the entire week (Monday to Sunday)
      const dayOfWeek = currentDate.getDay();
      start = new Date(currentDate);
      start.setDate(start.getDate() - ((dayOfWeek + 6) % 7)); // Start from Monday
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else {
      // For day view, load current day plus a buffer
      start = new Date(currentDate);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end = new Date(currentDate);
      end.setDate(end.getDate() + 14);
      end.setHours(23, 59, 59, 999);
    }

    try {
      const response = await fetch(
        `/api/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}`
      );
      if (!response.ok) {
        throw new Error('Failed to load calendar events');
      }
      const data = await response.json();
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user, viewMode, currentDate]);

  useEffect(() => {
    if (user) {
      loadEvents();
      loadTechnicians();
    }
  }, [user, loadEvents, loadTechnicians]);

  // Convert CalendarDisplayEvent to CalendarJob for the new component
  const calendarJobs = useMemo((): CalendarJob[] => {
    return events
      .filter((event) => event.type === 'job')
      .map((event) => ({
        id: event.id,
        title: event.title,
        customerId: event.customer_id || event.customer?.id,
        customerName: event.customer?.name,
        customerPhone: event.customer?.phone,
        startTime: new Date(event.start),
        endTime: new Date(event.end),
        jobType: event.job_type || 'service',
        status: event.status || 'scheduled',
        priority: event.priority,
        address: event.address || undefined,
        city: event.city || undefined,
        technicianId: event.assigned_to || undefined,
        technicianName: event.technician_name || undefined,
        jobNumber: event.job_number || undefined,
        job_id: event.job_id,
      }));
  }, [events]);

  // Group events by date for month view
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarDisplayEvent[]> = {};
    events.forEach((event) => {
      const dateKey = new Date(event.start).toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );
    });
    return grouped;
  }, [events]);

  // Navigation for month view
  function navigateMonth(direction: 'prev' | 'next') {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  }

  function goToToday() {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  }

  // Handle job actions
  const handleMarkComplete = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (!response.ok) {
        throw new Error('Failed to mark job as complete');
      }
      showSuccess('Job marked as complete');
      loadEvents();
    } catch (error) {
      console.error('Error marking job complete:', error);
      showError('Failed to mark job as complete');
    }
  }, [loadEvents]);

  const handleStartJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'in_progress' }),
      });
      if (!response.ok) {
        throw new Error('Failed to start job');
      }
      showSuccess('Job started');
      loadEvents();
    } catch (error) {
      console.error('Error starting job:', error);
      showError('Failed to start job');
    }
  }, [loadEvents]);

  const handleReschedule = useCallback((job: CalendarJob) => {
    router.push(`/jobs/${job.job_id || job.id}/reschedule`);
  }, [router]);

  if (loading || !user) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-text">Schedule</h1>
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex bg-muted rounded-lg p-1">
                <button
                  onClick={() => setViewMode('day')}
                  className={cn(
                    'px-2 py-1.5 text-xs font-medium rounded transition-colors',
                    viewMode === 'day' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                  )}
                  title="Day View"
                >
                  Day
                </button>
                <button
                  onClick={() => setViewMode('week')}
                  className={cn(
                    'px-2 py-1.5 text-xs font-medium rounded transition-colors',
                    viewMode === 'week' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                  )}
                  title="Week View"
                >
                  Week
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  className={cn(
                    'px-2 py-1.5 text-xs font-medium rounded transition-colors',
                    viewMode === 'month' ? 'bg-background shadow-sm' : 'text-muted-foreground'
                  )}
                  title="Month View"
                >
                  Month
                </button>
              </div>
              <Link href="/calendar/team">
                <Button variant="ghost" size="icon-sm" title="Team Calendar">
                  <Users className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/settings/calendar">
                <Button variant="ghost" size="icon-sm">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {viewMode === 'day' ? (
        <ScheduleCalendar
          jobs={calendarJobs}
          technicians={technicians}
          initialDate={currentDate}
          initialViewMode="day"
          onDateChange={setCurrentDate}
          onRefresh={loadEvents}
          onNewJob={() => router.push('/jobs/new')}
          onMarkComplete={handleMarkComplete}
          onStartJob={handleStartJob}
          onReschedule={handleReschedule}
          loading={refreshing}
          className="flex-1"
        />
      ) : viewMode === 'week' ? (
        <ScheduleCalendar
          jobs={calendarJobs}
          technicians={technicians}
          initialDate={currentDate}
          initialViewMode="week"
          onDateChange={setCurrentDate}
          onRefresh={loadEvents}
          onNewJob={() => router.push('/jobs/new')}
          onMarkComplete={handleMarkComplete}
          onStartJob={handleStartJob}
          onReschedule={handleReschedule}
          loading={refreshing}
          className="flex-1"
        />
      ) : (
        <div className="flex-1 overflow-auto">
          {/* Month View Header */}
          <div className="sticky top-0 bg-background border-b border-border px-4 py-3 z-10">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth('prev')}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <span className="font-semibold text-lg">
                {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateMonth('next')}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex justify-center mt-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>
          </div>

          {/* Month Grid */}
          <div className="p-4">
            <MonthView
              currentDate={currentDate}
              eventsByDate={eventsByDate}
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setCurrentDate(date);
                setViewMode('day');
              }}
            />
          </div>
        </div>
      )}

      {/* FAB for new job */}
      {viewMode === 'month' && (
        <Link href="/jobs/new" className="fab">
          <Plus className="h-6 w-6" />
        </Link>
      )}
    </div>
  );
}

// Month View Component
function MonthView({
  currentDate,
  eventsByDate,
  selectedDate,
  onSelectDate,
}: {
  currentDate: Date;
  eventsByDate: Record<string, CalendarDisplayEvent[]>;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: Date[] = [];
    const current = new Date(startDate);
    while (days.length < 42) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }, [currentDate]);

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_NAMES.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          const dateKey = date.toISOString().split('T')[0];
          const dayEvents = eventsByDate[dateKey] || [];
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isToday = date.toDateString() === new Date().toDateString();
          const isSelected =
            date.getFullYear() === selectedDate.getFullYear() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getDate() === selectedDate.getDate();

          return (
            <button
              key={index}
              onClick={() => onSelectDate(date)}
              className={cn(
                'aspect-square p-1 rounded-lg flex flex-col items-center justify-start transition-colors min-h-[56px]',
                !isCurrentMonth && 'opacity-40',
                isSelected && 'bg-primary text-primary-foreground',
                isToday && !isSelected && 'bg-primary/10',
                !isSelected && 'hover:bg-muted'
              )}
            >
              <span className="text-sm font-medium">{date.getDate()}</span>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                  {dayEvents.slice(0, 3).map((event, i) => (
                    <div
                      key={i}
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        event.type === 'job' && (isSelected ? 'bg-primary-foreground' : 'bg-primary'),
                        event.type === 'personal' && 'bg-gray-400',
                        event.type === 'break' && 'bg-amber-500'
                      )}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className={cn(
                      'text-[8px]',
                      isSelected ? 'text-primary-foreground' : 'text-muted-foreground'
                    )}>
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Calendar Skeleton
function CalendarSkeleton() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="shrink-0 bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="h-7 w-24 skeleton rounded" />
            <div className="flex gap-2">
              <div className="h-8 w-16 skeleton rounded-lg" />
              <div className="h-8 w-8 skeleton rounded-lg" />
            </div>
          </div>
        </div>
      </header>
      <div className="flex-1 p-4 space-y-3">
        <div className="h-12 skeleton rounded-lg" />
        <div className="h-12 skeleton rounded-lg" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 skeleton rounded-lg" />
        ))}
      </div>
    </div>
  );
}
