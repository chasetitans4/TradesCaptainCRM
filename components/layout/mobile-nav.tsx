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
  Zap,
  Sun,
  Inbox,
  Heart,
  UsersRound,
  Camera,
  Phone,
  Star,
  Wallet,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar } from './sidebar';
import { BottomSheet } from '@/components/mobile/bottom-sheet';

/**
 * Mobile bottom navigation - 5-tab structure per Product Constitution v2.0
 * Today | Schedule | Jobs | Inbox | More
 */
const mobileNav = [
  { name: 'Today', href: '/my-day', icon: Sun },
  { name: 'Schedule', href: '/calendar', icon: Calendar },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Inbox', href: '/messages', icon: Inbox },
];

/**
 * More menu - features accessible via More tab
 * Per Product Constitution: Business Health, Team, Customers, Reports, Settings, Help
 */
const secondaryNav = [
  { name: 'Business Health', href: '/dashboard', icon: Heart },
  { name: 'Team', href: '/team', icon: UsersRound },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Leads', href: '/leads', icon: UserPlus },
  { name: 'Quotes', href: '/quotes', icon: FileText },
  { name: 'Invoices', href: '/invoices', icon: Receipt },
  { name: 'Proof of Work', href: '/settings/proof-of-work', icon: Camera },
  { name: 'Voice', href: '/voice', icon: Phone },
  { name: 'Reviews', href: '/reviews', icon: Star },
  { name: 'Timesheets', href: '/timesheets', icon: Clock },
  { name: 'Expenses', href: '/expenses', icon: Wallet },
  { name: 'Follow-ups', href: '/follow-ups', icon: Bell },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Dispatch', href: '/dispatch', icon: Truck },
];

const utilityNav = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help & Training', href: '/help', icon: HelpCircle },
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
    '/dashboard': 'Business Health',
    '/my-day': 'Today',
    '/jobs': 'Jobs',
    '/customers': 'Customers',
    '/team': 'Team',
    '/calendar': 'Schedule',
    '/messages': 'Inbox',
    '/leads': 'Leads',
    '/invoices': 'Invoices',
    '/quotes': 'Quotes',
    '/reports': 'Reports',
    '/dispatch': 'Dispatch',
    '/settings': 'Settings',
    '/help': 'Help & Training',
    '/follow-ups': 'Follow-ups',
    '/promotions': 'Promotions',
    '/settings/proof-of-work': 'Proof of Work',
    '/voice': 'Voice',
    '/calls': 'Call Log',
    '/reviews': 'Reviews',
    '/timesheets': 'Timesheets',
    '/expenses': 'Expenses',
    '/receipts': 'Receipts',
    '/reminders': 'Reminders',
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
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // Fetch platform logo on mount
  useEffect(() => {
    async function fetchPlatformLogo() {
      try {
        const res = await fetch('/api/platform/branding');
        if (!res.ok) return;
        const data = await res.json();
        if (data.branding?.logo_url) {
          setLogoUrl(data.branding.logo_url);
        }
      } catch (error) {
        console.error('Failed to fetch platform logo:', error);
      }
    }
    fetchPlatformLogo();
  }, []);

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
      <div className={cn('fixed top-0 inset-x-0 z-50 h-14 bg-white border-b', className)}>
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

          {/* Centered Logo */}
          <Link href="/dashboard" className="flex items-center justify-center flex-1">
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt="Logo"
                className="h-10 w-auto max-w-[200px] object-contain"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/trades-captain-logo.png'; }}
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-secondary-400 to-primary-600 flex items-center justify-center">
                  <Wrench className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xs tracking-tight">TRADES</span>
                  <span className="font-bold text-xs -mt-0.5 bg-gradient-to-r from-secondary-400 to-primary-500 bg-clip-text text-transparent">
                    Captain
                  </span>
                </div>
              </div>
            )}
          </Link>

          {/* Spacer to balance hamburger menu */}
          <div className="w-10" />
        </div>
      </div>

      {/* Bottom Tab Bar */}
      <div
        className={cn(
          'fixed bottom-0 inset-x-0 z-[60] bg-background border-t safe-area-pb',
          className
        )}
      >
        <nav className="h-16 flex items-center justify-around px-2">
          {mobileNav.map((item) => {
            // Active if exact match, or prefix match for nested routes (except for root routes)
            const active = pathname === item.href ||
              (item.href !== '/my-day' && item.href !== '/messages' && pathname.startsWith(item.href));

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
