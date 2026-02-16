'use client';

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
  GraduationCap,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { getCourse } from '@/lib/training/content';

// =====================================================
// EMPTY STATE WITH TRAINING INTEGRATION (GTS v1.5)
// =====================================================

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
  /** Optional: Link to a training course for this empty state */
  courseId?: string;
  /** Custom text for the learn button (defaults to "Learn how") */
  learnButtonText?: string;
  /** Callback when training is started */
  onStartTraining?: (courseId: string) => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = FileText,
  title,
  description,
  action,
  secondaryAction,
  courseId,
  learnButtonText = 'Learn how',
  onStartTraining,
  className,
}: EmptyStateProps) {
  // Check if course exists
  const course = courseId ? getCourse(courseId) : null;
  const showTrainingButton = course && onStartTraining;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>

      {/* Description */}
      <p className="text-muted-foreground max-w-sm mb-6">{description}</p>

      {/* Action buttons */}
      {(action || secondaryAction || showTrainingButton) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* Training button (secondary style, left position per GTS spec) */}
          {showTrainingButton && (
            <Button
              variant="outline"
              onClick={() => onStartTraining(courseId!)}
              className="gap-2"
            >
              <GraduationCap className="w-4 h-4" />
              {learnButtonText}
            </Button>
          )}

          {/* Primary action */}
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

          {/* Secondary action */}
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

// =====================================================
// EMPTY STATE WITH TRAINING CONTEXT
// Wrapper that connects to TrainingProvider
// =====================================================

interface EmptyStateWithTrainingProps extends Omit<EmptyStateProps, 'onStartTraining'> {
  /** Required when using training integration */
  courseId: string;
}

/**
 * EmptyState that automatically connects to TrainingProvider
 * Use this when the component is within a TrainingProvider context
 */
export function EmptyStateWithTraining(props: EmptyStateWithTrainingProps) {
  // Dynamic import to avoid circular dependencies
  // The actual implementation will use useTrainingContext
  return (
    <EmptyState
      {...props}
      onStartTraining={(courseId) => {
        // This will be connected to TrainingProvider in the actual usage
        console.log('[EmptyState] Training start requested for:', courseId);
      }}
    />
  );
}

// =====================================================
// PRE-BUILT EMPTY STATES WITH TRAINING INTEGRATION
// =====================================================

interface PrebuiltEmptyStateProps {
  onStartTraining?: (courseId: string) => void;
}

export function EmptyCustomers({ onStartTraining }: PrebuiltEmptyStateProps = {}) {
  return (
    <EmptyState
      icon={Users}
      title="No customers yet"
      description="Add your first customer to start tracking jobs and building relationships."
      action={{ label: 'Add Customer', href: '/customers/new' }}
      secondaryAction={{ label: 'Import CSV', href: '/customers/import' }}
      courseId="customer-management"
      learnButtonText="Learn how to add customers"
      onStartTraining={onStartTraining}
    />
  );
}

export function EmptyJobs({ onStartTraining }: PrebuiltEmptyStateProps = {}) {
  return (
    <EmptyState
      icon={Briefcase}
      title="No jobs scheduled"
      description="Schedule your first job to start tracking work and revenue."
      action={{ label: 'Create Job', href: '/jobs/new' }}
      courseId="job-workflow"
      learnButtonText="Learn how to create jobs"
      onStartTraining={onStartTraining}
    />
  );
}

export function EmptyMessages({ onStartTraining }: PrebuiltEmptyStateProps = {}) {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No messages"
      description="Messages from customers will appear here."
      courseId="messaging"
      learnButtonText="Learn about messaging"
      onStartTraining={onStartTraining}
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

export function EmptyCalendar({ onStartTraining }: PrebuiltEmptyStateProps = {}) {
  return (
    <EmptyState
      icon={Calendar}
      title="No appointments today"
      description="Your schedule is clear. Time to book some jobs!"
      action={{ label: 'Schedule Job', href: '/jobs/new' }}
      courseId="calendar-dispatch"
      learnButtonText="Learn scheduling"
      onStartTraining={onStartTraining}
    />
  );
}

export function EmptyInvoices({ onStartTraining }: PrebuiltEmptyStateProps = {}) {
  return (
    <EmptyState
      icon={FileText}
      title="No invoices"
      description="Create your first invoice to start getting paid."
      action={{ label: 'Create Invoice', href: '/invoices/new' }}
      courseId="quotes-invoices"
      learnButtonText="Learn about invoices"
      onStartTraining={onStartTraining}
    />
  );
}

export function EmptyLeads({ onStartTraining }: PrebuiltEmptyStateProps = {}) {
  return (
    <EmptyState
      icon={Target}
      title="No leads yet"
      description="Add your first lead to start tracking potential customers."
      action={{ label: 'Add Lead', href: '/leads/new' }}
      courseId="leads-captain"
      learnButtonText="Learn how leads work"
      onStartTraining={onStartTraining}
    />
  );
}

export function EmptyQuotes({ onStartTraining }: PrebuiltEmptyStateProps = {}) {
  return (
    <EmptyState
      icon={FileText}
      title="No quotes yet"
      description="Create professional quotes to win more jobs."
      action={{ label: 'Create Quote', href: '/quotes/new' }}
      courseId="quotes-invoices"
      learnButtonText="Learn about quotes"
      onStartTraining={onStartTraining}
    />
  );
}
