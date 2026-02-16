import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  // Base styles with improved press feedback (active:scale-95 for tactile feel)
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary-dark shadow-sm',
        primary: 'bg-primary text-white hover:bg-primary-dark shadow-sm', // alias for default
        destructive: 'bg-danger text-white hover:bg-danger/90 shadow-sm',
        danger: 'bg-danger text-white hover:bg-danger/90 shadow-sm', // alias for destructive
        outline: 'border border-border bg-background hover:bg-muted hover:text-primary',
        secondary: 'bg-muted text-text hover:bg-muted/80',
        ghost: 'hover:bg-muted hover:text-primary active:scale-100',
        link: 'text-primary underline-offset-4 hover:underline active:scale-100',
        success: 'bg-success text-white hover:bg-success/90 shadow-sm',
        warning: 'bg-warning text-white hover:bg-warning/90 shadow-sm',
      },
      size: {
        // Default and lg already meet 44px minimum (h-12 = 48px, h-14 = 56px)
        default: 'h-12 px-4 py-2',
        // sm size now ensures minimum 44px touch target on mobile
        sm: 'h-10 rounded-md px-3 min-h-[44px] md:min-h-0',
        lg: 'h-14 rounded-lg px-8',
        // Icon sizes enforce 44px minimum for touch accessibility
        icon: 'h-12 w-12 min-h-[44px] min-w-[44px]',
        'icon-sm': 'h-10 w-10 min-h-[44px] min-w-[44px]',
        // Explicit touch-friendly size for mobile contexts
        touch: 'h-11 min-h-[44px] min-w-[44px] px-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
