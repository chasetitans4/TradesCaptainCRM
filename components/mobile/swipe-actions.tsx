'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Phone, Trash2, Check } from 'lucide-react';

interface SwipeAction {
  icon: React.ElementType;
  label: string;
  color: string;
  onClick: () => void;
}

interface SwipeActionsProps {
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  children: React.ReactNode;
  threshold?: number;
}

export function SwipeActions({
  leftActions = [],
  rightActions = [],
  children,
  threshold = 80,
}: SwipeActionsProps) {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;

    // Limit swipe distance
    const maxLeft = leftActions.length * threshold;
    const maxRight = rightActions.length * threshold;

    if (diff > 0 && leftActions.length > 0) {
      setOffset(Math.min(diff, maxLeft));
    } else if (diff < 0 && rightActions.length > 0) {
      setOffset(Math.max(diff, -maxRight));
    }
  };

  const handleTouchEnd = () => {
    // Snap to action or reset
    if (Math.abs(offset) >= threshold / 2) {
      if (offset > 0 && leftActions.length > 0) {
        setOffset(leftActions.length * threshold);
      } else if (offset < 0 && rightActions.length > 0) {
        setOffset(-rightActions.length * threshold);
      }
    } else {
      setOffset(0);
    }
  };

  const reset = () => setOffset(0);

  return (
    <div ref={containerRef} className="relative overflow-hidden">
      {/* Left actions */}
      {leftActions.length > 0 && (
        <div className="absolute left-0 top-0 bottom-0 flex">
          {leftActions.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                action.onClick();
                reset();
              }}
              className="flex flex-col items-center justify-center px-6"
              style={{ backgroundColor: action.color, width: threshold }}
            >
              <action.icon className="w-5 h-5 text-white" />
              <span className="text-xs text-white mt-1">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Right actions */}
      {rightActions.length > 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex">
          {rightActions.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                action.onClick();
                reset();
              }}
              className="flex flex-col items-center justify-center px-6"
              style={{ backgroundColor: action.color, width: threshold }}
            >
              <action.icon className="w-5 h-5 text-white" />
              <span className="text-xs text-white mt-1">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div
        className="relative bg-card transition-transform duration-200 ease-out"
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
        { icon: Phone, label: 'Call', color: '#22c55e', onClick: onCall },
      ]}
      rightActions={[
        { icon: Check, label: 'Complete', color: '#3b82f6', onClick: onComplete },
        { icon: Trash2, label: 'Delete', color: '#ef4444', onClick: onDelete },
      ]}
    >
      <div className="p-4 border-b">
        <p className="font-medium">{job.title}</p>
        <p className="text-sm text-muted-foreground">{job.customer}</p>
      </div>
    </SwipeActions>
  );
}
