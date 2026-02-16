import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  errorMessage?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, errorMessage, id, ...props }, ref) => {
    // Generate unique ID for error message association (must call unconditionally)
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const hasError = error || !!errorMessage;

    return (
      <div className="relative w-full">
        <input
          id={inputId}
          type={type}
          aria-invalid={hasError ? 'true' : undefined}
          aria-describedby={hasError && errorMessage ? errorId : undefined}
          className={cn(
            'flex h-12 w-full rounded-lg border bg-background px-4 py-2 text-base transition-colors',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-text-muted',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            hasError
              ? 'border-destructive focus-visible:ring-destructive'
              : 'border-border',
            className
          )}
          ref={ref}
          {...props}
        />
        {hasError && errorMessage && (
          <p
            id={errorId}
            className="mt-1.5 text-sm text-destructive"
            role="alert"
          >
            {errorMessage}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
