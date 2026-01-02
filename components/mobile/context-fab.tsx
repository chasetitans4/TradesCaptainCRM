'use client';

import { useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Plus,
  Users,
  Briefcase,
  FileText,
  Receipt,
  Phone,
  Bell,
  UserPlus,
  ArrowRightLeft,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

interface ContextConfig {
  primary: QuickAction;
  secondary: QuickAction[];
}

// Context-aware action configurations based on route
const routeContexts: Record<string, ContextConfig> = {
  '/dashboard': {
    primary: { label: 'New Job', href: '/jobs/new', icon: Briefcase },
    secondary: [
      { label: 'New Lead', href: '/leads/new', icon: UserPlus },
      { label: 'Reminder', href: '/reminders/new', icon: Bell },
      { label: 'Log Call', href: '/calls/new', icon: Phone },
    ],
  },
  '/customers': {
    primary: { label: 'New Customer', href: '/customers/new', icon: Users },
    secondary: [
      { label: 'New Job', href: '/jobs/new', icon: Briefcase },
      { label: 'New Quote', href: '/quotes/new', icon: FileText },
    ],
  },
  '/jobs': {
    primary: { label: 'New Job', href: '/jobs/new', icon: Briefcase },
    secondary: [
      { label: 'New Customer', href: '/customers/new', icon: Users },
    ],
  },
  '/invoices': {
    primary: { label: 'New Invoice', href: '/invoices/new', icon: Receipt },
    secondary: [
      { label: 'New Quote', href: '/quotes/new', icon: FileText },
    ],
  },
  '/quotes': {
    primary: { label: 'New Quote', href: '/quotes/new', icon: FileText },
    secondary: [
      { label: 'New Invoice', href: '/invoices/new', icon: Receipt },
    ],
  },
  '/leads': {
    primary: { label: 'New Lead', href: '/leads/new', icon: UserPlus },
    secondary: [
      { label: 'Convert', href: '/customers/new', icon: ArrowRightLeft, description: 'Convert to Customer' },
    ],
  },
  '/reminders': {
    primary: { label: 'New Reminder', href: '/reminders/new', icon: Bell },
    secondary: [],
  },
  '/calls': {
    primary: { label: 'Log Call', href: '/calls/new', icon: Phone },
    secondary: [],
  },
};

// Get context for detail pages (e.g., /customers/[id])
function getDetailPageContext(pathname: string, entityId?: string): ContextConfig | null {
  if (pathname.startsWith('/customers/') && entityId) {
    return {
      primary: { label: 'New Job', href: `/jobs/new?customer_id=${entityId}`, icon: Briefcase },
      secondary: [
        { label: 'New Quote', href: `/quotes/new?customer_id=${entityId}`, icon: FileText },
        { label: 'New Invoice', href: `/invoices/new?customer_id=${entityId}`, icon: Receipt },
      ],
    };
  }
  if (pathname.startsWith('/jobs/') && entityId) {
    return {
      primary: { label: 'Create Invoice', href: `/invoices/new?job_id=${entityId}`, icon: Receipt },
      secondary: [
        { label: 'Log Call', href: `/calls/new?job_id=${entityId}`, icon: Phone },
      ],
    };
  }
  return null;
}

interface ContextFABProps {
  className?: string;
  entityId?: string;
}

/**
 * Context-aware Floating Action Button
 *
 * Changes primary and secondary actions based on current route:
 * - Dashboard: New Job + Lead/Reminder/Call
 * - Customers: New Customer + Job/Quote
 * - Customer Detail: New Job for customer + Quote/Invoice
 * - Jobs: New Job + Customer
 * - Invoices: New Invoice + Quote
 * - Leads: New Lead + Convert
 */
export function ContextFAB({ className, entityId }: ContextFABProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Get context based on current route
  const context = useMemo(() => {
    // Check for detail page context first
    const detailContext = getDetailPageContext(pathname, entityId);
    if (detailContext) return detailContext;

    // Check for exact route match
    if (routeContexts[pathname]) return routeContexts[pathname];

    // Check for parent route match (e.g., /jobs matches /jobs)
    const parentRoute = '/' + pathname.split('/')[1];
    if (routeContexts[parentRoute]) return routeContexts[parentRoute];

    // Default to dashboard context
    return routeContexts['/dashboard'];
  }, [pathname, entityId]);

  const handleClose = () => setOpen(false);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40 animate-in fade-in duration-200"
          onClick={handleClose}
        />
      )}

      {/* Secondary Actions Menu */}
      {open && context.secondary.length > 0 && (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 animate-in slide-in-from-bottom-5 fade-in duration-200">
          {context.secondary.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              onClick={handleClose}
              className="flex items-center gap-3 bg-background rounded-xl shadow-lg px-4 py-3 active:scale-95 transition-transform border"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <action.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => {
          if (context.secondary.length === 0) {
            // No secondary actions, navigate directly
            window.location.href = context.primary.href;
          } else {
            setOpen(!open);
          }
        }}
        className={cn(
          'fixed bottom-20 right-4 z-50',
          'w-14 h-14 rounded-full',
          'bg-primary text-primary-foreground',
          'shadow-lg active:scale-95',
          'flex items-center justify-center',
          'transition-all duration-200',
          open && 'rotate-45 bg-destructive',
          className
        )}
        aria-label={open ? 'Close menu' : context.primary.label}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <context.primary.icon className="h-6 w-6" />
        )}
      </button>

      {/* Primary Action Label (shown when closed) */}
      {!open && (
        <div
          className={cn(
            'fixed bottom-20 right-20 z-50',
            'bg-background rounded-lg shadow-lg px-3 py-1.5',
            'text-sm font-medium',
            'pointer-events-none opacity-0',
            'transition-opacity duration-200',
            // Show on hover/focus of FAB
            'peer-hover:opacity-100 peer-focus:opacity-100'
          )}
        >
          {context.primary.label}
        </div>
      )}
    </>
  );
}

/**
 * Simple FAB without context awareness
 * Use when you need a fixed action regardless of route
 */
interface SimpleFABProps {
  icon?: LucideIcon;
  label: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function SimpleFAB({
  icon: Icon = Plus,
  label,
  href,
  onClick,
  className,
}: SimpleFABProps) {
  const ButtonOrLink = href ? Link : 'button';

  return (
    <ButtonOrLink
      href={href as string}
      onClick={onClick}
      className={cn(
        'fixed bottom-20 right-4 z-50',
        'w-14 h-14 rounded-full',
        'bg-primary text-primary-foreground',
        'shadow-lg active:scale-95',
        'flex items-center justify-center',
        'transition-transform duration-200',
        className
      )}
      aria-label={label}
    >
      <Icon className="h-6 w-6" />
    </ButtonOrLink>
  );
}
