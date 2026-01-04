'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Command,
  Pause,
  Play,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { NotificationCenter, useNotifications, MOCK_NOTIFICATIONS } from './notification-center';

interface HeaderProps {
  userName?: string;
  userEmail?: string;
  userRole?: string;
  userInitials?: string;
  userAvatar?: string;
  onSignOut?: () => void;
  showPauseToggle?: boolean;
}

export function Header({
  userName = 'User',
  userEmail = 'user@example.com',
  userRole = 'Owner',
  userInitials = 'U',
  userAvatar,
  onSignOut,
  showPauseToggle = false,
}: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoadingPause, setIsLoadingPause] = useState(false);
  const { toast } = useToast();

  // Fetch current pause state on mount
  useEffect(() => {
    if (!showPauseToggle) return;

    async function fetchPauseState() {
      try {
        const res = await fetch('/api/leads-captain/v2/config');
        const data = await res.json();
        if (data.config) {
          setIsPaused(data.config.global_mode === 'paused');
        }
      } catch (error) {
        console.error('Failed to fetch pause state:', error);
      }
    }
    fetchPauseState();
  }, [showPauseToggle]);

  // Toggle pause state
  const handleTogglePause = async () => {
    setIsLoadingPause(true);
    try {
      const newMode = isPaused ? 'normal' : 'paused';
      const res = await fetch('/api/leads-captain/v2/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ global_mode: newMode }),
      });

      if (!res.ok) throw new Error('Failed to update');

      setIsPaused(!isPaused);
      toast({
        title: isPaused ? 'Automation resumed' : 'Automation paused',
        description: isPaused
          ? 'Leads Captain is now active and will respond to messages.'
          : 'Leads Captain is paused. No automated responses will be sent.',
      });
    } catch (error) {
      console.error('Failed to toggle pause:', error);
      toast({
        title: 'Error',
        description: 'Failed to update automation status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPause(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 h-16 bg-background/80 backdrop-blur-xl border-b">
        <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-4">
          {/* Search */}
          <div className="flex-1 max-w-xl" data-tour="header-search">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center gap-3 h-10 px-4 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
            >
              <Search className="w-4 h-4" />
              <span className="flex-1 text-left text-sm">Search anything...</span>
              <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs bg-background rounded-md border">
                <Command className="w-3 h-3" />K
              </kbd>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Quick Create */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Create</span>
                  <ChevronDown className="w-3 h-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/customers/new">New Customer</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/jobs/new">New Job</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/leads/new">New Lead</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/quotes/new">New Quote</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/invoices/new">New Invoice</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Global Pause Toggle - Kill Switch */}
            {showPauseToggle && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleTogglePause}
                disabled={isLoadingPause}
                className={isPaused ? 'text-warning' : ''}
                title={isPaused ? 'Automation is paused. Click to resume.' : 'Click to pause all automation'}
              >
                {isPaused ? (
                  <Play className="w-5 h-5" />
                ) : (
                  <Pause className="w-5 h-5" />
                )}
              </Button>
            )}

            {/* Notifications - using the new NotificationCenter component */}
            <NotificationCenter
              notifications={MOCK_NOTIFICATIONS}
              loading={false}
            />

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-muted transition-colors" data-tour="header-profile">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={userAvatar} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium">{userName}</p>
                    <p className="text-xs text-muted-foreground">{userRole}</p>
                  </div>
                  <ChevronDown className="hidden md:block w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{userName}</p>
                  <p className="text-xs text-muted-foreground">{userEmail}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onSignOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  );
}
