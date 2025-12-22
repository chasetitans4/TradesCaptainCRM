'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Card,
  CardContent,
} from '@/components/ui';
import {
  Clock,
  Play,
  Square,
  Loader2,
  Coffee,
  MapPin,
  Briefcase,
} from 'lucide-react';
import { differenceInMinutes, differenceInSeconds, format } from 'date-fns';

interface ClockStatus {
  isClockedIn: boolean;
  currentEntry?: {
    id: string;
    clock_in_time: string;
    job?: { id: string; service_type: string };
  };
  activeBreak?: {
    id: string;
    start_time: string;
    break_type: string;
  } | null;
  activeJobTimer?: {
    id: string;
    job_id: string;
    start_time: string;
    job?: { service_type: string; customer?: { name: string } };
  } | null;
  todayHours: number;
  weekHours: number;
}

interface ClockWidgetProps {
  compact?: boolean;
  showLocation?: boolean;
  onStatusChange?: (status: ClockStatus) => void;
}

export default function ClockWidget({
  compact = false,
  showLocation = true,
  onStatusChange,
}: ClockWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ClockStatus | null>(null);
  const [clocking, setClocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/timesheets/current');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        onStatusChange?.(data);
      }
    } catch (err) {
      console.error('Error fetching clock status:', err);
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    fetchStatus();
    // Refresh status every minute
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Update elapsed time every second when clocked in
  useEffect(() => {
    if (!status?.isClockedIn || !status.currentEntry) return;

    const updateElapsed = () => {
      const start = new Date(status.currentEntry!.clock_in_time);
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
  }, [status?.isClockedIn, status?.currentEntry]);

  // Get current location if enabled
  useEffect(() => {
    if (showLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.log('Location not available:', err.message);
        }
      );
    }
  }, [showLocation]);

  async function handleClockIn() {
    setClocking(true);
    setError(null);

    try {
      const res = await fetch('/api/timesheets/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to clock in');
      }

      fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setClocking(false);
    }
  }

  async function handleClockOut() {
    setClocking(true);
    setError(null);

    try {
      const res = await fetch('/api/timesheets/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to clock out');
      }

      fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setClocking(false);
    }
  }

  async function handleBreakStart(breakType: 'paid' | 'unpaid' | 'lunch' = 'unpaid') {
    setClocking(true);
    setError(null);

    try {
      const res = await fetch('/api/timesheets/break/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ break_type: breakType }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start break');
      }

      fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setClocking(false);
    }
  }

  async function handleBreakEnd() {
    setClocking(true);
    setError(null);

    try {
      const res = await fetch('/api/timesheets/break/end', {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to end break');
      }

      fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setClocking(false);
    }
  }

  function formatElapsed(): string {
    const { hours, minutes, seconds } = elapsedTime;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function formatHours(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
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

  // Compact version for sidebars/headers
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {status?.isClockedIn ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm font-mono font-medium">{formatElapsed()}</span>
            </div>
            {status.activeBreak ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleBreakEnd}
                disabled={clocking}
              >
                <Coffee className="h-3 w-3 mr-1" />
                End Break
              </Button>
            ) : (
              <Button
                size="sm"
                variant="danger"
                onClick={handleClockOut}
                disabled={clocking}
              >
                <Square className="h-3 w-3 mr-1" />
                Out
              </Button>
            )}
          </>
        ) : (
          <Button
            size="sm"
            onClick={handleClockIn}
            disabled={clocking}
          >
            {clocking ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Play className="h-3 w-3 mr-1" />
            )}
            Clock In
          </Button>
        )}
      </div>
    );
  }

  // Full version
  return (
    <Card className={status?.isClockedIn ? 'border-green-500/50' : ''}>
      <CardContent className="py-6">
        <div className="text-center">
          {status?.isClockedIn ? (
            <>
              {status.activeBreak ? (
                // On break view
                <>
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Coffee className="h-8 w-8 text-amber-600" />
                  </div>
                  <p className="text-sm text-amber-600 font-medium mb-1">On Break</p>
                  <p className="text-xs text-text-muted mb-3">
                    Started {format(new Date(status.activeBreak.start_time), 'h:mm a')}
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleBreakEnd}
                    disabled={clocking}
                    className="w-full max-w-xs"
                  >
                    {clocking ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    End Break
                  </Button>
                </>
              ) : (
                // Clocked in view
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-sm text-text-muted mb-1">Clocked In</p>
                  <p className="text-3xl font-bold text-text font-mono mb-1">
                    {formatElapsed()}
                  </p>
                  <p className="text-xs text-text-muted mb-4">
                    Since {format(new Date(status.currentEntry!.clock_in_time), 'h:mm a')}
                  </p>

                  {status.activeJobTimer && (
                    <div className="mb-4 p-2 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-center gap-1 text-blue-700">
                        <Briefcase className="h-3 w-3" />
                        <span className="text-xs font-medium">
                          Working on: {status.activeJobTimer.job?.service_type}
                        </span>
                      </div>
                      {status.activeJobTimer.job?.customer?.name && (
                        <p className="text-xs text-blue-600 mt-0.5">
                          {status.activeJobTimer.job.customer.name}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Button
                      variant="danger"
                      onClick={handleClockOut}
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
                    <Button
                      variant="outline"
                      onClick={() => handleBreakStart('lunch')}
                      disabled={clocking}
                      className="w-full max-w-xs"
                    >
                      <Coffee className="h-4 w-4 mr-2" />
                      Start Break
                    </Button>
                  </div>
                </>
              )}

              {/* Today/Week stats */}
              <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-text-muted">Today</p>
                  <p className="text-lg font-semibold">{formatHours(status.todayHours || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">This Week</p>
                  <p className="text-lg font-semibold">{formatHours(status.weekHours || 0)}</p>
                </div>
              </div>
            </>
          ) : (
            // Not clocked in view
            <>
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <Clock className="h-8 w-8 text-text-muted" />
              </div>
              <p className="text-sm text-text-muted mb-4">Not clocked in</p>
              <Button
                onClick={handleClockIn}
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

              {showLocation && location && (
                <p className="text-xs text-text-muted mt-3 flex items-center justify-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Location will be recorded
                </p>
              )}
            </>
          )}

          {error && (
            <p className="text-xs text-red-600 mt-3">{error}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
