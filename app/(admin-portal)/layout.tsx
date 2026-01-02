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
  Crown,
  BarChart3,
  Globe,
  DollarSign,
  Target,
  Ticket,
  PhoneCall,
  Book,
  MessageCircle,
  ClipboardList,
} from 'lucide-react';

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'agent' | 'support' | 'finance';
}

const managementNav = [
  { name: 'Dashboard', href: '/admin-portal', icon: LayoutDashboard },
  { name: 'CRM Accounts', href: '/admin-portal/accounts', icon: Building2 },
  { name: 'Web Customers', href: '/admin-portal/web-customers', icon: Globe },
  { name: 'Sales Leads', href: '/admin-portal/leads', icon: Target },
  { name: 'Commissions', href: '/admin-portal/commissions', icon: DollarSign },
  { name: 'Agents', href: '/admin-portal/agents', icon: Users },
  { name: 'Coupons', href: '/admin-portal/coupons', icon: Ticket },
  { name: 'Retention', href: '/admin-portal/retention', icon: PhoneCall },
  { name: 'Submissions', href: '/admin-portal/submissions', icon: FileText },
  { name: 'Founders Program', href: '/admin-portal/founders', icon: Crown },
  { name: 'Client Onboarding', href: '/admin-portal/client-onboarding', icon: ClipboardList },
  { name: 'Reports', href: '/admin-portal/reports', icon: BarChart3 },
];

const agentNav = [
  { name: 'Dashboard', href: '/admin-portal', icon: LayoutDashboard },
  { name: 'My Leads', href: '/admin-portal/leads', icon: Target },
  { name: 'Commissions', href: '/admin-portal/commissions', icon: DollarSign },
  { name: 'Retention Tasks', href: '/admin-portal/retention', icon: PhoneCall },
  { name: 'Coupons', href: '/admin-portal/coupons', icon: Ticket },
  { name: 'Sales Playbook', href: '/admin-portal/sales-playbook', icon: Book },
  { name: 'Support Templates', href: '/admin-portal/support-templates', icon: MessageCircle },
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

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/admin/me');
        if (!res.ok) {
          router.push('/admin-portal/login');
          return;
        }
        const data = await res.json();
        setAdmin(data.admin);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/admin-portal/login');
      } finally {
        setLoading(false);
      }
    }

    // Skip auth check for login page
    if (pathname === '/admin-portal/login') {
      setLoading(false);
      return;
    }

    checkAuth();
  }, [router, pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin-portal/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-700';
      case 'admin':
        return 'bg-blue-100 text-blue-700';
      case 'agent':
        return 'bg-green-100 text-green-700';
      case 'support':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Show login page without layout
  if (pathname === '/admin-portal/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-pulse flex flex-col items-center">
          <Shield className="w-12 h-12 text-primary mb-4" />
          <div className="h-4 w-32 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-white font-bold">Admin Portal</span>
          </div>
          <button
            className="lg:hidden text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-4 px-2">
          {(admin && ['super_admin', 'admin', 'finance'].includes(admin.role) ? managementNav : agentNav).map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin-portal' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          <div className="space-y-2">
            <Link
              href="/admin-portal/submissions/new-trial"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              New Trial Submission
            </Link>
            <Link
              href="/admin-portal/submissions/new-founders"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Crown className="h-4 w-4" />
              New Founders Submission
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              className="lg:hidden text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex-1" />

            {/* User menu */}
            <div className="relative">
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">
                    {admin.full_name?.charAt(0) || admin.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-sm font-medium text-gray-900">
                    {admin.full_name || admin.email}
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${getRoleBadgeColor(admin.role)}`}>
                    {admin.role.replace('_', ' ')}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <Link
                        href="/admin-portal/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </Link>
                      <button
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
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
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
