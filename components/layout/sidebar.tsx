'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  Phone,
  Send,
  GitBranch,
} from 'lucide-react';

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Customers',
    href: '/customers',
    icon: Users,
  },
  {
    name: 'Jobs',
    href: '/jobs',
    icon: Briefcase,
    badge: '3',
  },
  {
    name: 'Leads',
    href: '/leads',
    icon: UserPlus,
    badge: '12',
    badgeColor: 'bg-secondary',
  },
  {
    name: 'Dispatch',
    href: '/dispatch',
    icon: Truck,
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
    name: 'Reports',
    href: '/reports',
    icon: BarChart3,
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

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 flex flex-col',
        'bg-gradient-to-b from-dark-800 to-dark-900 text-white',
        className
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center">
          <Image src="/bluehq-logo.svg" alt="BLUE HQ" width={120} height={32} />
        </Link>
      </div>

      {/* Business Selector */}
      <div className="px-3 py-4 border-b border-white/10">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
          <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary-300" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium truncate">{businessName}</p>
            <p className="text-xs text-gray-400">{planName}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navigation.map((item) => {
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
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary text-white'
                          : 'text-gray-300 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="flex-1 text-left">{item.name}</span>
                      <ChevronDown
                        className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')}
                      />
                    </button>

                    {expanded && (
                      <ul className="mt-1 ml-4 pl-4 border-l border-white/10 space-y-1">
                        {item.children.map((child) => (
                          <li key={child.name}>
                            <Link
                              href={child.href}
                              className={cn(
                                'block px-3 py-2 rounded-lg text-sm transition-colors',
                                pathname === child.href
                                  ? 'bg-white/10 text-white'
                                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
                              )}
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
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary text-white'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1">{item.name}</span>
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
                  </Link>
                )}
              </li>
            );
          })}
        </ul>

        {/* Admin Section */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <p className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Administration
          </p>
          <ul className="space-y-1">
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
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      hasActiveChild
                        ? 'bg-primary/20 text-primary-300'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <section.icon className="w-5 h-5 flex-shrink-0" />
                    <span className="flex-1 text-left">{section.name}</span>
                    <ChevronDown
                      className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')}
                    />
                  </button>

                  {expanded && (
                    <ul className="mt-1 ml-4 pl-4 border-l border-white/10 space-y-1">
                      {section.children.map((child) => (
                        <li key={child.name}>
                          <Link
                            href={child.href}
                            className={cn(
                              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                              pathname.startsWith(child.href)
                                ? 'bg-white/10 text-white'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            )}
                          >
                            <child.icon className="w-4 h-4" />
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
        <ul className="space-y-1">
          {bottomNavigation.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  pathname.startsWith(item.href)
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>

        {/* AI Assistant Promo */}
        <div className="mt-4 p-3 rounded-xl bg-gradient-to-br from-secondary-400/10 to-primary-600/10 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-secondary-400" />
            <span className="text-sm font-medium">AI Assistant</span>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Let AI handle your customer messages automatically.
          </p>
          <button className="w-full py-2 px-3 text-xs font-medium bg-gradient-to-r from-secondary-400/20 to-primary-600/20 hover:from-secondary-400/30 hover:to-primary-600/30 rounded-lg transition-colors border border-white/10">
            Try it free
          </button>
        </div>
      </div>
    </aside>
  );
}
