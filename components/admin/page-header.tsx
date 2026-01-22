'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, ChevronLeft, Home, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AdminPageHeaderProps {
  /** Page title */
  title: string;
  /** Optional description below the title */
  description?: string;
  /** Breadcrumb trail - will automatically include Admin Portal as first item */
  breadcrumb?: BreadcrumbItem[];
  /** Show a back button that returns to previous page or specified URL */
  backHref?: string | boolean;
  /** Optional custom back handler. If provided, overrides backHref behavior */
  onBack?: () => void;
  /** Icon to display next to the title */
  icon?: LucideIcon;
  /** Action buttons to display on the right */
  actions?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function AdminPageHeader({
  title,
  description,
  breadcrumb = [],
  backHref,
  onBack,
  icon: Icon,
  actions,
  className,
}: AdminPageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (typeof backHref === 'string') {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  // Build full breadcrumb trail
  const fullBreadcrumb: BreadcrumbItem[] = [
    { label: 'Admin Portal', href: '/admin' },
    ...breadcrumb,
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1 text-sm">
            {fullBreadcrumb.map((item, index) => {
              const isLast = index === fullBreadcrumb.length - 1;
              const isFirst = index === 0;

              return (
                <li key={index} className="flex items-center gap-1">
                  {index > 0 && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                  )}

                  {isLast ? (
                    <span className="font-medium text-foreground" aria-current="page">
                      {item.label}
                    </span>
                  ) : item.href ? (
                    <Link
                      href={item.href}
                      className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      {isFirst && <Home className="w-4 h-4" aria-hidden="true" />}
                      {!isFirst && item.label}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">{item.label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      )}

      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          {/* Back button */}
          {backHref !== undefined && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="mt-0.5 shrink-0"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}

          {/* Icon + Title/Description */}
          <div className="flex items-start gap-3">
            {Icon && (
              <div className="shrink-0 mt-0.5">
                <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              {description && (
                <p className="text-muted-foreground mt-1">{description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 sm:shrink-0">{actions}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Generate breadcrumb items from the current path
 * Usage: generateBreadcrumb('/admin/leads/123', { '123': 'John Doe' })
 */
export function generateBreadcrumb(
  pathname: string,
  customLabels: Record<string, string> = {}
): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [];

  // Skip 'admin' as it's added automatically via fullBreadcrumb
  let currentPath = '';
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    currentPath += `/${segment}`;

    // Skip admin segment (it's added automatically)
    if (segment === 'admin') continue;

    // Get label - check custom labels first, then format segment
    const label = customLabels[segment] || formatSegmentLabel(segment);

    // Last segment doesn't need href
    const isLast = i === segments.length - 1;

    items.push({
      label,
      href: isLast ? undefined : currentPath,
    });
  }

  return items;
}

function formatSegmentLabel(segment: string): string {
  // Handle common patterns
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
