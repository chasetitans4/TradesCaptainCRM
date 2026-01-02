'use client';

import { useState } from 'react';
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
  Calendar,
  MessageSquare,
  Truck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BottomSheet } from '@/components/mobile/bottom-sheet';

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
  color?: string;
}

const defaultActions: QuickAction[] = [
  { label: 'New Job', href: '/jobs/new', icon: Briefcase, color: 'bg-blue-100 text-blue-600' },
  { label: 'New Customer', href: '/customers/new', icon: Users, color: 'bg-green-100 text-green-600' },
  { label: 'New Lead', href: '/leads/new', icon: UserPlus, color: 'bg-purple-100 text-purple-600' },
  { label: 'New Quote', href: '/quotes/new', icon: FileText, color: 'bg-orange-100 text-orange-600' },
  { label: 'New Invoice', href: '/invoices/new', icon: Receipt, color: 'bg-emerald-100 text-emerald-600' },
  { label: 'Schedule', href: '/calendar', icon: Calendar, color: 'bg-pink-100 text-pink-600' },
  { label: 'Reminder', href: '/reminders/new', icon: Bell, color: 'bg-yellow-100 text-yellow-600' },
  { label: 'Log Call', href: '/calls/new', icon: Phone, color: 'bg-cyan-100 text-cyan-600' },
  { label: 'Dispatch', href: '/dispatch', icon: Truck, color: 'bg-indigo-100 text-indigo-600' },
];

interface QuickActionSheetProps {
  actions?: QuickAction[];
  triggerClassName?: string;
}

/**
 * Quick action sheet for the top bar
 *
 * Opens a bottom sheet with a 3-column grid of quick actions
 * for creating new entities throughout the app.
 */
export function QuickActionSheet({
  actions = defaultActions,
  triggerClassName,
}: QuickActionSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        <Plus className="w-5 h-5" />
      </Button>

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title="Quick Actions"
        description="Create new items or navigate quickly"
      >
        <div className="grid grid-cols-3 gap-3">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl',
                'transition-colors active:scale-95',
                'hover:bg-muted'
              )}
            >
              <div className={cn('p-3 rounded-xl', action.color || 'bg-primary/10 text-primary')}>
                <action.icon className="h-6 w-6" />
              </div>
              <span className="text-xs font-medium text-center">{action.label}</span>
            </Link>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}

/**
 * Inline quick actions grid (no sheet)
 * Use when you want to display quick actions directly on a page
 */
interface QuickActionsGridProps {
  actions?: QuickAction[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function QuickActionsGrid({
  actions = defaultActions.slice(0, 6),
  columns = 3,
  className,
}: QuickActionsGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };

  return (
    <div className={cn('grid gap-3', gridCols[columns], className)}>
      {actions.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={cn(
            'flex flex-col items-center gap-2 p-4 rounded-xl',
            'transition-colors active:scale-95',
            'hover:bg-muted bg-background border'
          )}
        >
          <div className={cn('p-3 rounded-xl', action.color || 'bg-primary/10 text-primary')}>
            <action.icon className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium text-center">{action.label}</span>
        </Link>
      ))}
    </div>
  );
}
