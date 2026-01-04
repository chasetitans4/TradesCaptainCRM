'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
}

const DialogContext = React.createContext<DialogContextValue | undefined>(undefined);

function useDialog() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog components must be used within a Dialog');
  }
  return context;
}

interface DialogProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}

export function Dialog({ children, open: controlledOpen, onOpenChange, defaultOpen = false }: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const dialogId = React.useId();
  const titleId = `${dialogId}-title`;
  const descriptionId = `${dialogId}-description`;

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback((newOpen: boolean) => {
    if (!isControlled) {
      setUncontrolledOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  }, [isControlled, onOpenChange]);

  return (
    <DialogContext.Provider value={{ open, setOpen, titleId, descriptionId }}>
      {children}
    </DialogContext.Provider>
  );
}

interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ children, asChild, onClick, ...props }, ref) => {
    const { setOpen } = useDialog();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      setOpen(true);
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        onClick: handleClick,
      });
    }

    return (
      <button ref={ref} onClick={handleClick} {...props}>
        {children}
      </button>
    );
  }
);
DialogTrigger.displayName = 'DialogTrigger';

// Focus trap utility
function useFocusTrap(containerRef: React.RefObject<HTMLElement | null>, enabled: boolean) {
  const previousActiveElement = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!enabled || !containerRef.current) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Get all focusable elements within the container
    const getFocusableElements = () => {
      if (!containerRef.current) return [];
      const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      return Array.from(containerRef.current.querySelectorAll<HTMLElement>(selector))
        .filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
    };

    // Focus the first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    // Handle Tab key to trap focus
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) return;

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if on first element, go to last
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if on last element, go to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to previously focused element
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus();
      }
    };
  }, [enabled, containerRef]);
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onEscapeKeyDown?: (e: KeyboardEvent) => void;
  onPointerDownOutside?: (e: MouseEvent) => void;
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, onEscapeKeyDown, onPointerDownOutside, ...props }, ref) => {
    const { open, setOpen, titleId, descriptionId } = useDialog();
    const contentRef = React.useRef<HTMLDivElement>(null);

    // Apply focus trap when dialog is open
    useFocusTrap(contentRef, open);

    React.useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onEscapeKeyDown?.(e);
          if (!e.defaultPrevented) {
            setOpen(false);
          }
        }
      };

      const handlePointerDown = (e: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
          onPointerDownOutside?.(e);
          if (!e.defaultPrevented) {
            setOpen(false);
          }
        }
      };

      if (open) {
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('pointerdown', handlePointerDown);
        document.body.style.overflow = 'hidden';
      }

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('pointerdown', handlePointerDown);
        document.body.style.overflow = '';
      };
    }, [open, setOpen, onEscapeKeyDown, onPointerDownOutside]);

    if (!open) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        role="presentation"
      >
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <div
          ref={(node) => {
            (contentRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          className={cn(
            'relative z-50 w-full max-w-lg bg-card rounded-lg shadow-lg p-6',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            className
          )}
          {...props}
        >
          {children}
          <button
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={() => setOpen(false)}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
      </div>
    );
  }
);
DialogContent.displayName = 'DialogContent';

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
      {...props}
    />
  );
}

export const DialogTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    const { titleId } = useDialog();
    return (
      <h2
        ref={ref}
        id={titleId}
        className={cn('text-lg font-semibold leading-none tracking-tight', className)}
        {...props}
      />
    );
  }
);
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    const { descriptionId } = useDialog();
    return (
      <p
        ref={ref}
        id={descriptionId}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
      />
    );
  }
);
DialogDescription.displayName = 'DialogDescription';

export function DialogClose({ children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = useDialog();

  return (
    <button
      className={className}
      onClick={() => setOpen(false)}
      {...props}
    >
      {children}
    </button>
  );
}
