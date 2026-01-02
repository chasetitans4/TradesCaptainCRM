'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Column<T> {
  key: string;
  header: string;
  cell: (item: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface ResponsiveListProps<T> {
  data: T[];
  columns: Column<T>[];
  mobileCard: (item: T, index: number) => React.ReactNode;
  onRowClick?: (item: T) => void;
  keyExtractor: (item: T) => string;
  emptyState?: React.ReactNode;
  loading?: boolean;
  loadingSkeleton?: React.ReactNode;
  className?: string;
  mobileBreakpoint?: number;
}

/**
 * Responsive list component that renders cards on mobile and tables on desktop.
 *
 * @example
 * ```tsx
 * <ResponsiveList
 *   data={jobs}
 *   columns={[
 *     { key: 'title', header: 'Title', cell: (job) => job.title },
 *     { key: 'status', header: 'Status', cell: (job) => <Badge>{job.status}</Badge> },
 *   ]}
 *   mobileCard={(job) => <JobCard job={job} />}
 *   onRowClick={(job) => router.push(`/jobs/${job.id}`)}
 *   keyExtractor={(job) => job.id}
 * />
 * ```
 */
export function ResponsiveList<T>({
  data,
  columns,
  mobileCard,
  onRowClick,
  keyExtractor,
  emptyState,
  loading,
  loadingSkeleton,
  className,
  mobileBreakpoint = 768,
}: ResponsiveListProps<T>) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [mobileBreakpoint]);

  if (loading && loadingSkeleton) {
    return <>{loadingSkeleton}</>;
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  // Mobile: Render cards
  if (isMobile) {
    return (
      <div className={cn('space-y-3', className)}>
        {data.map((item, index) => (
          <div
            key={keyExtractor(item)}
            onClick={onRowClick ? () => onRowClick(item) : undefined}
            className={onRowClick ? 'cursor-pointer' : undefined}
          >
            {mobileCard(item, index)}
          </div>
        ))}
      </div>
    );
  }

  // Desktop: Render table
  return (
    <div className={cn('rounded-lg border', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns
              .filter((col) => !col.hideOnMobile || !isMobile)
              .map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={keyExtractor(item)}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : undefined}
            >
              {columns
                .filter((col) => !col.hideOnMobile || !isMobile)
                .map((column) => (
                  <TableCell key={column.key} className={column.className}>
                    {column.cell(item)}
                  </TableCell>
                ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Simple card list for mobile-only usage
 */
interface CardListProps<T> {
  data: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  onItemClick?: (item: T) => void;
  emptyState?: React.ReactNode;
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
}

export function CardList<T>({
  data,
  renderCard,
  keyExtractor,
  onItemClick,
  emptyState,
  className,
  gap = 'md',
}: CardListProps<T>) {
  const gapClasses = {
    sm: 'space-y-2',
    md: 'space-y-3',
    lg: 'space-y-4',
  };

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={cn(gapClasses[gap], className)}>
      {data.map((item, index) => (
        <div
          key={keyExtractor(item)}
          onClick={onItemClick ? () => onItemClick(item) : undefined}
          className={onItemClick ? 'cursor-pointer' : undefined}
        >
          {renderCard(item, index)}
        </div>
      ))}
    </div>
  );
}

/**
 * Grid list for card-based layouts
 */
interface GridListProps<T> {
  data: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  onItemClick?: (item: T) => void;
  emptyState?: React.ReactNode;
  className?: string;
  columns?: {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
}

export function GridList<T>({
  data,
  renderCard,
  keyExtractor,
  onItemClick,
  emptyState,
  className,
  columns = { default: 1, sm: 2, md: 3, lg: 4 },
}: GridListProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  const gridClasses = cn(
    'grid gap-4',
    `grid-cols-${columns.default}`,
    columns.sm && `sm:grid-cols-${columns.sm}`,
    columns.md && `md:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`,
    className
  );

  return (
    <div className={gridClasses}>
      {data.map((item, index) => (
        <div
          key={keyExtractor(item)}
          onClick={onItemClick ? () => onItemClick(item) : undefined}
          className={onItemClick ? 'cursor-pointer' : undefined}
        >
          {renderCard(item, index)}
        </div>
      ))}
    </div>
  );
}
