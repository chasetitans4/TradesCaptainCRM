'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { CallBackProps, Step, Styles } from 'react-joyride';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Check, HelpCircle } from 'lucide-react';

// Dynamic import to avoid SSR issues
const Joyride = dynamic(() => import('react-joyride'), { ssr: false });

// Tour IDs for different feature areas
export type TourId =
  | 'dashboard-intro'
  | 'customer-management'
  | 'job-scheduling'
  | 'messaging'
  | 'leads-captain';

// Tour step with metadata
interface TourStep extends Step {
  prerequisite?: string; // Feature that must be enabled
}

// Tour definitions organized by feature area
const TOURS: Record<TourId, TourStep[]> = {
  'dashboard-intro': [
    {
      target: '[data-tour="sidebar"]',
      content: 'Navigate your entire business from the sidebar. Everything you need is organized into easy-to-find sections.',
      title: 'Your Command Center',
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '[data-tour="header-search"]',
      content: 'Quickly find customers, jobs, or anything else. Press Cmd+K (or Ctrl+K) to open the command palette.',
      title: 'Quick Search',
      placement: 'bottom',
    },
    {
      target: '[data-tour="nav-customers"]',
      content: 'View and manage all your customers. Add notes, track job history, and never lose important details.',
      title: 'Customer Management',
      placement: 'right',
    },
    {
      target: '[data-tour="nav-jobs"]',
      content: 'Track every job from quote to completion. Schedule, assign technicians, and manage workflows.',
      title: 'Job Tracking',
      placement: 'right',
    },
    {
      target: '[data-tour="nav-calendar"]',
      content: 'See your schedule at a glance. Drag and drop to reschedule, and sync with your calendar.',
      title: 'Calendar View',
      placement: 'right',
    },
    {
      target: '[data-tour="header-profile"]',
      content: 'Access your settings, switch businesses, or sign out from the profile menu.',
      title: 'Your Profile',
      placement: 'bottom-end',
    },
  ],
  'customer-management': [
    {
      target: '[data-tour="customer-list"]',
      content: 'All your customers in one place. Use filters and search to find exactly who you need.',
      title: 'Customer List',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="customer-add"]',
      content: 'Add new customers quickly. We\'ll save their details for easy access later.',
      title: 'Add Customers',
      placement: 'left',
    },
    {
      target: '[data-tour="customer-filters"]',
      content: 'Filter by status, service type, or custom tags to organize your customer base.',
      title: 'Smart Filters',
      placement: 'bottom',
    },
  ],
  'job-scheduling': [
    {
      target: '[data-tour="job-calendar"]',
      content: 'View your schedule in day, week, or month format. Drag jobs to reschedule.',
      title: 'Visual Schedule',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="job-create"]',
      content: 'Create new jobs and assign them to technicians right away.',
      title: 'Quick Job Creation',
      placement: 'left',
    },
    {
      target: '[data-tour="dispatch-panel"]',
      content: 'See your team\'s availability and dispatch jobs efficiently.',
      title: 'Dispatch Panel',
      placement: 'right',
      prerequisite: 'dispatch',
    },
  ],
  'messaging': [
    {
      target: '[data-tour="message-inbox"]',
      content: 'All customer communications in one inbox. SMS, email, and more.',
      title: 'Unified Inbox',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="message-compose"]',
      content: 'Send messages to customers via SMS or email. Templates save you time.',
      title: 'Quick Messaging',
      placement: 'left',
    },
    {
      target: '[data-tour="message-templates"]',
      content: 'Create templates for common messages like appointment reminders.',
      title: 'Message Templates',
      placement: 'bottom',
    },
  ],
  'leads-captain': [
    {
      target: '[data-tour="leads-dashboard"]',
      content: 'Track all your leads and see where they are in your sales pipeline.',
      title: 'Lead Pipeline',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '[data-tour="leads-automation"]',
      content: 'Set up automated follow-ups so no lead falls through the cracks.',
      title: 'Smart Follow-ups',
      placement: 'right',
    },
    {
      target: '[data-tour="leads-sources"]',
      content: 'See where your best leads come from and optimize your marketing.',
      title: 'Lead Sources',
      placement: 'bottom',
    },
  ],
};

// Custom tooltip component for consistent styling
interface TooltipProps {
  continuous: boolean;
  index: number;
  step: Step;
  size: number;
  isLastStep: boolean;
  backProps: { onClick: () => void };
  primaryProps: { onClick: () => void };
  skipProps: { onClick: () => void };
  closeProps: { onClick: () => void };
}

