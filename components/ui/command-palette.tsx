'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Drawer } from 'vaul';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  UserPlus,
  Calendar,
  MessageSquare,
  Receipt,
  Settings,
  Plus,
  Search,
  Phone,
  Clock,
  FileText,
  Truck,
  DollarSign,
  Loader2,
  X,
} from 'lucide-react';

const navigationItems = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    href: '/dashboard',
    keywords: ['home', 'overview'],
  },
  {
    icon: Users,
    label: 'Customers',
    href: '/customers',
    keywords: ['clients', 'contacts'],
  },
  {
    icon: Briefcase,
    label: 'Jobs',
    href: '/jobs',
    keywords: ['work', 'service', 'appointments'],
  },
  {
    icon: UserPlus,
    label: 'Leads',
    href: '/leads',
    keywords: ['prospects', 'new'],
  },
  {
    icon: Calendar,
    label: 'Calendar',
    href: '/calendar',
    keywords: ['schedule', 'dates'],
  },
  {
    icon: MessageSquare,
    label: 'Messages',
    href: '/messages',
    keywords: ['sms', 'chat', 'text'],
  },
  {
    icon: Phone,
    label: 'Calls',
    href: '/calls',
    keywords: ['phone', 'call log'],
  },
  {
    icon: Receipt,
    label: 'Invoices',
    href: '/invoices',
    keywords: ['billing', 'payments'],
  },
  {
    icon: FileText,
    label: 'Quotes',
    href: '/quotes',
    keywords: ['estimates', 'proposals'],
  },
  {
    icon: Truck,
    label: 'Dispatch',
    href: '/dispatch',
    keywords: ['routing', 'assign'],
  },
  {
    icon: Clock,
    label: 'Timesheets',
    href: '/timesheets',
    keywords: ['time', 'hours', 'clock'],
  },
  {
    icon: Settings,
    label: 'Settings',
    href: '/settings',
    keywords: ['preferences', 'config'],
  },
];

const actionItems = [
  {
    icon: Plus,
    label: 'New Customer',
    href: '/customers/new',
    keywords: ['add', 'create'],
  },
  {
    icon: Plus,
    label: 'New Job',
    href: '/jobs/new',
    keywords: ['add', 'create', 'schedule'],
  },
  {
    icon: Plus,
    label: 'New Lead',
    href: '/leads/new',
    keywords: ['add', 'create'],
  },
  {
    icon: Plus,
    label: 'New Invoice',
    href: '/invoices/new',
    keywords: ['add', 'create', 'bill'],
  },
  {
    icon: Plus,
    label: 'New Quote',
    href: '/quotes/new',
    keywords: ['add', 'create', 'estimate'],
  },
  {
    icon: Phone,
    label: 'Log Call',
    href: '/calls/new',
    keywords: ['add', 'create', 'phone'],
  },
];

interface SearchResult {
  type: 'customer' | 'job' | 'lead' | 'invoice';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

// Hook to detect mobile viewport
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const isMobile = useIsMobile();

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!search || search.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(search)}&limit=5`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.results || []);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      setSearch('');
      setSearchResults([]);
      router.push(href);
    },
    [router]
  );

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'customer':
        return Users;
      case 'job':
        return Briefcase;
      case 'lead':
        return UserPlus;
      case 'invoice':
        return Receipt;
      default:
        return Search;
    }
  };

  const getResultBadgeColor = (type: string) => {
    switch (type) {
      case 'customer':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'job':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'lead':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      case 'invoice':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Shared command content
  const commandContent = (
    <Command className="rounded-lg border-none">
      <CommandInput
        placeholder="Search or type a command..."
        value={search}
        onValueChange={setSearch}
        className={cn(isMobile && 'h-12 text-base')}
      />
      <CommandList className={cn(isMobile && 'max-h-[calc(100vh-180px)]')}>
        <CommandEmpty>
          {searching ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
            </div>
          ) : (
            'No results found.'
          )}
        </CommandEmpty>

        {/* Dynamic Search Results */}
        {searchResults.length > 0 && (
          <>
            <CommandGroup heading="Search Results">
              {searchResults.map((result) => {
                const Icon = getResultIcon(result.type);
                return (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    onSelect={() => handleSelect(result.href)}
                    className={cn('gap-3', isMobile && 'py-3 min-h-[48px]')}
                  >
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{result.title}</p>
                      {result.subtitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </p>
                      )}
                    </div>
                    <Badge className={getResultBadgeColor(result.type)}>
                      {result.type}
                    </Badge>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Quick Actions (show when not searching) */}
        {!search && (
          <CommandGroup heading="Quick Actions">
            {actionItems.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => handleSelect(item.href)}
                className={cn('gap-2', isMobile && 'py-3 min-h-[48px]')}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.href}
              onSelect={() => handleSelect(item.href)}
              className={cn('gap-2', isMobile && 'py-3 min-h-[48px]')}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  // Mobile: Full-screen drawer from bottom
  if (isMobile) {
    return (
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mt-24 flex h-[85vh] flex-col rounded-t-2xl bg-background safe-area-pb">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <Drawer.Title className="text-lg font-semibold">
                Search
              </Drawer.Title>
              <button
                onClick={() => setOpen(false)}
                className="p-2 -mr-2 rounded-lg hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {commandContent}
            </div>

            {/* Mobile hint */}
            <div className="border-t px-4 py-3 text-center text-xs text-muted-foreground">
              Tap to navigate or search for customers, jobs, and more
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  // Desktop: Centered dialog
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 max-w-xl overflow-hidden">
        {commandContent}

        {/* Keyboard shortcut hint */}
        <div className="border-t px-3 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">esc</kbd>
              close
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">⌘K</kbd>
            to open
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
