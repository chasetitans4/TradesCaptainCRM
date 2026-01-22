'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield,
  UserPlus,
  BarChart3,
  Globe,
  DollarSign,
  Target,
  Ticket,
  PhoneCall,
  Book,
  MessageCircle,
  ClipboardList,
  Lightbulb,
  HeadphonesIcon,
  Tag,
  TrendingUp,
  Keyboard,
} from 'lucide-react';
import { useAdminKeyboardShortcuts } from '@/hooks/useAdminKeyboardShortcuts';
import { AdminKeyboardShortcutsHelp } from '@/components/admin/keyboard-shortcuts-help';
import { ErrorBoundary } from '@/components/error-boundary';
import { logger } from '@/lib/logger';
const adminPortalLogger = logger.child({ context: 'admin.portal.layout' });

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'agent' | 'support' | 'finance';
}

const managementNav = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'CRM Accounts', href: '/admin/accounts', icon: Building2 },
  { name: 'Web Customers', href: '/admin/web-customers', icon: Globe },
  { name: 'Sales Leads', href: '/admin/leads', icon: Target },
  { name: 'Commissions', href: '/admin/commissions', icon: DollarSign },
  { name: 'Agents', href: '/admin/agents', icon: Users },
  { name: 'Agent Performance', href: '/admin/agent-performance', icon: TrendingUp },
  { name: 'Coupons', href: '/admin/coupons', icon: Ticket },
  { name: 'Retention', href: '/admin/retention', icon: PhoneCall },
  { name: 'Revenue Recovery', href: '/admin/revenue-recovery', icon: BarChart3 },
  { name: 'Submissions', href: '/admin/submissions', icon: FileText },
  { name: 'Client Onboarding', href: '/admin/client-onboarding', icon: ClipboardList },
  { name: 'Pricing', href: '/admin/pricing', icon: Tag },
  { name: 'Offers', href: '/admin/offers', icon: DollarSign },
  { name: 'Feature Requests', href: '/admin/feature-requests', icon: Lightbulb },
  { name: 'Support Tickets', href: '/admin/tickets', icon: HeadphonesIcon },
  { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
];

const agentNav = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'My Leads', href: '/admin/leads', icon: Target },
  { name: 'Commissions', href: '/admin/commissions', icon: DollarSign },
  { name: 'Retention Tasks', href: '/admin/retention', icon: PhoneCall },
  { name: 'Coupons', href: '/admin/coupons', icon: Ticket },
  { name: 'Sales Playbook', href: '/admin/sales-playbook', icon: Book },
  { name: 'Support Templates', href: '/admin/support-templates', icon: MessageCircle },
  { name: 'Agent Performance', href: '/admin/agent-performance', icon: TrendingUp },
];

export default function AdminPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Keyboard shortcuts
  const { showHelp, setShowHelp } = useAdminKeyboardShortcuts({
    enabled: pathname !== '/admin/login',
  });

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/admin/login') {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/auth/me', {
          credentials: 'include',
        });

        if (!isMounted) return;

        if (!res.ok) {
          router.replace('/admin/login');
          return;
        }
        const data = await res.json();
        if (isMounted) {
          setAdmin(data.user);
          setLoading(false);
        }
      } catch (error) {
        if (!isMounted) return;
        adminPortalLogger.error({
          msg: 'Auth check error',
          error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
        });
        router.replace('/admin/login');
      }
    }

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [router, pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (error) {
      adminPortalLogger.error({
        msg: 'Logout error',
        error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
      case 'admin':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
      case 'agent':
        return 'bg-green-500/10 text-green-600 dark:text-green-400';
      case 'support':
        return 'bg-muted text-muted-foreground';
      case 'finance':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Show login page without layout
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center">
          <Shield className="w-12 h-12 text-primary mb-4" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        role="navigation"
        aria-label="Admin navigation"
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-black border-r border-border/10 transform transition-transform duration-200 ease-in-out lg:translate-x-0 flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" aria-hidden="true" />
            <span className="text-white font-bold">Admin Portal</span>
          </div>
          <button
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain pt-4 pb-6 px-2 touch-pan-y" aria-label="Main navigation">
          {(admin && ['super_admin', 'admin', 'finance'].includes(admin.role) ? managementNav : agentNav).map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => setSidebarOpen(false)}
                aria-current={isActive ? 'page' : undefined}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions - Fixed at Bottom */}
        <div className="flex-shrink-0 p-4 border-t border-white/10">
          <div className="space-y-2">
            <Link
              href="/admin/submissions/new-trial"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              New Trial Submission
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              className="lg:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex-1" />

            {/* Keyboard shortcuts button */}
            <button
              onClick={() => setShowHelp(true)}
              className="hidden sm:flex items-center gap-1.5 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors mr-2"
              aria-label="Show keyboard shortcuts"
            >
              <Keyboard className="h-4 w-4" />
              <kbd className="hidden lg:inline text-xs px-1.5 py-0.5 rounded bg-muted border border-border font-mono">?</kbd>
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                aria-haspopup="true"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {admin.full_name?.charAt(0) || admin.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-foreground">
                    {admin.full_name || admin.email}
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadgeColor(admin.role)}`}>
                    {admin.role.replace('_', ' ')}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-popover rounded-lg shadow-lg border border-border z-50">
                    <div className="py-1">
                      <Link
                        href="/admin/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                      <button
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>

      {/* Keyboard Shortcuts Help Dialog */}
      <AdminKeyboardShortcutsHelp open={showHelp} onOpenChange={setShowHelp} />
    </div>
  );
}
