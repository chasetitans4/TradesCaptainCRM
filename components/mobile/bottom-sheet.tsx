'use client';

import { Drawer } from 'vaul';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  children,
  title,
  description,
  className,
}: BottomSheetProps) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Drawer.Content
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50 mt-24 flex h-auto flex-col rounded-t-2xl bg-background',
            className
          )}
        >
          {/* Handle */}
          <div className="mx-auto mt-4 h-1.5 w-12 flex-shrink-0 rounded-full bg-muted" />

          {/* Header */}
          {(title || description) && (
            <div className="p-4 pb-0">
              {title && (
                <Drawer.Title className="text-lg font-semibold">
                  {title}
                </Drawer.Title>
              )}
              {description && (
                <Drawer.Description className="text-sm text-muted-foreground mt-1">
                  {description}
                </Drawer.Description>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-4 pb-8 overflow-y-auto overscroll-contain max-h-[85vh] touch-pan-y">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// Trigger component
export function BottomSheetTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  return <Drawer.Trigger asChild={asChild}>{children}</Drawer.Trigger>;
}
