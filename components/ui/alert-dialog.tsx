'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface AlertDialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AlertDialogContext = React.createContext<AlertDialogContextValue | undefined>(undefined);

function useAlertDialogContext() {
  const context = React.useContext(AlertDialogContext);
  if (!context) {
    throw new Error('AlertDialog components must be used within an AlertDialog');
  }
  return context;
}

export function AlertDialog({ open: controlledOpen, onOpenChange, children }: AlertDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  }, [isControlled, onOpenChange]);

  return (
    <AlertDialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      {children}
    </AlertDialogContext.Provider>
  );
}

export function AlertDialogTrigger({ children, asChild, className }: {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}) {
  const { onOpenChange } = useAlertDialogContext();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
      onClick: () => onOpenChange(true),
    });
  }

  return (
    <button type="button" className={className} onClick={() => onOpenChange(true)}>
      {children}
    </button>
  );
}

export function AlertDialogContent({ children, className }: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open, onOpenChange } = useAlertDialogContext();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay with fade animation */}
      <div
        className="fixed inset-0 bg-black/50 animate-in fade-in-0 duration-200"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Content with scale + fade animation */}
      <div
        role="alertdialog"
        aria-modal="true"
        className={cn(
          'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4',
          'border bg-background p-6 shadow-lg sm:rounded-lg',
          'animate-in fade-in-0 zoom-in-95 duration-200'
        )}
      >
        <div className={cn('grid gap-4', className)}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function AlertDialogHeader({ children, className }: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)}>
      {children}
    </div>
  );
}

export function AlertDialogFooter({ children, className }: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}>
      {children}
    </div>
  );
}

export function AlertDialogTitle({ children, className }: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn('text-lg font-semibold', className)}>
      {children}
    </h2>
  );
}

export function AlertDialogDescription({ children, className }: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </p>
  );
}

export function AlertDialogAction({ children, onClick, className, disabled }: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  const { onOpenChange } = useAlertDialogContext();

  return (
    <Button
      className={className}
      disabled={disabled}
      onClick={() => {
        onClick?.();
        onOpenChange(false);
      }}
    >
      {children}
    </Button>
  );
}

export function AlertDialogCancel({ children, className, disabled }: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { onOpenChange } = useAlertDialogContext();

  return (
    <Button
      variant="outline"
      className={className}
      disabled={disabled}
      onClick={() => onOpenChange(false)}
    >
      {children}
    </Button>
  );
}
