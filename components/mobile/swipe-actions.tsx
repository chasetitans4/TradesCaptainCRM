'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Phone, Trash2, Check } from 'lucide-react';

/**
 * SwipeActions - Mobile swipe gesture component
 * Per UI Constraints v2.0 Section 10.3:
 * - 4px colored edge peek at rest
 * - Swipe right = positive action (green)
 * - Swipe left = destructive action (red)
 * - 80px threshold
 * - Haptic feedback
 */

interface SwipeAction {
  icon: React.ElementType;
  label: string;
  /** Color for the action background. Use semantic: 'success' | 'danger' | 'warning' | 'info' | hex */
  color: string | 'success' | 'danger' | 'warning' | 'info';
  onClick: () => void;
}

interface SwipeActionsProps {
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  children: React.ReactNode;
  threshold?: number;
  /** Show 4px edge peek indicator at rest */
  showEdgePeek?: boolean;
  /** Enable haptic feedback on threshold cross */
  hapticFeedback?: boolean;
  /** First-time hint tooltip */
  showHint?: boolean;
}

// Map semantic colors to actual values
const colorMap: Record<string, string> = {
  success: 'var(--color-success)',
  danger: 'var(--color-danger)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',
};

function getColor(color: string): string {
  return colorMap[color] || color;
}

// Trigger haptic feedback if available
function triggerHaptic() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(10);
  }
}

export function SwipeActions({
  leftActions = [],
  rightActions = [],
  children,
  threshold = 80,
  showEdgePeek = true,
  hapticFeedback = true,
  showHint = false,
}: SwipeActionsProps) {
  const [offset, setOffset] = useState(0);
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);
  const startX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setHasTriggeredHaptic(false);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;

    // Limit swipe distance
    const maxLeft = leftActions.length * threshold;
    const maxRight = rightActions.length * threshold;

    let newOffset = 0;
    if (diff > 0 && leftActions.length > 0) {
      newOffset = Math.min(diff, maxLeft);
    } else if (diff < 0 && rightActions.length > 0) {
      newOffset = Math.max(diff, -maxRight);
    }

    // Haptic feedback when crossing threshold
    if (hapticFeedback && !hasTriggeredHaptic && Math.abs(newOffset) >= threshold / 2) {
      triggerHaptic();
      setHasTriggeredHaptic(true);
    }

    setOffset(newOffset);
  }, [leftActions.length, rightActions.length, threshold, hapticFeedback, hasTriggeredHaptic]);

  const handleTouchEnd = useCallback(() => {
    // Snap to action or reset
    if (Math.abs(offset) >= threshold / 2) {
      if (offset > 0 && leftActions.length > 0) {
        setOffset(leftActions.length * threshold);
        if (hapticFeedback) triggerHaptic();
      } else if (offset < 0 && rightActions.length > 0) {
        setOffset(-rightActions.length * threshold);
        if (hapticFeedback) triggerHaptic();
      }
    } else {
      setOffset(0);
    }
  }, [offset, threshold, leftActions.length, rightActions.length, hapticFeedback]);

  const reset = useCallback(() => setOffset(0), []);

  // Get edge peek colors
  const leftPeekColor = leftActions[0] ? getColor(leftActions[0].color) : undefined;
  const rightPeekColor = rightActions[0] ? getColor(rightActions[0].color) : undefined;

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Edge peek indicators (4px visible at rest) */}
      {showEdgePeek && leftActions.length > 0 && offset === 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: leftPeekColor }}
        />
      )}
      {showEdgePeek && rightActions.length > 0 && offset === 0 && (
        <div
          className="absolute right-0 top-0 bottom-0 w-1"
          style={{ backgroundColor: rightPeekColor }}
        />
      )}

      {/* Left actions (positive - typically green) */}
      {leftActions.length > 0 && (
        <div className="absolute left-0 top-0 bottom-0 flex">
          {leftActions.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                if (hapticFeedback) triggerHaptic();
                action.onClick();
                reset();
              }}
              className="flex flex-col items-center justify-center px-6 min-h-tap active:opacity-80 transition-opacity"
              style={{ backgroundColor: getColor(action.color), width: threshold }}
            >
              <action.icon className="w-5 h-5 text-white" />
              <span className="text-xs text-white mt-1 font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right actions (destructive - typically red) */}
      {rightActions.length > 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex">
          {rightActions.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                if (hapticFeedback) triggerHaptic();
                action.onClick();
                reset();
              }}
              className="flex flex-col items-center justify-center px-6 min-h-tap active:opacity-80 transition-opacity"
              style={{ backgroundColor: getColor(action.color), width: threshold }}
            >
              <action.icon className="w-5 h-5 text-white" />
              <span className="text-xs text-white mt-1 font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* First-time hint tooltip */}
      {showHint && offset === 0 && (leftActions.length > 0 || rightActions.length > 0) && (
        <div className="absolute inset-x-0 bottom-full mb-2 flex justify-center pointer-events-none">
          <span className="bg-surface-elevated text-text-secondary text-xs px-2 py-1 rounded shadow-soft">
            Swipe for quick actions
          </span>
        </div>
      )}

      {/* Content */}
      <div
        className={cn(
          'relative bg-surface transition-transform ease-out',
          offset === 0 ? 'duration-200' : 'duration-0'
        )}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

// Usage example component
interface SwipeableJobCardProps {
  job: {
    title: string;
    customer: string;
  };
  onCall: () => void;
  onComplete: () => void;
  onDelete: () => void;
}

export function SwipeableJobCard({
  job,
  onCall,
  onComplete,
  onDelete,
}: SwipeableJobCardProps) {
  return (
    <SwipeActions
      leftActions={[
        { icon: Phone, label: 'Call', color: 'success', onClick: onCall },
      ]}
      rightActions={[
        { icon: Check, label: 'Complete', color: 'info', onClick: onComplete },
        { icon: Trash2, label: 'Delete', color: 'danger', onClick: onDelete },
      ]}
      showEdgePeek
      hapticFeedback
    >
      <div className="p-4 border-b border-tc-border">
        <p className="font-medium text-text-primary">{job.title}</p>
        <p className="text-sm text-text-secondary">{job.customer}</p>
      </div>
    </SwipeActions>
  );
}
