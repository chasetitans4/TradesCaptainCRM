'use client';

import { useState, useEffect } from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [logoUrl, setLogoUrl] = useState<string>('/trades-captain-logo.png');

  useEffect(() => {
    async function fetchPlatformLogo() {
      try {
        const res = await fetch('/api/admin/platform-settings');
        if (!res.ok) return;
        const data = await res.json();
        if (data.settings?.platform_branding?.logo_url) {
          setLogoUrl(data.settings.platform_branding.logo_url);
        }
      } catch {
        // Use default logo
      }
    }
    fetchPlatformLogo();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="flex justify-center py-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt="Trades Captain"
          className="h-16 sm:h-20 w-auto max-w-[320px] object-contain"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/trades-captain-logo.png'; }}
        />
      </header>

      <main className="flex-1 flex flex-col px-4 pb-8">
        {children}
      </main>
    </div>
  );
}
