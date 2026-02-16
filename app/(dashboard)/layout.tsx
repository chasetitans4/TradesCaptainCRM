'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getCurrentUserProfile } from '@/lib/supabase/client';
import type { UserWithBusiness } from '@/types';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { useKeyboardShortcuts } from '@/lib/hooks/use-keyboard-shortcuts';
import { prefetchRoutes, CRITICAL_ROUTES, SECONDARY_ROUTES } from '@/lib/performance';
// InteractiveTour removed - consolidated into unified training system
import { logger } from '@/lib/logger';
import { BusinessThemeProvider } from '@/lib/contexts/business-theme-context';
import { ErrorBoundary } from '@/components/error-boundary';
import { OfflineProvider } from '@/lib/offline/context';
import { OfflineIndicator } from '@/components/offline/offline-indicator';
import { TrainingProvider, TrainingOverlay } from '@/components/training';
import { AIAssistantProvider } from '@/lib/contexts/ai-assistant-context';
import { NavigationProvider } from '@/lib/navigation';

// Dynamic imports for non-critical components (loaded after initial render)
const CommandPalette = dynamic(
  () => import('@/components/ui/command-palette').then((mod) => mod.CommandPalette),
  { ssr: false, loading: () => null }
);

const KeyboardShortcutsDialog = dynamic(
  () => import('@/components/ui/keyboard-shortcuts-dialog').then((mod) => mod.KeyboardShortcutsDialog),
  { ssr: false, loading: () => null }
);

const AIAssistantWidget = dynamic(
  () => import('@/components/ai-assistant').then((mod) => mod.AIAssistantWidget),
  { ssr: false, loading: () => null }
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const dashboardLayoutLogger = logger.child({ context: 'dashboard.layout' });

  // Initialize keyboard shortcuts
  useKeyboardShortcuts({
    onToggleShortcutsHelp: () => setShortcutsOpen(true),
    onNewCustomer: () => router.push('/customers/new'),
    enabled: !loading,
  });

  useEffect(() => {
    async function loadUser() {
      try {
        const profile = await getCurrentUserProfile();

        if (!profile) {
          router.push('/login');
          return;
        }

        // Check if onboarding is needed
        if (!profile.business?.onboarding_completed) {
          router.push('/onboarding');
          return;
        }

        setUser(profile as UserWithBusiness);

        // Prefetch critical routes after user loads
        prefetchRoutes(router, CRITICAL_ROUTES, 100);
        // Prefetch secondary routes after a delay
        prefetchRoutes(router, SECONDARY_ROUTES, 3000);
      } catch (error) {
        dashboardLayoutLogger.error({
          msg: 'Error loading user',
          error: error instanceof Error ? error.message : String(error),
          pathname,
        });
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          {/* Optimized loading spinner */}
          <div className="w-12 h-12 rounded-lg mb-4 bg-primary/20 animate-pulse" />
          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <OfflineProvider autoInitialize syncInterval={5 * 60 * 1000}>
      <BusinessThemeProvider
        primaryColor={user.business?.primary_color || '#1D4ED8'}
        secondaryColor={user.business?.secondary_color || '#0369A1'}
      >
        <AIAssistantProvider>
        <NavigationProvider>
        <TrainingProvider userId={user.id} businessId={user.business_id}>
        <div className="min-h-screen bg-muted/30 overflow-x-hidden">
        {/* Desktop Sidebar */}
        <Sidebar
          className="hidden lg:flex"
          businessName={user.business?.name || 'Your Business'}
          planName={user.business?.subscription_tier || 'Free'}
        />

        {/* Mobile Navigation */}
        <MobileNav
          className="lg:hidden"
          businessName={user.business?.name}
          planName={user.business?.subscription_tier}
        />

        {/* Main Content Area */}
        <div className="lg:pl-64">
          {/* Desktop Header - hidden on mobile since MobileNav handles top bar */}
          <div className="hidden lg:block bg-white dark:bg-white">
            <Header />
          </div>
          <main className="p-4 lg:p-6 pb-20 lg:pb-6 min-h-[calc(100vh-4rem)] overflow-y-auto animate-fade-in">
            <ErrorBoundary>
              <Suspense fallback={
                <div className="animate-pulse space-y-4">
                  <div className="h-8 w-48 bg-muted rounded" />
                  <div className="h-64 w-full bg-muted rounded-xl" />
                </div>
              }>
                {children}
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>

        {/* Lazy loaded components - not critical for initial render */}
        <Suspense fallback={null}>
          <CommandPalette />
        </Suspense>

        <Suspense fallback={null}>
          <KeyboardShortcutsDialog
            open={shortcutsOpen}
            onOpenChange={setShortcutsOpen}
          />
        </Suspense>

        {/* AI Assistant Chat Bubble */}
        <Suspense fallback={null}>
          <AIAssistantWidget />
        </Suspense>

        {/* Training handled by TrainingOverlay via ContextualTrainingPrompt on dashboard page */}

        {/* Offline Status Indicator */}
        <OfflineIndicator position="bottom" />
        </div>

        {/* Guided Training System Overlay */}
        <TrainingOverlay />
        </TrainingProvider>
        </NavigationProvider>
        </AIAssistantProvider>
      </BusinessThemeProvider>
    </OfflineProvider>
  );
}
