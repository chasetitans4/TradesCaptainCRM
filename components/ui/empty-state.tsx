import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Users,
  Briefcase,
  FileText,
  MessageSquare,
  Calendar,
  Search,
  Plus,
  type LucideIcon,
} from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-6">{description}</p>

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button asChild={!!action.href} onClick={action.onClick}>
              {action.href ? (
                <Link href={action.href}>
                  <Plus className="w-4 h-4 mr-2" />
                  {action.label}
                </Link>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  {action.label}
                </>
              )}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="outline"
              asChild={!!secondaryAction.href}
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.href ? (
                <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
              ) : (
                secondaryAction.label
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-built empty states
export function EmptyCustomers() {
  return (
    <EmptyState
      icon={Users}
      title="No customers yet"
      description="Add your first customer to start tracking jobs and building relationships."
      action={{ label: 'Add Customer', href: '/customers/new' }}
      secondaryAction={{ label: 'Import CSV', href: '/customers/import' }}
    />
  );
}

export function EmptyJobs() {
  return (
    <EmptyState
      icon={Briefcase}
      title="No jobs scheduled"
      description="Schedule your first job to start tracking work and revenue."
      action={{ label: 'Create Job', href: '/jobs/new' }}
    />
  );
}

export function EmptyMessages() {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No messages"
      description="Messages from customers will appear here."
    />
  );
}

export function EmptySearch({ query }: { query: string }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try a different search term.`}
    />
  );
}

export function EmptyCalendar() {
  return (
    <EmptyState
      icon={Calendar}
      title="No appointments today"
      description="Your schedule is clear. Time to book some jobs!"
      action={{ label: 'Schedule Job', href: '/jobs/new' }}
    />
  );
}

export function EmptyInvoices() {
  return (
    <EmptyState
      icon={FileText}
      title="No invoices"
      description="Create your first invoice to start getting paid."
      action={{ label: 'Create Invoice', href: '/invoices/new' }}
    />
  );
}

export function EmptyLeads() {
  return (
    <EmptyState
      icon={Users}
      title="No leads yet"
      description="Add your first lead to start tracking potential customers."
      action={{ label: 'Add Lead', href: '/leads/new' }}
    />
  );
}
