'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui';
import {
  Clock,
  Play,
  Square,
  Loader2,
  Car,
  Wrench,
  Timer,
} from 'lucide-react';
import { differenceInSeconds, format } from 'date-fns';

interface JobTimeEntry {
  id: string;
  job_id: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  is_travel: boolean;
  notes?: string;
}

interface JobTimerProps {
  jobId: string;
  jobTitle?: string;
  customerName?: string;
  onTimeLogged?: (entry: JobTimeEntry) => void;
  showHistory?: boolean;
}

export default function JobTimer({
  jobId,
  jobTitle,
  customerName,
  onTimeLogged,
  showHistory = true,
}: JobTimerProps) {
  const [loading, setLoading] = useState(true);
  const [activeTimer, setActiveTimer] = useState<JobTimeEntry | null>(null);
  const [entries, setEntries] = useState<JobTimeEntry[]>([]);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState({ hours: 0, minutes: 0, seconds: 0 });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/time`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setTotalMinutes(data.totalMinutes || 0);

        // Check for active timer
        const active = (data.entries || []).find((e: JobTimeEntry) => !e.end_time);
        setActiveTimer(active || null);
      }
    } catch (err) {
      console.error('Error fetching job time:', err);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update elapsed time every second when timer is active
  useEffect(() => {
    if (!activeTimer) {
      setElapsedTime({ hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const updateElapsed = () => {
      const start = new Date(activeTimer.start_time);
      const now = new Date();
      const totalSeconds = differenceInSeconds(now, start);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setElapsedTime({ hours, minutes, seconds });
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [activeTimer]);

  async function handleStart(isTravel: boolean = false) {
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/jobs/${jobId}/time/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_travel: isTravel }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start timer');
      }

      const data = await res.json();
      setActiveTimer(data.jobTimeEntry);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStop(notes?: string) {
    if (!activeTimer) return;

    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/jobs/${jobId}/time/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to stop timer');
      }

      const data = await res.json();
      onTimeLogged?.(data.jobTimeEntry);
      setActiveTimer(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  function formatElapsed(): string {
    const { hours, minutes, seconds } = elapsedTime;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-4 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Timer className="h-4 w-4" />
          Job Time
          {totalMinutes > 0 && (
            <span className="ml-auto text-sm font-normal text-text-muted">
              Total: {formatDuration(totalMinutes)}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activeTimer ? (
          // Active timer view
          <div className="text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${
              activeTimer.is_travel ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              {activeTimer.is_travel ? (
                <Car className="h-7 w-7 text-blue-600" />
              ) : (
                <Wrench className="h-7 w-7 text-green-600" />
              )}
            </div>
            <p className="text-xs text-text-muted mb-1">
              {activeTimer.is_travel ? 'Travel Time' : 'Work Time'}
            </p>
            <p className="text-2xl font-bold text-text font-mono mb-3">
              {formatElapsed()}
            </p>
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleStop()}
              disabled={actionLoading}
              className="w-full"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Square className="h-4 w-4 mr-2" />
              )}
              Stop Timer
            </Button>
          </div>
        ) : (
          // Start timer view
          <div className="space-y-2">
            {jobTitle && (
              <div className="text-center mb-3">
                <p className="text-sm font-medium text-text">{jobTitle}</p>
                {customerName && (
                  <p className="text-xs text-text-muted">{customerName}</p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                onClick={() => handleStart(false)}
                disabled={actionLoading}
                className="flex-1"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Wrench className="h-4 w-4 mr-1" />
                )}
                Work
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStart(true)}
                disabled={actionLoading}
                className="flex-1"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Car className="h-4 w-4 mr-1" />
                )}
                Travel
              </Button>
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-600 mt-2 text-center">{error}</p>
        )}

        {/* Time History */}
        {showHistory && entries.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-medium text-text-muted mb-2">Recent Time</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {entries.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between text-xs py-1"
                >
                  <div className="flex items-center gap-1.5">
                    {entry.is_travel ? (
                      <Car className="h-3 w-3 text-blue-500" />
                    ) : (
                      <Wrench className="h-3 w-3 text-green-500" />
                    )}
                    <span className="text-text-muted">
                      {format(new Date(entry.start_time), 'MMM d, h:mm a')}
                    </span>
                  </div>
                  <span className="font-medium">
                    {entry.end_time ? formatDuration(entry.duration_minutes || 0) : (
                      <span className="text-green-600">Active</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
