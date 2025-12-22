'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatter?: (value: number) => string;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1000,
  formatter = (v) => v.toLocaleString(),
  className,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out-expo)
      const eased = 1 - Math.pow(2, -10 * progress);
      const current = startValue + (endValue - startValue) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, duration]);

  return <span className={className}>{formatter(Math.round(displayValue))}</span>;
}

// Currency counter
export function AnimatedCurrency({
  value,
  duration = 1000,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  return (
    <AnimatedCounter
      value={value}
      duration={duration}
      formatter={(v) =>
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(v)
      }
      className={className}
    />
  );
}

// Percentage counter
export function AnimatedPercentage({
  value,
  duration = 1000,
  decimals = 0,
  className,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  className?: string;
}) {
  return (
    <AnimatedCounter
      value={value}
      duration={duration}
      formatter={(v) => `${v.toFixed(decimals)}%`}
      className={className}
    />
  );
}

// Metric card with animated value
interface AnimatedMetricProps {
  label: string;
  value: number;
  previousValue?: number;
  formatter?: (value: number) => string;
  icon?: React.ReactNode;
  className?: string;
}

export function AnimatedMetric({
  label,
  value,
  previousValue,
  formatter = (v) => v.toLocaleString(),
  icon,
  className,
}: AnimatedMetricProps) {
  const change = previousValue !== undefined ? value - previousValue : undefined;
  const changePercent =
    previousValue !== undefined && previousValue !== 0
      ? ((value - previousValue) / previousValue) * 100
      : undefined;

  return (
    <div className={cn('p-4 rounded-xl border bg-card', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold">
        <AnimatedCounter value={value} formatter={formatter} />
      </div>
      {changePercent !== undefined && (
        <div
          className={cn(
            'text-sm mt-1',
            changePercent >= 0 ? 'text-green-600' : 'text-red-600'
          )}
        >
          {changePercent >= 0 ? '+' : ''}
          {changePercent.toFixed(1)}%
        </div>
      )}
    </div>
  );
}
