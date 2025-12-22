'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  Receipt,
  Wrench,
  Settings,
  LogOut,
  Menu,
  X,
  Phone,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface BusinessInfo {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  primary_color?: string;
}

interface CustomerInfo {
  id: string;
  name: string;
  email?: string;
}

const navItems = [
  { href: '', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/appointments', icon: Calendar, label: 'Appointments' },
  { href: '/invoices', icon: Receipt, label: 'Invoices & Payments' },
  { href: '/quotes', icon: FileText, label: 'Quotes' },
  { href: '/equipment', icon: Wrench, label: 'My Equipment' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const businessId = params.businessId as string;

  const [business, setBusiness] = useState<BusinessInfo | null>(null);
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function loadPortalData() {
      try {
        const response = await fetch(`/api/portal/session?businessId=${businessId}`);
        const data = await response.json();

        if (!response.ok || !data.customer) {
          router.push(`/portal/${businessId}/login`);
          return;
        }

        setBusiness(data.business);
        setCustomer(data.customer);
      } catch (error) {
        console.error('Error loading portal data:', error);
        router.push(`/portal/${businessId}/login`);
      } finally {
        setLoading(false);
      }
    }

    if (pathname === `/portal/${businessId}/login`) {
      setLoading(false);
      return;
    }

    loadPortalData();
  }, [businessId, router, pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout', businessId }),
      });
      router.push(`/portal/${businessId}/login`);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-primary/20 rounded-lg mb-4" />
          <div className="h-4 w-24 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!customer || !business) {
    return null;
  }

  const primaryColor = business.primary_color || '#2563eb';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          {/* Logo */}
          <div className="flex items-center gap-3 h-16 px-6 border-b border-gray-200">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.name}
                className="h-8 object-contain"
              />
            ) : (
              <Image src="/bluehq-logo.svg" alt="BLUE HQ" width={96} height={32} />
            )}
            <span className="font-semibold text-gray-900 truncate">
              {business.name}
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
            {navItems.map((item) => {
              const href = `/portal/${businessId}${item.href}`;
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Contact Info */}
          {(business.phone || business.email) && (
            <div className="px-4 py-4 border-t border-gray-200">
              <p className="text-xs font-medium text-gray-500 mb-2">Need help?</p>
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-1"
                >
                  <Phone className="h-4 w-4" />
                  {business.phone}
                </a>
              )}
              {business.email && (
                <a
                  href={`mailto:${business.email}`}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <Mail className="h-4 w-4" />
                  {business.email}
                </a>
              )}
            </div>
          )}

          {/* User */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: primaryColor }}
              >
                {customer.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {customer.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{customer.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            {business.logo_url ? (
              <img
                src={business.logo_url}
                alt={business.name}
                className="h-8 object-contain"
              />
            ) : (
              <Image src="/bluehq-logo.svg" alt="BLUE HQ" width={96} height={32} />
            )}
            <span className="font-semibold text-gray-900">{business.name}</span>
          </div>

          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {customer.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {customer.name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">{customer.email}</p>
                  </div>
                </div>

                <nav className="flex-1 space-y-1">
                  {navItems.map((item) => {
                    const href = `/portal/${businessId}${item.href}`;
                    return (
                      <Link
                        key={item.href}
                        href={href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                          'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>

                {/* Contact Info */}
                {(business.phone || business.email) && (
                  <div className="py-4 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-2">
                      Need help?
                    </p>
                    {business.phone && (
                      <a
                        href={`tel:${business.phone}`}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-1"
                      >
                        <Phone className="h-4 w-4" />
                        {business.phone}
                      </a>
                    )}
                    {business.email && (
                      <a
                        href={`mailto:${business.email}`}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                      >
                        <Mail className="h-4 w-4" />
                        {business.email}
                      </a>
                    )}
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full justify-start mt-4"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="py-6 px-4 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
