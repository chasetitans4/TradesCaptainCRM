'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
} from '@/components/ui';
import {
  Clock,
  Play,
  Square,
  Loader2,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Briefcase,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, differenceInMinutes } from 'date-fns';

interface ClockStatus {
  isClockedIn: boolean;
  currentEntry?: {
    id: string;
    clock_in: string;
    job?: { id: string; title: string };
  };
  todayHours: number;
  weekHours: number;
}

interface TimeEntry {
  id: string;
  user_id: string;
  clock_in: string;
  clock_out?: string;
  break_minutes: number;
  notes?: string;
  status: string;
  user?: { id: string; name: string; avatar_url?: string };
  job?: { id: string; title: string; customer_name?: string };
}

interface DailySummary {
  date: string;
  entries: TimeEntry[];
  totalMinutes: number;
}

export default function TimesheetsPage() {
  const [loading, setLoading] = useState(true);
  const [clockStatus, setClockStatus] = useState<ClockStatus | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [clocking, setClocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, entriesRes] = await Promise.all([
        fetch('/api/timesheets/clock'),
        fetch(
          `/api/timesheets?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`
        ),
      ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setClockStatus(statusData);
      }

      if (entriesRes.ok) {
        const entriesData = await entriesRes.json();
        setEntries(entriesData.entries || []);
      }
    } catch (err) {
      console.error('Error fetching timesheets:', err);
      setError('Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update elapsed time every second when clocked in
  useEffect(() => {
    if (!clockStatus?.isClockedIn || !clockStatus.currentEntry) return;

    const updateElapsed = () => {
      const start = new Date(clockStatus.currentEntry!.clock_in);
      const now = new Date();
      setElapsedTime(differenceInMinutes(now, start));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [clockStatus?.isClockedIn, clockStatus?.currentEntry]);

  async function handleClockAction(action: 'clock_in' | 'clock_out') {
    setClocking(true);
    setError(null);

    try {
      const res = await fetch('/api/timesheets/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to clock in/out');
      }

      const data = await res.json();
      setClockStatus(data.status);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setClocking(false);
    }
  }

  function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  function formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  // Group entries by day
  const dailySummaries: DailySummary[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    const dayStr = format(day, 'yyyy-MM-dd');

    const dayEntries = entries.filter(
      (e) => format(new Date(e.clock_in), 'yyyy-MM-dd') === dayStr
    );

    const totalMinutes = dayEntries.reduce((sum, e) => {
      if (!e.clock_out) return sum;
      const mins = differenceInMinutes(new Date(e.clock_out), new Date(e.clock_in));
      return sum + Math.max(0, mins - (e.break_minutes || 0));
    }, 0);

    dailySummaries.push({
      date: dayStr,
      entries: dayEntries,
      totalMinutes,
    });
  }

  const weekTotal = dailySummaries.reduce((sum, d) => sum + d.totalMinutes, 0);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold text-text">Timesheets</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {error && (
          <Alert variant="danger">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Clock In/Out Card */}
        <Card className={clockStatus?.isClockedIn ? 'border-success' : ''}>
          <CardContent className="py-6">
            <div className="text-center">
              {clockStatus?.isClockedIn ? (
                <>
                  <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-10 w-10 text-success" />
                  </div>
                  <p className="text-sm text-text-muted mb-1">Currently clocked in</p>
                  <p className="text-3xl font-bold text-text mb-4">
                    {formatDuration(elapsedTime)}
                  </p>
                  {clockStatus.currentEntry?.job && (
                    <p className="text-sm text-text-muted mb-4">
                      <Briefcase className="h-3 w-3 inline mr-1" />
                      {clockStatus.currentEntry.job.title}
                    </p>
                  )}
                  <Button
                    variant="danger"
                    onClick={() => handleClockAction('clock_out')}
                    disabled={clocking}
                    className="w-full max-w-xs"
                  >
                    {clocking ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Square className="h-4 w-4 mr-2" />
                    )}
                    Clock Out
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-10 w-10 text-text-muted" />
                  </div>
                  <p className="text-sm text-text-muted mb-4">You&apos;re not clocked in</p>
                  <Button
                    onClick={() => handleClockAction('clock_in')}
                    disabled={clocking}
                    className="w-full max-w-xs"
                  >
                    {clocking ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Clock In
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today/Week Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-text-muted mb-1">Today</p>
              <p className="text-xl font-bold text-text">
                {formatHours(clockStatus?.todayHours || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4">
              <p className="text-xs text-text-muted mb-1">This Week</p>
              <p className="text-xl font-bold text-text">
                {formatHours(clockStatus?.weekHours || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-medium text-text">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </p>
            <p className="text-xs text-text-muted">{formatDuration(weekTotal)} total</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            disabled={weekStart >= startOfWeek(new Date(), { weekStartsOn: 0 })}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekly Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {dailySummaries.map((day) => {
              const date = new Date(day.date);
              const isToday = format(new Date(), 'yyyy-MM-dd') === day.date;

              return (
                <div
                  key={day.date}
                  className={`px-4 py-3 border-b border-border last:border-0 ${
                    isToday ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-medium text-sm ${isToday ? 'text-primary' : 'text-text'}`}>
                        {format(date, 'EEEE')}
                        {isToday && (
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            Today
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-text-muted">{format(date, 'MMM d')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-text">
                        {day.totalMinutes > 0 ? formatDuration(day.totalMinutes) : '-'}
                      </p>
                      {day.entries.length > 0 && (
                        <p className="text-xs text-text-muted">
                          {day.entries.length} {day.entries.length === 1 ? 'entry' : 'entries'}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Show entries for the day */}
                  {day.entries.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {day.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between text-xs bg-muted/50 px-2 py-1 rounded"
                        >
                          <span className="text-text-muted">
                            {format(new Date(entry.clock_in), 'h:mm a')}
                            {entry.clock_out && (
                              <> - {format(new Date(entry.clock_out), 'h:mm a')}</>
                            )}
                            {!entry.clock_out && (
                              <span className="text-success ml-1">(active)</span>
                            )}
                          </span>
                          {entry.job && (
                            <span className="text-text truncate max-w-[150px]">
                              {entry.job.title}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
