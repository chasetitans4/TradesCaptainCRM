'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Wrench } from 'lucide-react';

interface HeaderProps {
  showLogo?: boolean;
}

export function Header({
  showLogo = true,
}: HeaderProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>('/trades-captain-logo.png');

  // Fetch platform logo on mount
  useEffect(() => {
    if (!showLogo) return;

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
  }, [showLogo]);

  return (
    <header className="sticky top-0 z-40 h-16 bg-white dark:bg-white border-b border-gray-200 dark:border-gray-200">
      <div className="h-full px-4 lg:px-6 flex items-center justify-center">
        {/* Centered Logo */}
        {showLogo && (
          <Link href="/dashboard" className="flex items-center">
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt="Logo"
                className="h-10 sm:h-12 lg:h-14 w-auto max-w-[200px] sm:max-w-[280px] lg:max-w-[320px] object-contain"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/trades-captain-logo.png'; }}
              />
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary-400 to-primary-600 flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-tight">TRADES</span>
                  <span className="font-bold text-sm -mt-0.5 bg-gradient-to-r from-secondary-400 to-primary-500 bg-clip-text text-transparent">
                    Captain
                  </span>
                </div>
              </div>
            )}
          </Link>
        )}
      </div>
    </header>
  );
}
