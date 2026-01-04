'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminLoadingStateProps {
  /** Text to display below the spinner */
  text?: string;
  /** Size of the loading spinner */
  size?: 'sm' | 'md' | 'lg';
  /** Full page loading vs inline */
  fullPage?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

export function AdminLoadingState({
  text,
  size = 'md',
  fullPage = false,
  className,
}: AdminLoadingStateProps) {
  const content = (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        {content}
      </div>
    );
  }

  return content;
}

/**
 * Skeleton loading placeholder for tables
 */
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Header */}
      <div className="bg-muted/50 px-4 py-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded animate-pulse flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="px-4 py-3 flex gap-4 border-b border-border"
          style={{ animationDelay: `${rowIndex * 100}ms` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-4 bg-muted rounded animate-pulse flex-1"
              style={{ animationDelay: `${(rowIndex * columns + colIndex) * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for cards
 */
interface CardSkeletonProps {
  count?: number;
  className?: string;
}

export function CardSkeleton({ count = 4, className }: CardSkeletonProps) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-lg border border-border bg-card"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="h-4 w-24 bg-muted rounded animate-pulse mb-4" />
          <div className="h-8 w-16 bg-muted rounded animate-pulse mb-2" />
          <div className="h-3 w-20 bg-muted rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}
