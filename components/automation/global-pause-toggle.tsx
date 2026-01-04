'use client';

// =====================================================
// GLOBAL PAUSE TOGGLE COMPONENT
// One-tap automation pause - reachable in ≤2 taps (Section 7.3)
// =====================================================

import { useState, useCallback } from 'react';
import { Pause, Play, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface GlobalPauseToggleProps {
  /** Current pause state - true = paused (automations OFF) */
  isPaused: boolean;
  /** Callback when toggle is clicked */
  onToggle: (paused: boolean) => Promise<void>;
  /** Visual variant */
  variant?: 'switch' | 'button' | 'compact';
  /** Show label text */
  showLabel?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Disable the toggle */
  disabled?: boolean;
}

export function GlobalPauseToggle({
  isPaused,
  onToggle,
  variant = 'button',
  showLabel = true,
  className,
  disabled = false,
}: GlobalPauseToggleProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = useCallback(async () => {
    if (loading || disabled) return;

    setLoading(true);
    try {
      await onToggle(!isPaused);
    } finally {
      setLoading(false);
    }
  }, [isPaused, onToggle, loading, disabled]);

  // Switch variant - minimal, inline
  if (variant === 'switch') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {showLabel && (
          <span className="text-sm text-muted-foreground">
            {isPaused ? 'Paused' : 'Active'}
          </span>
        )}
        <Switch
          checked={!isPaused}
          onCheckedChange={() => handleToggle()}
          disabled={loading || disabled}
          aria-label={isPaused ? 'Resume automations' : 'Pause automations'}
        />
      </div>
    );
  }

  // Compact variant - icon button for header
  if (variant === 'compact') {
    return (
      <Button
        variant={isPaused ? 'destructive' : 'outline'}
        size="icon"
        onClick={handleToggle}
        disabled={loading || disabled}
        className={cn(
          'relative min-h-[44px] min-w-[44px]',
          isPaused && 'animate-pulse',
          className
        )}
        aria-label={isPaused ? 'Resume automations' : 'Pause all automations'}
        title={isPaused ? 'Resume automations' : 'Pause all automations'}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isPaused ? (
          <Play className="h-4 w-4" />
        ) : (
          <Pause className="h-4 w-4" />
        )}
      </Button>
    );
  }

  // Button variant - full button with label (default)
  return (
    <Button
      variant={isPaused ? 'destructive' : 'outline'}
      onClick={handleToggle}
      disabled={loading || disabled}
      className={cn(
        'gap-2 min-h-[44px]',
        isPaused && 'animate-pulse',
        className
      )}
      aria-label={isPaused ? 'Resume automations' : 'Pause all automations'}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isPaused ? (
        <>
          <Play className="h-4 w-4" />
          {showLabel && 'Resume Automations'}
        </>
      ) : (
        <>
          <Pause className="h-4 w-4" />
          {showLabel && 'Pause All'}
        </>
      )}
    </Button>
  );
}

/**
 * Hook to manage global pause state with API
 */
export function useGlobalPause(initialPaused: boolean = false) {
  const [isPaused, setIsPaused] = useState(initialPaused);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback(async (newPausedState: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/leads-captain/v2/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          global_mode: newPausedState ? 'paused' : 'normal',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update pause state');
      }

      setIsPaused(newPausedState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    isPaused,
    setIsPaused,
    toggle,
    loading,
    error,
  };
}
