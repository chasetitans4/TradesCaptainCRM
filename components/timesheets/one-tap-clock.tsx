'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Play, Square, Loader2, Clock, MapPin } from 'lucide-react';
import { differenceInSeconds, format } from 'date-fns';

interface ClockState {
  isClockedIn: boolean;
  clockInTime?: string;
  todayHours: number;
}

interface OneTapClockProps {
  /** Initial clock state */
  initialState?: ClockState;
  /** API endpoint for clock in */
  clockInEndpoint?: string;
  /** API endpoint for clock out */
  clockOutEndpoint?: string;
  /** Callback when status changes */
  onStatusChange?: (isClockedIn: boolean) => void;
  /** Callback before clock out (for showing summary) */
  onBeforeClockOut?: () => Promise<boolean>;
  /** Additional class names */
  className?: string;
}

/**
 * One-Tap Clock In/Out Button
 *
 * Per Design Constitution Section 3.14.1 - One-Tap Clock In/Out:
 *
 * - Large, prominent button (minimum 56px)
 * - Visual state: Clocked Out (gray) / Clocked In (green)
 * - Tap to toggle
 * - Automatic location capture
 *
 * Flow:
 * 1. Tap "Clock In" → Clocked in (timestamp recorded)
 * 2. GPS captured automatically
 * 3. Brief confirmation: "Clocked in at 8:02 AM"
 */
export function OneTapClock({
  initialState,
  clockInEndpoint = '/api/timesheets/clock-in',
  clockOutEndpoint = '/api/timesheets/clock-out',
  onStatusChange,
  onBeforeClockOut,
  className,
}: OneTapClockProps) {
  const [isClockedIn, setIsClockedIn] = useState(initialState?.isClockedIn ?? false);
  const [clockInTime, setClockInTime] = useState<Date | null>(
    initialState?.clockInTime ? new Date(initialState.clockInTime) : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState('0:00');
  const [showConfirmation, setShowConfirmation] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          // Location not available - continue without it
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Update elapsed time while clocked in
  useEffect(() => {
    if (!isClockedIn || !clockInTime) return;

    const updateElapsed = () => {
      const seconds = differenceInSeconds(new Date(), clockInTime);
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      if (hours > 0) {
        setElapsedTime(`${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      } else {
        setElapsedTime(`${minutes}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isClockedIn, clockInTime]);

  // Haptic feedback
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(15);
    }
  }, []);

  // Handle clock in
  const handleClockIn = useCallback(async () => {
    setIsLoading(true);
    triggerHaptic();

    try {
      const res = await fetch(clockInEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location }),
      });

      if (!res.ok) {
        throw new Error('Failed to clock in');
      }

      const now = new Date();
      setIsClockedIn(true);
      setClockInTime(now);
      onStatusChange?.(true);

      // Show confirmation
      setShowConfirmation(`Clocked in at ${format(now, 'h:mm a')}`);
      setTimeout(() => setShowConfirmation(null), 3000);
    } catch (error) {
      console.error('Clock in error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [clockInEndpoint, location, onStatusChange, triggerHaptic]);

  // Handle clock out
  const handleClockOut = useCallback(async () => {
    // Check if we should show summary first
    if (onBeforeClockOut) {
      const proceed = await onBeforeClockOut();
      if (!proceed) return;
    }

    setIsLoading(true);
    triggerHaptic();

    try {
      const res = await fetch(clockOutEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location }),
      });

      if (!res.ok) {
        throw new Error('Failed to clock out');
      }

      setIsClockedIn(false);
      setClockInTime(null);
      setElapsedTime('0:00');
      onStatusChange?.(false);

      // Show confirmation
      setShowConfirmation('Clocked out');
      setTimeout(() => setShowConfirmation(null), 3000);
    } catch (error) {
      console.error('Clock out error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [clockOutEndpoint, location, onBeforeClockOut, onStatusChange, triggerHaptic]);

  // Handle tap
  const handleTap = useCallback(() => {
    if (isLoading) return;

    if (isClockedIn) {
      handleClockOut();
    } else {
      handleClockIn();
    }
  }, [isLoading, isClockedIn, handleClockIn, handleClockOut]);

  return (
    <div className={cn('relative', className)}>
      {/* Main Button - 56px minimum per Constitution */}
      <button
        onClick={handleTap}
        disabled={isLoading}
        className={cn(
          // Size per Constitution Section 3.14.1
          'w-full min-h-[56px]',
          'flex items-center justify-center gap-3',
          'rounded-xl font-semibold text-base',
          'transition-all duration-200',
          'active:scale-[0.98]',
          // Visual state
          isClockedIn
            ? 'bg-success text-white'
            : 'bg-muted text-text hover:bg-muted/80',
          // Disabled
          isLoading && 'opacity-70 pointer-events-none'
        )}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isClockedIn ? (
          <>
            <Square className="h-5 w-5" />
            <span>Clock Out</span>
            <span className="ml-2 font-mono opacity-80">{elapsedTime}</span>
          </>
        ) : (
          <>
            <Play className="h-5 w-5" />
            <span>Clock In</span>
          </>
        )}
      </button>

      {/* Confirmation Toast */}
      {showConfirmation && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-text text-background px-4 py-2 rounded-lg text-sm font-medium shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {showConfirmation}
        </div>
      )}

      {/* Location indicator */}
      {!isClockedIn && location && (
        <p className="text-xs text-text-muted text-center mt-2 flex items-center justify-center gap-1">
          <MapPin className="h-3 w-3" />
          Location will be recorded
        </p>
      )}
    </div>
  );
}

/**
 * Compact clock status indicator for headers
 */
export function ClockStatusBadge({
  isClockedIn,
  clockInTime,
  className,
}: {
  isClockedIn: boolean;
  clockInTime?: Date | null;
  className?: string;
}) {
  const [elapsedTime, setElapsedTime] = useState('0:00');

  useEffect(() => {
    if (!isClockedIn || !clockInTime) return;

    const updateElapsed = () => {
      const seconds = differenceInSeconds(new Date(), clockInTime);
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      if (hours > 0) {
        setElapsedTime(`${hours}h ${minutes}m`);
      } else {
        setElapsedTime(`${minutes}m`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [isClockedIn, clockInTime]);

  if (!isClockedIn) return null;

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        'bg-success/10 text-success',
        className
      )}
    >
      <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
      <Clock className="h-3 w-3" />
      <span>{elapsedTime}</span>
    </div>
  );
}
