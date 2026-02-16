'use client';

import { useState, useEffect } from 'react';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [platformName, setPlatformName] = useState('Trades Captain');

  useEffect(() => {
    async function fetchPlatformBranding() {
      try {
        const res = await fetch('/api/admin/platform-settings');
        if (!res.ok) return;
        const data = await res.json();
        if (data.settings?.platform_branding?.logo_url) {
          setLogoUrl(data.settings.platform_branding.logo_url);
        }
        if (data.settings?.platform_branding?.name) {
          setPlatformName(data.settings.platform_branding.name);
        }
      } catch {
        // Use default branding
      }
    }
    fetchPlatformBranding();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Logo Header */}
      <header className="flex justify-center py-6">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={platformName}
            className="h-10 w-auto max-w-[200px] object-contain"
          />
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">TC</span>
            </div>
            <span className="text-xl font-semibold text-text">{platformName}</span>
          </div>
        )}
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col px-4 pb-8 max-w-md mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
