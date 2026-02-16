'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Briefcase, Target, FileText, Receipt } from 'lucide-react';

/**
 * Entity Sub-Tabs - Horizontal navigation below Jobs header
 * Per Product Constitution v2.0 Section 1.2:
 * [All Jobs] [Leads] [Quotes] [Invoices]
 */

interface EntityTab {
  name: string;
  href: string;
  icon: React.ElementType;
  count?: number;
}

const ENTITY_TABS: EntityTab[] = [
  { name: 'All Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Leads', href: '/leads', icon: Target },
  { name: 'Quotes', href: '/quotes', icon: FileText },
  { name: 'Invoices', href: '/invoices', icon: Receipt },
];

interface EntitySubTabsProps {
  counts?: {
    jobs?: number;
    leads?: number;
    quotes?: number;
    invoices?: number;
  };
  className?: string;
}

export function EntitySubTabs({ counts, className }: EntitySubTabsProps) {
  const pathname = usePathname();

  // Determine which tab is active based on pathname
  const getIsActive = (href: string) => {
    if (href === '/jobs') {
      // Jobs is active only when on /jobs exactly, not on other entity pages
      return pathname === '/jobs' || pathname.startsWith('/jobs/');
    }
    return pathname.startsWith(href);
  };

  return (
    <div className={cn('border-b border-border bg-background', className)}>
      <nav className="flex overflow-x-auto scrollbar-hide">
        {ENTITY_TABS.map((tab) => {
          const isActive = getIsActive(tab.href);
          const count = tab.href === '/jobs' ? counts?.jobs :
                       tab.href === '/leads' ? counts?.leads :
                       tab.href === '/quotes' ? counts?.quotes :
                       tab.href === '/invoices' ? counts?.invoices : undefined;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text hover:border-border'
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
              {count !== undefined && count > 0 && (
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-text-muted'
                  )}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
