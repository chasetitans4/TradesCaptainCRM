'use client';

import { useState, useEffect, useCallback } from 'react';
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
  MoreHorizontal,
  MessageSquare,
  FileText,
  Receipt,
  UserPlus,
  BarChart3,
  Truck,
  Settings,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './sidebar';
import { BottomSheet } from '@/components/mobile/bottom-sheet';

const mobileNav = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
];

const secondaryNav = [
  { name: 'Messages', href: '/messages', icon: MessageSquare, badge: true },
  { name: 'Leads', href: '/leads', icon: UserPlus },
  { name: 'Invoices', href: '/invoices', icon: Receipt },
  { name: 'Quotes', href: '/quotes', icon: FileText },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Dispatch', href: '/dispatch', icon: Truck },
];

const utilityNav = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help', href: '/help', icon: HelpCircle },
];

const RECENT_PAGES_KEY = 'trades-captain-recent-pages';
const MAX_RECENT_PAGES = 3;

interface RecentPage {
  name: string;
  href: string;
  timestamp: number;
}

function getPageName(pathname: string): string {
  const routes: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/jobs': 'Jobs',
    '/customers': 'Customers',
    '/calendar': 'Calendar',
    '/messages': 'Messages',
    '/leads': 'Leads',
    '/invoices': 'Invoices',
    '/quotes': 'Quotes',
    '/reports': 'Reports',
    '/dispatch': 'Dispatch',
    '/settings': 'Settings',
    '/help': 'Help',
    '/follow-ups': 'Follow-ups',
    '/promotions': 'Promotions',
  };

  if (routes[pathname]) return routes[pathname];

  if (pathname.startsWith('/jobs/')) return 'Job Details';
  if (pathname.startsWith('/customers/')) return 'Customer Details';
  if (pathname.startsWith('/invoices/')) return 'Invoice Details';
  if (pathname.startsWith('/quotes/')) return 'Quote Details';
  if (pathname.startsWith('/leads/')) return 'Lead Details';

  return pathname.split('/').pop()?.replace(/-/g, ' ') || 'Page';
}

interface MobileNavProps {
  className?: string;
  businessName?: string;
  planName?: string;
}

export function MobileNav({ className, businessName, planName }: MobileNavProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [recentPages, setRecentPages] = useState<RecentPage[]>([]);

  // Load recent pages from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_PAGES_KEY);
      if (stored) {
        setRecentPages(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Track page visits
  useEffect(() => {
    // Don't track main nav pages or the current page if it's in secondary nav
    const isMainNav = mobileNav.some((item) => item.href === pathname);
    if (isMainNav || pathname === '/') return;

    const pageName = getPageName(pathname);
    const newPage: RecentPage = {
      name: pageName,
      href: pathname,
      timestamp: Date.now(),
    };

    setRecentPages((prev) => {
      // Remove duplicates and add new page
      const filtered = prev.filter((p) => p.href !== pathname);
      const updated = [newPage, ...filtered].slice(0, MAX_RECENT_PAGES);

      // Save to localStorage
      try {
        localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }

      return updated;
    });
  }, [pathname]);

  const handleMoreItemClick = useCallback(() => {
    setMoreSheetOpen(false);
  }, []);

  return (
    <>
      {/* Top Bar */}
      <div className={cn('fixed top-0 inset-x-0 z-50 h-14 bg-background border-b', className)}>
        <div className="h-full px-4 flex items-center justify-between">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
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
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <item.icon className={cn('w-5 h-5', active && 'text-primary')} />
                <span className="text-xs font-medium">{item.name}</span>
              </Link>
            );
          })}

          {/* More Tab */}
          <button
            onClick={() => setMoreSheetOpen(true)}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]',
              moreSheetOpen ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <MoreHorizontal className={cn('w-5 h-5', moreSheetOpen && 'text-primary')} />
            <span className="text-xs font-medium">More</span>
          </button>
        </nav>
      </div>

      {/* More Bottom Sheet */}
      <BottomSheet
        open={moreSheetOpen}
        onOpenChange={setMoreSheetOpen}
        title="More"
      >
        <div className="space-y-6">
          {/* Recently Visited */}
          {recentPages.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Recently Visited
                </span>
              </div>
              <div className="space-y-1">
                {recentPages.map((page) => (
                  <Link
                    key={page.href}
                    href={page.href}
                    onClick={handleMoreItemClick}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <span className="text-sm font-medium">{page.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Main Features */}
          <div>
            <span className="text-sm font-medium text-muted-foreground mb-3 block">
              Features
            </span>
            <div className="grid grid-cols-3 gap-2">
              {secondaryNav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={handleMoreItemClick}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl transition-colors relative',
                      isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                    )}
                  >
                    <item.icon className="w-6 h-6" />
                    <span className="text-xs font-medium">{item.name}</span>
                    {item.badge && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Utility Links */}
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-2">
              {utilityNav.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={handleMoreItemClick}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <item.icon className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{item.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </BottomSheet>

      {/* Spacers */}
      <div className="h-14" /> {/* Top spacer */}
    </>
  );
}
