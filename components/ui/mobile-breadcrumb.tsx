'use client';

import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useSmartBack, getDefaultFallback } from '@/lib/hooks/use-smart-back';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface MobileBreadcrumbProps {
  items?: BreadcrumbItem[];
  title?: string;
  fallbackPath?: string;
  className?: string;
  showBackButton?: boolean;
}

/**
 * Mobile-optimized breadcrumb component with smart back navigation
 *
 * Features:
 * - Back button with smart fallback navigation
 * - Truncated breadcrumb trail with horizontal scroll
 * - Touch-friendly 44px+ touch targets
 */
export function MobileBreadcrumb({
  items = [],
  title,
  fallbackPath,
  className,
  showBackButton = true,
}: MobileBreadcrumbProps) {
  const pathname = usePathname();
  const defaultFallback = fallbackPath || getDefaultFallback(pathname);
  const { goBack } = useSmartBack(defaultFallback);

  // Get display title from items or prop
  const displayTitle = title || items[items.length - 1]?.label || 'Page';

  // Get parent breadcrumb items (all except the last one)
  const parentItems = items.slice(0, -1);

  return (
    <div
      className={cn(
        'flex items-center gap-2 min-h-[44px] overflow-hidden',
        className
      )}
    >
      {showBackButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={goBack}
          className="shrink-0 h-10 w-10 -ml-2"
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}

      {/* Breadcrumb Trail */}
      <div className="flex items-center gap-1 min-w-0 overflow-x-auto scrollbar-hide">
        {parentItems.length > 0 && (
          <>
            {parentItems.map((item, index) => (
              <div key={index} className="flex items-center gap-1 shrink-0">
                <span className="text-sm text-muted-foreground truncate max-w-[100px]">
                  {item.label}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>
            ))}
          </>
        )}

        {/* Current Page Title */}
        <span className="text-sm font-medium truncate">{displayTitle}</span>
      </div>
    </div>
  );
}

/**
 * Compact mobile header with breadcrumb - use for detail pages
 */
interface MobileDetailHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  fallbackPath?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function MobileDetailHeader({
  title,
  subtitle,
  breadcrumbs = [],
  fallbackPath,
  actions,
  className,
}: MobileDetailHeaderProps) {
  const pathname = usePathname();
  const defaultFallback = fallbackPath || getDefaultFallback(pathname);
  const { goBack } = useSmartBack(defaultFallback);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Navigation Row */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          className="h-9 px-2 -ml-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          <span className="text-sm">Back</span>
        </Button>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Title Section */}
      <div className="px-1">
        {breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1 mb-1">
            {breadcrumbs.slice(0, -1).map((item, index) => (
              <div key={index} className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
        <h1 className="text-xl font-bold truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
