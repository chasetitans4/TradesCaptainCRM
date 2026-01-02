'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileSectionAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface MobileSectionProps {
  title: string;
  subtitle?: string;
  action?: MobileSectionAction;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  badge?: number | string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

/**
 * Consistent section component for mobile layouts
 *
 * Features:
 * - Section header with title and optional subtitle
 * - Optional action button/link
 * - Optional badge for counts
 * - Consistent spacing
 *
 * @example
 * ```tsx
 * <MobileSection
 *   title="Today's Jobs"
 *   badge={3}
 *   action={{ label: "View All", href: "/jobs" }}
 * >
 *   <JobList jobs={todayJobs} />
 * </MobileSection>
 * ```
 */
export function MobileSection({
  title,
  subtitle,
  action,
  children,
  className,
  contentClassName,
  badge,
}: MobileSectionProps) {
  return (
    <section className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">{title}</h2>
          {badge !== undefined && (
            <span className="px-2 py-0.5 text-xs font-medium bg-muted rounded-full">
              {badge}
            </span>
          )}
        </div>

        {action && (
          action.href ? (
            <Link href={action.href}>
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground">
                {action.label}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={action.onClick}
              className="h-8 gap-1 text-muted-foreground"
            >
              {action.label}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="text-sm text-muted-foreground -mt-1">{subtitle}</p>
      )}

      {/* Content */}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}

/**
 * Card-based section with built-in card styling
 */
interface MobileCardSectionProps extends Omit<MobileSectionProps, 'contentClassName'> {
  noPadding?: boolean;
}

export function MobileCardSection({
  noPadding,
  children,
  ...props
}: MobileCardSectionProps) {
  return (
    <MobileSection {...props}>
      <div className={cn('rounded-xl border bg-card', !noPadding && 'p-4')}>
        {children}
      </div>
    </MobileSection>
  );
}

/**
 * Empty state component for sections
 */
interface SectionEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function SectionEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: SectionEmptyStateProps) {
  return (
    <div className={cn('text-center py-8', className)}>
      {icon && <div className="mb-3">{icon}</div>}
      <p className="font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      )}
      {action && (
        <div className="mt-4">
          {action.href ? (
            <Link href={action.href}>
              <Button size="sm">{action.label}</Button>
            </Link>
          ) : (
            <Button size="sm" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Divider with optional label
 */
interface SectionDividerProps {
  label?: string;
  className?: string;
}

export function SectionDivider({ label, className }: SectionDividerProps) {
  if (!label) {
    return <hr className={cn('border-border', className)} />;
  }

  return (
    <div className={cn('relative', className)}>
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-background px-2 text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