function TourTooltip({
  continuous,
  index,
  step,
  size,
  isLastStep,
  backProps,
  primaryProps,
  skipProps,
  closeProps,
}: TooltipProps) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-xl max-w-sm p-4">
      {/* Close button */}
      <button
        {...closeProps}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Close tour"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Content */}
      <div className="pr-6">
        {step.title && (
          <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
        )}
        <p className="text-sm text-muted-foreground">{step.content}</p>
      </div>

      {/* Progress and actions */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <div className="flex items-center gap-1">
          {Array.from({ length: size }).map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === index ? 'bg-primary w-4' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {index > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={backProps.onClick}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
          )}

          {continuous && (
            <Button
              size="sm"
              onClick={primaryProps.onClick}
              className="gap-1"
            >
              {isLastStep ? (
                <>
                  Finish
                  <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Skip option */}
      {!isLastStep && (
        <button
          {...skipProps}
          className="text-xs text-muted-foreground hover:text-foreground mt-2 block w-full text-center"
        >
          Skip tour
        </button>
      )}
    </div>
  );
}

// Custom styles for Joyride
const joyrideStyles: Partial<Styles> = {
  options: {
    arrowColor: 'var(--card)',
    backgroundColor: 'var(--card)',
    overlayColor: 'rgba(0, 0, 0, 0.5)',
    primaryColor: 'var(--primary)',
    textColor: 'var(--foreground)',
    zIndex: 10000,
  },
  spotlight: {
    borderRadius: 8,
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
};

// Storage key for tracking completed tours
const TOUR_STORAGE_KEY = 'completed-tours';

function getCompletedTours(): TourId[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(TOUR_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function markTourComplete(tourId: TourId) {
  const completed = getCompletedTours();
  if (!completed.includes(tourId)) {
    localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify([...completed, tourId]));
  }
}

function resetTour(tourId: TourId) {
  const completed = getCompletedTours();
  localStorage.setItem(
    TOUR_STORAGE_KEY,
    JSON.stringify(completed.filter((id) => id !== tourId))
  );
}

export function resetAllTours() {
  localStorage.removeItem(TOUR_STORAGE_KEY);
}

interface InteractiveTourProps {
  tourId: TourId;
  autoStart?: boolean;
  onComplete?: () => void;
  onSkip?: () => void;
}

export function InteractiveTour({
  tourId,
  autoStart = false,
  onComplete,
  onSkip,
}: InteractiveTourProps) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = TOURS[tourId] || [];

  useEffect(() => {
    if (autoStart) {
      const completed = getCompletedTours();
      if (!completed.includes(tourId)) {
        // Delay start to ensure DOM is ready
        const timer = setTimeout(() => setRun(true), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [autoStart, tourId]);

  const handleCallback = useCallback((data: CallBackProps) => {
    const { status, action, index, type } = data;

    if (status === 'finished') {
      markTourComplete(tourId);
      setRun(false);
      onComplete?.();
    } else if (status === 'skipped' || action === 'close') {
      setRun(false);
      onSkip?.();
    } else if (type === 'step:after') {
      setStepIndex(index + 1);
    }
  }, [tourId, onComplete, onSkip]);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setRun(true);
  }, []);

  const stopTour = useCallback(() => {
    setRun(false);
  }, []);

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      disableOverlayClose
      spotlightClicks
      callback={handleCallback}
      styles={joyrideStyles}
      tooltipComponent={TourTooltip as never}
      floaterProps={{
        hideArrow: false,
        disableAnimation: false,
      }}
    />
  );
}

// Hook to manage tours programmatically
export function useTour(tourId: TourId) {
  const [isRunning, setIsRunning] = useState(false);
  const [hasCompleted, setHasCompleted] = useState(false);

  useEffect(() => {
    setHasCompleted(getCompletedTours().includes(tourId));
  }, [tourId]);

  const start = useCallback(() => {
    setIsRunning(true);
  }, []);

  const stop = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    resetTour(tourId);
    setHasCompleted(false);
  }, [tourId]);

  return {
    isRunning,
    hasCompleted,
    start,
    stop,
    reset,
  };
}

// Trigger button component for help menu or settings
interface TourTriggerButtonProps {
  tourId: TourId;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  onStart?: () => void;
}

export function TourTriggerButton({
  tourId,
  label = 'Start Tour',
  variant = 'outline',
  size = 'sm',
  onStart,
}: TourTriggerButtonProps) {
  const [showTour, setShowTour] = useState(false);

  const handleClick = () => {
    resetTour(tourId);
    setShowTour(true);
    onStart?.();
  };

  return (
    <>
      <Button variant={variant} size={size} onClick={handleClick} className="gap-2">
        <HelpCircle className="w-4 h-4" />
        {label}
      </Button>
      {showTour && (
        <InteractiveTour
          tourId={tourId}
          autoStart
          onComplete={() => setShowTour(false)}
          onSkip={() => setShowTour(false)}
        />
      )}
    </>
  );
}
