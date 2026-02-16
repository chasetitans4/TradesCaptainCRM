'use client';

import { useState, useEffect } from 'react';
import { useTodayJobCount } from '@/hooks/useTodayJobCount';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  Calendar,
  MessageSquare,
  BarChart3,
  Settings,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Receipt,
  UserPlus,
  Building2,
  Truck,
  Shield,
  PhoneCall,
  Target,
  ClipboardList,
  MessageCircle,
  FileBarChart,
  Headphones,
  DollarSign,
  Clock,
  Megaphone,
  Package,
  Zap,
  Camera,
  Star,
  Bell,
  Phone,
  Wallet,
  FileCheck,
  type LucideIcon,
} from 'lucide-react';

// Type definitions for navigation structure
interface NavChild {
  name: string;
  href: string;
  icon?: LucideIcon;
}

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: string;
  children?: NavChild[];
}

interface NavGroup {
  id: string;
  label: string | null;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  items: NavItem[];
}

// Navigation structure with collapsible groups for progressive disclosure
const navigationGroups: NavGroup[] = [
  {
    id: 'core',
    label: null, // No label for core items - always visible
    items: [
      {
        name: 'My Day',
        href: '/my-day',
        icon: Zap,
      },
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        name: 'Calendar',
        href: '/calendar',
        icon: Calendar,
      },
      {
        name: 'Messages',
        href: '/messages',
        icon: MessageSquare,
        badge: '5',
        badgeColor: 'bg-destructive',
      },
    ],
  },
  {
    id: 'work',
    label: 'Work',
    collapsible: true,
    defaultExpanded: true,
    items: [
      {
        name: 'Jobs',
        href: '/jobs',
        icon: Briefcase,
        badge: '3',
      },
      {
        name: 'Customers',
        href: '/customers',
        icon: Users,
      },
      {
        name: 'Dispatch',
        href: '/dispatch',
        icon: Truck,
      },
      {
        name: 'Quotes & Invoices',
        href: '/quotes',
        icon: Receipt,
        children: [
          { name: 'Quotes', href: '/quotes' },
          { name: 'Invoices', href: '/invoices' },
        ],
      },
      {
        name: 'Inventory',
        href: '/inventory',
        icon: Package,
      },
      {
        name: 'Proof of Work',
        href: '/settings/proof-of-work',
        icon: Camera,
      },
    ],
  },
  {
    id: 'communication',
    label: 'Communication',
    collapsible: true,
    defaultExpanded: false,
    items: [
      {
        name: 'Voice',
        href: '/voice',
        icon: Phone,
        children: [
          { name: 'Call Log', href: '/calls' },
          { name: 'Voice Settings', href: '/settings/voice' },
        ],
      },
      {
        name: 'Follow-ups',
        href: '/follow-ups',
        icon: Bell,
      },
      {
        name: 'Reminders',
        href: '/reminders',
        icon: Clock,
      },
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    collapsible: true,
    defaultExpanded: false,
    items: [
      {
        name: 'Leads',
        href: '/leads',
        icon: UserPlus,
        badge: '12',
        badgeColor: 'bg-secondary',
      },
      {
        name: 'Leads Captain',
        href: '/leads-captain',
        icon: PhoneCall,
        badge: 'v2',
        badgeColor: 'bg-primary',
        children: [
          { name: 'Dashboard', href: '/leads-captain' },
          { name: 'Conversations', href: '/leads-captain/conversations' },
          { name: 'Rules', href: '/leads-captain/rules' },
          { name: 'Templates', href: '/leads-captain/templates' },
          { name: 'Approvals', href: '/leads-captain/approvals' },
          { name: 'Analytics', href: '/leads-captain/analytics' },
          { name: 'Settings', href: '/leads-captain/settings' },
        ],
      },
      {
        name: 'Outreach',
        href: '/outreach',
        icon: Megaphone,
        badge: 'NEW',
        badgeColor: 'bg-secondary',
        children: [
          { name: 'Dashboard', href: '/outreach' },
          { name: 'Calls', href: '/outreach/calls' },
          { name: 'Contacts', href: '/outreach/contacts' },
          { name: 'Campaigns', href: '/outreach/campaigns' },
        ],
      },
      {
        name: 'Reviews',
        href: '/reviews',
        icon: Star,
        children: [
          { name: 'Reviews', href: '/reviews' },
          { name: 'Reputation', href: '/settings/reputation' },
        ],
      },
      {
        name: 'Reports',
        href: '/reports',
        icon: BarChart3,
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    collapsible: true,
    defaultExpanded: false,
    items: [
      {
        name: 'Timesheets',
        href: '/timesheets',
        icon: Clock,
      },
      {
        name: 'Expenses',
        href: '/expenses',
        icon: Wallet,
      },
      {
        name: 'Receipts',
        href: '/receipts',
        icon: FileCheck,
      },
    ],
  },
];

const adminNavigation = [
  {
    name: 'Admin',
    icon: Shield,
    children: [
      { name: 'Leads Captain', href: '/admin/leads-captain', icon: PhoneCall },
      { name: 'Pipeline', href: '/admin/pipeline', icon: Target },
      { name: 'Onboarding', href: '/admin/onboarding', icon: ClipboardList },
      { name: 'SMS Usage', href: '/admin/sms-usage', icon: MessageCircle },
      { name: 'Reports', href: '/admin/reports', icon: FileBarChart },
      { name: 'Support', href: '/admin/support', icon: Headphones },
      { name: 'Expenses', href: '/admin/expenses', icon: DollarSign },
      { name: 'Timesheets', href: '/admin/timesheets', icon: Clock },
    ],
  },
];

const bottomNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help & Support', href: '/help', icon: HelpCircle },
];

interface SidebarProps {
  className?: string;
  businessName?: string;
  planName?: string;
}

export function Sidebar({ className, businessName = 'Your Business', planName = 'Pro Plan' }: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['core', 'work']);
  const todayJobCount = useTodayJobCount();
  const [logoUrl, setLogoUrl] = useState<string>('/trades-captain-logo.png');

  // Dynamic badge overrides
  const getDynamicBadge = (itemName: string) => {
    if (itemName === 'My Day' && todayJobCount !== null && todayJobCount > 0) {
      return { badge: String(todayJobCount), badgeColor: 'bg-primary text-primary-foreground' };
    }
    return null;
  };

  useEffect(() => {
    fetch('/api/admin/platform-settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings?.platform_branding?.logo_url) {
          setLogoUrl(data.settings.platform_branding.logo_url);
        }
      })
      .catch(err => console.error('Failed to fetch logo', err));
  }, []);

  // Auto-expand groups that contain active items
  useEffect(() => {
    navigationGroups.forEach((group) => {
      const hasActiveItem = group.items.some(
        (item) => pathname.startsWith(item.href) ||
          item.children?.some((child) => pathname === child.href)
      );
      if (hasActiveItem && !expandedGroups.includes(group.id)) {
        setExpandedGroups((prev) => [...prev, group.id]);
      }
    });
  }, [pathname]);

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  // Generate data-tour attribute for nav items
  const getTourId = (name: string) => {
    const tourMap: Record<string, string> = {
      'Dashboard': 'nav-dashboard',
      'Calendar': 'nav-calendar',
      'Messages': 'nav-messages',
      'Jobs': 'nav-jobs',
      'Customers': 'nav-customers',
      'Dispatch': 'nav-dispatch',
      'Leads': 'nav-leads',
      'Leads Captain': 'nav-leads-captain',
      'Reports': 'nav-reports',
      'Proof of Work': 'nav-proof-of-work',
      'Voice': 'nav-voice',
      'Timesheets': 'nav-timesheets',
      'Reviews': 'nav-reviews',
    };
    return tourMap[name];
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-white dark:bg-white',
        className
      )}
      role="navigation"
      aria-label="Main navigation"
      data-training="sidebar"
    >
      {/* Logo — white background extends to top of viewport */}
      <div className="h-16 flex items-center justify-center px-6 border-b border-gray-200 bg-white dark:bg-white">
        <Link href="/dashboard" className="flex items-center justify-center w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt="Trades Captain"
            className="h-12 w-auto max-w-full object-contain"
            onError={(e) => { e.currentTarget.src = '/trades-captain-logo.png'; }}
          />
        </Link>
      </div>

      {/* Dark content area below logo */}
      <div className="flex-1 flex flex-col bg-gradient-to-b from-dark-800 to-dark-900 text-white min-h-0">

      {/* Business Selector */}
      <div className="px-3 py-4 border-b border-white/10">
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors min-h-[44px]"
          aria-label={`Current business: ${businessName}`}
          aria-haspopup="listbox"
        >
          <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary-300" aria-hidden="true" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium truncate">{businessName}</p>
            <p className="text-xs text-gray-400">{planName}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide py-4 px-3" aria-label="Primary navigation">
        {navigationGroups.map((group) => {
          const isGroupExpanded = expandedGroups.includes(group.id);
          const hasActiveItem = group.items.some(
            (item) => isActive(item.href) ||
              item.children?.some((child) => pathname === child.href)
          );

          return (
            <div key={group.id} className="mb-4">
              {/* Group Header (if has label) */}
              {group.label && (
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 mb-2 text-xs font-semibold uppercase tracking-wider transition-colors',
                    hasActiveItem ? 'text-gray-300' : 'text-gray-500 hover:text-gray-400'
                  )}
                  aria-expanded={isGroupExpanded}
                  aria-controls={`nav-group-${group.id}`}
                >
                  <ChevronRight
                    className={cn(
                      'w-3 h-3 transition-transform',
                      isGroupExpanded && 'rotate-90'
                    )}
                    aria-hidden="true"
                  />
                  {group.label}
                  {!isGroupExpanded && hasActiveItem && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
                  )}
                </button>
              )}

              {/* Group Items */}
              {(isGroupExpanded || !group.label) && (
                <ul
                  id={group.label ? `nav-group-${group.id}` : undefined}
                  className="space-y-1"
                  role="list"
                >
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    const expanded = expandedItems.includes(item.name);
                    const hasChildren = item.children && item.children.length > 0;

                    return (
                      <li key={item.name}>
                        {hasChildren ? (
                          <>
                            <button
                              onClick={() => toggleExpand(item.name)}
                              className={cn(
                                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                                active
                                  ? 'bg-primary text-white'
                                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
                              )}
                              aria-expanded={expanded}
                              aria-controls={`submenu-${item.name.replace(/\s+/g, '-')}`}
                              data-training={getTourId(item.name)}
                            >
                              <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                              <span className="flex-1 text-left">{item.name}</span>
                              {item.badge && (
                                <span
                                  className={cn(
                                    'px-2 py-0.5 text-xs font-medium rounded-full',
                                    item.badgeColor || 'bg-white/20'
                                  )}
                                >
                                  {item.badge}
                                </span>
                              )}
                              <ChevronDown
                                className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')}
                                aria-hidden="true"
                              />
                            </button>

                            {expanded && item.children && (
                              <ul
                                id={`submenu-${item.name.replace(/\s+/g, '-')}`}
                                className="mt-1 ml-4 pl-4 border-l border-white/10 space-y-1"
                                role="list"
                              >
                                {item.children.map((child) => (
                                  <li key={child.name}>
                                    <Link
                                      href={child.href}
                                      className={cn(
                                        'block px-3 py-2 rounded-lg text-sm transition-colors min-h-[40px] flex items-center',
                                        pathname === child.href
                                          ? 'bg-white/10 text-white'
                                          : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                      )}
                                      aria-current={pathname === child.href ? 'page' : undefined}
                                    >
                                      {child.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </>
                        ) : (
                          <Link
                            href={item.href}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                              active
                                ? 'bg-primary text-white'
                                : 'text-gray-300 hover:bg-white/10 hover:text-white'
                            )}
                            aria-current={active ? 'page' : undefined}
                            data-training={getTourId(item.name)}
                          >
                            <item.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                            <span className="flex-1">{item.name}</span>
                            {(() => {
                              const dynamic = getDynamicBadge(item.name);
                              const badgeText = dynamic?.badge || item.badge;
                              const badgeColor = dynamic?.badgeColor || item.badgeColor || 'bg-white/20';
                              if (!badgeText) return null;
                              return (
                                <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', badgeColor)}>
                                  {badgeText}
                                </span>
                              );
                            })()}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}

        {/* Admin Section */}
        <div className="mt-2 pt-4 border-t border-white/10">
          <ul className="space-y-1" role="list">
            {adminNavigation.map((section) => {
              const expanded = expandedItems.includes(section.name);
              const hasActiveChild = section.children.some((child) =>
                pathname.startsWith(child.href)
              );

              return (
                <li key={section.name}>
                  <button
                    onClick={() => toggleExpand(section.name)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                      hasActiveChild
                        ? 'bg-primary/20 text-primary-300'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    )}
                    aria-expanded={expanded}
                    aria-controls="admin-submenu"
                  >
                    <section.icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    <span className="flex-1 text-left">{section.name}</span>
                    <ChevronDown
                      className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')}
                      aria-hidden="true"
                    />
                  </button>

                  {expanded && (
                    <ul
                      id="admin-submenu"
                      className="mt-1 ml-4 pl-4 border-l border-white/10 space-y-1"
                      role="list"
                    >
                      {section.children.map((child) => (
                        <li key={child.name}>
                          <Link
                            href={child.href}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors min-h-[40px]',
                              pathname.startsWith(child.href)
                                ? 'bg-white/10 text-white'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            )}
                            aria-current={pathname.startsWith(child.href) ? 'page' : undefined}
                          >
                            <child.icon className="w-4 h-4" aria-hidden="true" />
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="p-3 border-t border-white/10">
        <ul className="space-y-1" role="list">
          {bottomNavigation.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors min-h-[44px]',
                  pathname.startsWith(item.href)
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                )}
                aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
              >
                <item.icon className="w-5 h-5" aria-hidden="true" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>

        {/* AI Assistant Promo */}
        <div className="mt-4 p-3 rounded-xl bg-gradient-to-br from-secondary-400/10 to-primary-600/10 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-secondary-400" aria-hidden="true" />
            <span className="text-sm font-medium">AI Assistant</span>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Let AI handle your customer messages automatically.
          </p>
          <button className="w-full py-2 px-3 text-xs font-medium bg-gradient-to-r from-secondary-400/20 to-primary-600/20 hover:from-secondary-400/30 hover:to-primary-600/30 rounded-lg transition-colors border border-white/10 min-h-[36px]">
            Try it free
          </button>
        </div>
      </div>
      </div>{/* end dark content area */}
    </aside>
  );
}
