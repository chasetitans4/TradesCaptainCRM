'use client';

import { AlertCircle, RefreshCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AdminErrorAlertProps {
  /** Error message to display */
  message: string;
  /** Title for the error (optional) */
  title?: string;
  /** Variant of the error alert */
  variant?: 'error' | 'warning' | 'info';
  /** Callback for retry action */
  onRetry?: () => void;
  /** Callback for dismiss action */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
}

const variantStyles = {
  error: {
    container: 'bg-destructive/10 border-destructive/30',
    icon: 'text-destructive',
    title: 'text-destructive',
    message: 'text-destructive/90',
  },
  warning: {
    container: 'bg-yellow-500/10 border-yellow-500/30',
    icon: 'text-yellow-600 dark:text-yellow-400',
    title: 'text-yellow-700 dark:text-yellow-300',
    message: 'text-yellow-600 dark:text-yellow-400',
  },
  info: {
    container: 'bg-blue-500/10 border-blue-500/30',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-700 dark:text-blue-300',
    message: 'text-blue-600 dark:text-blue-400',
  },
};

export function AdminErrorAlert({
  message,
  title,
  variant = 'error',
  onRetry,
  onDismiss,
  className,
}: AdminErrorAlertProps) {
  const styles = variantStyles[variant];
  const Icon = variant === 'error' ? XCircle : AlertCircle;

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        styles.container,
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', styles.icon)} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className={cn('font-medium mb-1', styles.title)}>{title}</h3>
          )}
          <p className={cn('text-sm', styles.message)}>{message}</p>

          {(onRetry || onDismiss) && (
            <div className="flex items-center gap-2 mt-3">
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="gap-1.5"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Retry
                </Button>
              )}
              {onDismiss && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDismiss}
                >
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state component for when there's no data
 */
interface AdminEmptyStateProps {
  /** Main message */
  message: string;
  /** Description text */
  description?: string;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Additional CSS classes */
  className?: string;
}

export function AdminEmptyState({
  message,
  description,
  icon,
  action,
  className,
}: AdminEmptyStateProps) {
  return (
    <div className={cn('text-center py-12', className)}>
      {icon && (
        <div className="flex justify-center mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-foreground mb-1">{message}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
