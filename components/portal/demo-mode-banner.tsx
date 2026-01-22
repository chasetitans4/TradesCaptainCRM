'use client';

import { useState, useEffect } from 'react';
import { FlaskConical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isDemoMode, isDemoBannerDismissed, dismissDemoBanner, disableDemoMode } from '@/lib/portal/demo-data';

interface DemoModeBannerProps {
  onClearDemoData?: () => void;
}

export function DemoModeBanner({ onClearDemoData }: DemoModeBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Only show if demo mode is active and banner hasn't been dismissed this session
    if (isDemoMode() && !isDemoBannerDismissed()) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    dismissDemoBanner();
    setIsVisible(false);
  };

  const handleClearData = () => {
    disableDemoMode();
    setIsVisible(false);
    if (onClearDemoData) {
      onClearDemoData();
    } else {
      // Refresh the page to clear demo data from view
      window.location.reload();
    }
  };

  // Don't render anything until mounted (to avoid hydration mismatch)
  if (!mounted || !isVisible) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-amber-800">
          <FlaskConical className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium">DEMO MODE</span>
          <span className="text-sm text-amber-700 hidden sm:inline">
            — Viewing sample data for demonstration
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearData}
            className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 h-7 px-2 text-xs"
          >
            Clear Demo Data
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 h-7 w-7"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
