'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Home,
  MessageCircle,
  Calendar,
  Receipt,
  Menu,
  FileText,
} from 'lucide-react';

interface MobileBottomNavProps {
  businessId: string;
  onMenuClick: () => void;
  primaryColor?: string;
}

// Reorganized nav: Home, Schedule, Messages, Invoices, Menu
// This order prioritizes most common actions in the center (thumb-friendly zone)
const navItems = [
  { href: '', icon: Home, label: 'Home' },
  { href: '/appointments', icon: Calendar, label: 'Schedule' },
  { href: '/messages', icon: MessageCircle, label: 'Messages' },
  { href: '/invoices', icon: Receipt, label: 'Invoices' },
];

export function MobileBottomNav({ businessId, onMenuClick, primaryColor = '#2563eb' }: MobileBottomNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    const fullPath = `/portal/${businessId}${href}`;
    if (href === '') {
      // Match both dashboard and home pages
      return pathname === `/portal/${businessId}` ||
             pathname === `/portal/${businessId}/` ||
             pathname === `/portal/${businessId}/home`;
    }
    return pathname?.startsWith(fullPath);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200">
      {/* Safe area padding for devices with home indicator */}
      <div className="flex items-center justify-around h-[4.5rem] px-1 pb-safe">
        {navItems.map((item) => {
          const href = `/portal/${businessId}${item.href}`;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full min-w-[56px] py-2 transition-colors touch-manipulation',
                active ? 'text-blue-600' : 'text-gray-500 active:text-gray-700'
              )}
              style={active ? { color: primaryColor } : undefined}
            >
              <div className={cn(
                'relative p-1.5 rounded-xl transition-all',
                active && 'bg-blue-50'
              )}
              style={active ? { backgroundColor: `${primaryColor}15` } : undefined}
              >
                <item.icon className={cn(
                  'h-6 w-6 transition-all',
                  active && 'stroke-[2.25]'
                )} />
              </div>
              <span className={cn(
                'text-[11px] mt-0.5 leading-tight',
                active ? 'font-semibold' : 'font-normal'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* More Menu Button */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center flex-1 h-full min-w-[56px] py-2 text-gray-500 active:text-gray-700 transition-colors touch-manipulation"
        >
          <div className="p-1.5">
            <Menu className="h-6 w-6" />
          </div>
          <span className="text-[11px] mt-0.5 font-normal leading-tight">More</span>
        </button>
      </div>
    </nav>
  );
}
