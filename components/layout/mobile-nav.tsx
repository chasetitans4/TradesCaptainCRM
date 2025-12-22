'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Calendar,
  Menu,
  Plus,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './sidebar';

const mobileNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
];

interface MobileNavProps {
  className?: string;
  businessName?: string;
  planName?: string;
}

export function MobileNav({ className, businessName, planName }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Top Bar */}
      <div className={cn('fixed top-0 inset-x-0 z-50 h-14 bg-background border-b', className)}>
        <div className="h-full px-4 flex items-center justify-between">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <Sidebar
                className="relative w-full"
                businessName={businessName}
                planName={planName}
              />
            </SheetContent>
          </Sheet>

          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary-400 to-primary-600 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs tracking-tight">TRADES</span>
              <span className="font-bold text-xs -mt-0.5 bg-gradient-to-r from-secondary-400 to-primary-500 bg-clip-text text-transparent">
                Captain
              </span>
            </div>
          </Link>

          <Button size="icon" variant="ghost" asChild>
            <Link href="/jobs/new">
              <Plus className="w-5 h-5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <div
        className={cn(
          'fixed bottom-0 inset-x-0 z-50 bg-background border-t safe-area-pb',
          className
        )}
      >
        <nav className="h-16 flex items-center justify-around px-2">
          {mobileNav.map((item) => {
            const active = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <item.icon className={cn('w-5 h-5', active && 'text-primary')} />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Spacers */}
      <div className="h-14" /> {/* Top spacer */}
    </>
  );
}
