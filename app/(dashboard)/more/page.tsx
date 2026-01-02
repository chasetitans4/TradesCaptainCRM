'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUserProfile, signOut } from '@/lib/supabase/client';
import { hasPermission, type Permission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { UserWithBusiness } from '@/types';
import {
  Users,
  Briefcase,
  FileText,
  DollarSign,
  BarChart3,
  Settings,
  HelpCircle,
  Bell,
  MessageSquare,
  Calendar,
  CreditCard,
  UserPlus,
  Bot,
  Mail,
  LogOut,
  ChevronRight,
  Building2,
  Phone,
} from 'lucide-react';

interface MenuItem {
  href: string;
  label: string;
  description: string;
  icon: React.ElementType;
  permission?: Permission;
  badge?: string;
}

const MENU_SECTIONS: {
  title: string;
  items: MenuItem[];
}[] = [
  {
    title: 'CRM',
    items: [
      {
        href: '/customers',
        label: 'Customers',
        description: 'View all customers',
        icon: Users,
        permission: 'view_customers',
      },
      {
        href: '/leads',
        label: 'Leads',
        description: 'Manage leads pipeline',
        icon: Users,
        permission: 'view_leads',
      },
      {
        href: '/jobs',
        label: 'Jobs',
        description: 'Scheduled and active jobs',
        icon: Briefcase,
      },
      {
        href: '/reminders',
        label: 'Reminders',
        description: 'Personal task reminders',
        icon: Bell,
      },
    ],
  },
  {
    title: 'Documents',
    items: [
      {
        href: '/quotes',
        label: 'Quotes',
        description: 'Create and manage quotes',
        icon: FileText,
        permission: 'view_quotes',
      },
      {
        href: '/invoices',
        label: 'Invoices',
        description: 'Billing and payments',
        icon: DollarSign,
        permission: 'view_invoices',
      },
    ],
  },
  {
    title: 'Communication',
    items: [
      {
        href: '/messages',
        label: 'Messages',
        description: 'SMS conversations',
        icon: MessageSquare,
        permission: 'view_messages',
      },
      {
        href: '/calls',
        label: 'Call Log',
        description: 'Log and track calls',
        icon: Phone,
        permission: 'log_calls',
      },
    ],
  },
  {
    title: 'Business',
    items: [
      {
        href: '/reports',
        label: 'Reports',
        description: 'Business analytics',
        icon: BarChart3,
        permission: 'view_reports',
      },
      {
        href: '/settings/team',
        label: 'Team',
        description: 'Manage team members',
        icon: UserPlus,
        permission: 'manage_team',
      },
      {
        href: '/calendar',
        label: 'Calendar',
        description: 'Schedule overview',
        icon: Calendar,
      },
    ],
  },
  {
    title: 'Settings',
    items: [
      {
        href: '/settings',
        label: 'Settings',
        description: 'Account and preferences',
        icon: Settings,
      },
      {
        href: '/settings',
        label: 'Business Profile',
        description: 'Company information',
        icon: Building2,
        permission: 'manage_settings',
      },
      {
        href: '/settings/ai-sms',
        label: 'AI SMS Settings',
        description: 'Automated responses',
        icon: Bot,
        permission: 'manage_ai_sms',
        badge: 'Pro',
      },
      {
        href: '/settings',
        label: 'Email Alerts',
        description: 'Notification recipients',
        icon: Mail,
        permission: 'manage_email_recipients',
      },
      {
        href: '/settings/billing',
        label: 'Billing',
        description: 'Subscription and payments',
        icon: CreditCard,
        permission: 'manage_billing',
      },
    ],
  },
  {
    title: 'Support',
    items: [
      {
        href: '/help',
        label: 'Help Center',
        description: '85+ help articles',
        icon: HelpCircle,
      },
    ],
  },
];

export default function MorePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile) {
        router.push('/login');
        return;
      }
      setUser(profile as UserWithBusiness);
      setLoading(false);
    }
    loadUser();
  }, [router]);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    router.push('/login');
  };

  if (loading || !user) {
    return <MorePageSkeleton />;
  }

  // Filter menu items based on permissions
  const filteredSections = MENU_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) => !item.permission || hasPermission(user.role, item.permission)
    ),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header with user info */}
      <header className="bg-primary text-white px-4 py-6">
        <Link href="/settings" className="flex items-center gap-4">
          <Avatar
            src={user.avatar_url || undefined}
            fallback={user.name?.charAt(0) || 'U'}
            size="lg"
            className="border-2 border-white/20"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{user.name}</h1>
            <p className="text-sm text-white/70">{user.email}</p>
            <Badge className="mt-1 bg-white/20 text-white border-0 capitalize">
              {user.role}
            </Badge>
          </div>
          <ChevronRight className="h-5 w-5 text-white/50" />
        </Link>

        {/* Business info */}
        <div className="mt-4 p-3 bg-white/10 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{user.business?.name}</p>
              <p className="text-sm text-white/70 capitalize">
                {user.business?.plan_tier || 'Pro'} Plan
              </p>
            </div>
            {hasPermission(user.role, 'manage_billing') && (
              <Link
                href="/settings/billing"
                className="text-sm text-white/70 hover:text-white"
              >
                Manage →
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Menu sections */}
      <div className="px-4 py-4 space-y-6">
        {filteredSections.map((section) => (
          <section key={section.title}>
            <h2 className="text-sm font-semibold text-text-muted mb-2 px-1">
              {section.title}
            </h2>
            <div className="card divide-y divide-border">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 active:bg-muted transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-text">{item.label}</p>
                        {item.badge && (
                          <Badge className="bg-primary/10 text-primary text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-text-muted">{item.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-text-muted" />
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

        {/* Sign out button */}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full card p-4 flex items-center gap-4 text-danger hover:bg-danger/5 active:bg-danger/10 transition-colors"
        >
          <div className="p-2 rounded-lg bg-danger/10">
            <LogOut className="h-5 w-5 text-danger" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium">{signingOut ? 'Signing out...' : 'Sign Out'}</p>
          </div>
        </button>

        {/* App version */}
        <p className="text-center text-xs text-text-muted py-4">
          Trades Captain CRM v1.0.0
        </p>
      </div>
    </div>
  );
}

function MorePageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary px-4 py-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 skeleton rounded-full bg-white/20" />
          <div className="flex-1">
            <div className="h-5 w-32 skeleton rounded bg-white/20 mb-2" />
            <div className="h-4 w-48 skeleton rounded bg-white/20" />
          </div>
        </div>
      </header>
      <div className="px-4 py-4 space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-4 w-16 skeleton rounded mb-2" />
            <div className="card">
              {[1, 2, 3].map((j) => (
                <div key={j} className="p-4 border-b border-border last:border-0">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 skeleton rounded-lg" />
                    <div className="flex-1">
                      <div className="h-4 w-24 skeleton rounded mb-1" />
                      <div className="h-3 w-32 skeleton rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
