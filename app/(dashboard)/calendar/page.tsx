'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUserProfile } from '@/lib/supabase/client';
import { cn, formatTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { UserWithBusiness, CalendarDisplayEvent } from '@/types';
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
  User as UserIcon,
} from 'lucide-react';

type ViewMode = 'day' | 'week' | 'month';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const EVENT_COLORS: Record<string, string> = {
  job: 'bg-primary border-primary/50 text-white',
  personal: 'bg-gray-500 border-gray-400 text-white',
  break: 'bg-warning border-warning/50 text-white',
};

export default function CalendarPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<CalendarDisplayEvent[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
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

  // Load events for current date range
  const loadEvents = useCallback(async () => {
    if (!user) return;

    setRefreshing(true);

    // Calculate date range based on view mode
    let start: Date;
    let end: Date;

    if (viewMode === 'day') {
      start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);
    } else if (viewMode === 'week') {
      start = getStartOfWeek(currentDate);
      end = new Date(start);
      end.setDate(end.getDate() + 7);
    } else {
      start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    }

    try {
      const response = await fetch(
        `/api/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}`
      );
      const data = await response.json();
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user, viewMode, currentDate, selectedDate]);

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user, loadEvents]);

  // Navigation handlers
  function navigatePrev() {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() - 1);
      setSelectedDate(newDate);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  }

  function navigateNext() {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + 1);
      setSelectedDate(newDate);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  }

  function goToToday() {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  }

  // Get week dates
  const weekDates = useMemo(() => {
    const start = getStartOfWeek(currentDate);
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentDate]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarDisplayEvent[]> = {};
    events.forEach((event) => {
      const dateKey = new Date(event.start).toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    // Sort events within each day by start time
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );
    });
    return grouped;
  }, [events]);

  // Events for selected date (day view)
  const selectedDateEvents = useMemo(() => {
    const dateKey = selectedDate.toISOString().split('T')[0];
    return eventsByDate[dateKey] || [];
  }, [eventsByDate, selectedDate]);

  // Format header based on view mode
  const headerTitle = useMemo(() => {
    if (viewMode === 'day') {
      return formatDateLong(selectedDate);
    } else if (viewMode === 'week') {
      const start = weekDates[0];
      const end = weekDates[6];
      if (start.getMonth() === end.getMonth()) {
        return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
      } else {
        return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} - ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}`;
      }
    } else {
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
  }, [viewMode, currentDate, selectedDate, weekDates]);

  if (loading || !user) {
    return <CalendarSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky-header bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-text">Calendar</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={loadEvents}
                disabled={refreshing}
              >
                <RefreshCw className={cn('h-5 w-5', refreshing && 'animate-spin')} />
              </Button>
              <Link href="/settings/calendar">
                <Button variant="ghost" size="icon-sm">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center justify-between">
            <div className="flex bg-muted rounded-lg p-1">
              {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded transition-colors capitalize',
                    viewMode === mode ? 'bg-background shadow-sm font-medium' : 'text-text-muted'
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-3">
            <button onClick={navigatePrev} className="p-2">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="font-medium text-text">{headerTitle}</span>
            <button onClick={navigateNext} className="p-2">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Week View Header (for week view) */}
      {viewMode === 'week' && (
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <div className="grid grid-cols-7 gap-1">
            {weekDates.map((date) => {
              const dateKey = date.toISOString().split('T')[0];
              const dayEvents = eventsByDate[dateKey] || [];
              const isToday = isDateToday(date);
              const isSelected = isSameDate(date, selectedDate);

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    'flex flex-col items-center p-2 rounded-lg transition-colors',
                    isSelected && 'bg-primary text-white',
                    isToday && !isSelected && 'bg-primary/10',
                    !isSelected && 'hover:bg-muted'
                  )}
                >
                  <span className="text-xs uppercase">{DAY_NAMES[date.getDay()]}</span>
                  <span className="text-lg font-semibold">{date.getDate()}</span>
                  {dayEvents.length > 0 && (
                    <span
                      className={cn(
                        'text-xs px-1.5 rounded-full',
                        isSelected ? 'bg-white/20' : 'bg-primary/10 text-primary'
                      )}
                    >
                      {dayEvents.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="px-4 py-4">
        {viewMode === 'month' ? (
          <MonthView
            currentDate={currentDate}
            eventsByDate={eventsByDate}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setViewMode('day');
            }}
          />
        ) : (
          <DayEventsList
            date={selectedDate}
            events={selectedDateEvents}
            viewMode={viewMode}
          />
        )}
      </div>

      {/* FAB */}
      <Link href="/jobs/new" className="fab">
        <Plus className="h-6 w-6" />
      </Link>
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
    const lastDay = new Date(year, month + 1, 0);
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
          <div key={day} className="text-center text-xs font-medium text-text-muted py-2">
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
          const isToday = isDateToday(date);
          const isSelected = isSameDate(date, selectedDate);

          return (
            <button
              key={index}
              onClick={() => onSelectDate(date)}
              className={cn(
                'aspect-square p-1 rounded-lg flex flex-col items-center justify-start transition-colors',
                !isCurrentMonth && 'opacity-40',
                isSelected && 'bg-primary text-white',
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
                        event.type === 'job' && 'bg-primary',
                        event.type === 'personal' && 'bg-gray-400',
                        event.type === 'break' && 'bg-warning'
                      )}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Day Events List Component
function DayEventsList({
  date,
  events,
  viewMode,
}: {
  date: Date;
  events: CalendarDisplayEvent[];
  viewMode: ViewMode;
}) {
  if (events.length === 0) {
    return (
      <div className="card p-8 text-center">
        <Calendar className="h-12 w-12 text-text-muted mx-auto mb-3" />
        <h3 className="font-medium text-text mb-1">No events</h3>
        <p className="text-sm text-text-muted mb-4">
          {viewMode === 'day'
            ? formatDateLong(date)
            : `${FULL_DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`}
        </p>
        <Link href="/jobs/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Schedule Job
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-text">
        {viewMode === 'day'
          ? 'Today\'s Schedule'
          : `${FULL_DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`}
      </h2>

      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

// Event Card Component
function EventCard({ event }: { event: CalendarDisplayEvent }) {
  const startTime = new Date(event.start);
  const endTime = new Date(event.end);
  const isJob = event.type === 'job';

  const content = (
    <div
      className={cn(
        'card p-4 border-l-4',
        event.type === 'job' && 'border-l-primary',
        event.type === 'personal' && 'border-l-gray-400',
        event.type === 'break' && 'border-l-warning'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-text">{event.title}</h3>
          {event.customer && (
            <p className="text-sm text-text-muted">{event.customer.name}</p>
          )}
        </div>
        <Badge
          className={cn(
            'shrink-0',
            event.type === 'job' && 'bg-primary/10 text-primary',
            event.type === 'personal' && 'bg-gray-100 text-gray-600',
            event.type === 'break' && 'bg-warning/10 text-warning'
          )}
        >
          {event.type === 'job' ? 'Job' : event.type === 'personal' ? 'Personal' : 'Break'}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {formatTimeString(startTime)} - {formatTimeString(endTime)}
          </span>
        </div>
        {event.source === 'external' && (
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>External</span>
          </div>
        )}
      </div>

      {/* Quick actions for jobs */}
      {isJob && event.customer && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
          {event.customer.phone && (
            <a
              href={`tel:${event.customer.phone}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 text-sm text-primary"
            >
              <Phone className="h-4 w-4" />
              Call
            </a>
          )}
        </div>
      )}
    </div>
  );

  if (isJob && event.job_id) {
    return (
      <Link href={`/jobs/${event.job_id}`} className="block active:scale-[0.99] transition-transform">
        {content}
      </Link>
    );
  }

  return content;
}

// Calendar Skeleton
function CalendarSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky-header bg-background border-b border-border">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="h-7 w-24 skeleton rounded" />
            <div className="flex gap-2">
              <div className="h-10 w-10 skeleton rounded-lg" />
              <div className="h-10 w-10 skeleton rounded-lg" />
            </div>
          </div>
          <div className="h-10 skeleton rounded-lg" />
        </div>
      </header>
      <div className="px-4 py-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card p-4 h-24 skeleton" />
        ))}
      </div>
    </div>
  );
}

// Helper functions
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isDateToday(date: Date): boolean {
  const today = new Date();
  return isSameDate(date, today);
}

function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateLong(date: Date): string {
  return `${FULL_DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatTimeString(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
