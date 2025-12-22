'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureTooltipProps {
  id: string; // Unique ID to track dismissal
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
}

export function FeatureTooltip({
  id,
  title,
  description,
  position = 'bottom',
  children,
}: FeatureTooltipProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(`tooltip-${id}`);
    if (!dismissed) setVisible(true);
  }, [id]);

  const dismiss = () => {
    localStorage.setItem(`tooltip-${id}`, 'true');
    setVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  };

  const arrowClasses = {
    top: 'bottom-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-card',
    bottom:
      'top-[-6px] left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-card',
    left: 'right-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-card',
    right:
      'left-[-6px] top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-card',
  };

  return (
    <div className="relative inline-block">
      {children}

      {visible && (
        <>
          {/* Pulsing dot */}
          <span className="absolute -top-1 -right-1 flex h-3 w-3 z-10">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </span>

          {/* Tooltip */}
          <div
            className={cn(
              'absolute z-50 w-64 p-4 bg-card border rounded-lg shadow-lg',
              positionClasses[position]
            )}
          >
            <button
              onClick={dismiss}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="font-medium mb-1 pr-6">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </>
      )}
    </div>
  );
}
