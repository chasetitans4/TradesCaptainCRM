'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fireConfetti, type ConfettiPreset } from '@/components/ui/confetti';
import { cn } from '@/lib/utils';
import { Trophy, Sparkles, Rocket, Target, Award, Star, X } from 'lucide-react';

// Milestone definitions
export type MilestoneId =
  | 'first-lead'
  | 'first-customer'
  | 'first-job'
  | 'first-invoice'
  | 'first-payment'
  | 'five-leads'
  | 'ten-leads'
  | 'twenty-five-leads'
  | 'first-week'
  | 'first-month'
  | 'first-review'
  | 'setup-complete';

interface MilestoneConfig {
  id: MilestoneId;
  title: string;
  description: string;
  icon: typeof Trophy;
  confettiPreset: ConfettiPreset;
  emojis?: string[];
  action?: {
    label: string;
    href?: string;
  };
}

const MILESTONES: Record<MilestoneId, MilestoneConfig> = {
  'first-lead': {
    id: 'first-lead',
    title: 'First Lead Added!',
    description:
      "You're on your way! Every successful contractor starts by tracking every single lead. Keep it up!",
    icon: Sparkles,
    confettiPreset: 'celebration',
    action: {
      label: 'View Your Leads',
      href: '/leads',
    },
  },
  'first-customer': {
    id: 'first-customer',
    title: 'First Customer Created!',
    description:
      "Congratulations! You've added your first customer. Now you can track all their jobs in one place.",
    icon: Star,
    confettiPreset: 'stars',
    action: {
      label: 'View Customers',
      href: '/customers',
    },
  },
  'first-job': {
    id: 'first-job',
    title: 'First Job Scheduled!',
    description:
      "You've scheduled your first job. The calendar is filling up!",
    icon: Target,
    confettiPreset: 'celebration',
    action: {
      label: 'View Calendar',
      href: '/calendar',
    },
  },
  'first-invoice': {
    id: 'first-invoice',
    title: 'First Invoice Sent!',
    description:
      "Money incoming! You've sent your first invoice. Time to get paid!",
    icon: Award,
    confettiPreset: 'emoji',
    emojis: ['💵', '💰', '🎉', '✨'],
  },
  'first-payment': {
    id: 'first-payment',
    title: 'First Payment Received!',
    description:
      "Ka-ching! You've received your first payment. This is what it's all about!",
    icon: Trophy,
    confettiPreset: 'fireworks',
  },
  'five-leads': {
    id: 'five-leads',
    title: '5 Leads Milestone!',
    description:
      "You're building a pipeline! Keep tracking every inquiry - even the long shots.",
    icon: Rocket,
    confettiPreset: 'celebration',
  },
  'ten-leads': {
    id: 'ten-leads',
    title: '10 Leads Reached!',
    description:
      "Double digits! You're developing a great habit. The more you track, the more you'll close.",
    icon: Sparkles,
    confettiPreset: 'stars',
  },
  'twenty-five-leads': {
    id: 'twenty-five-leads',
    title: '25 Leads Strong!',
    description:
      "You're a lead-tracking machine! Your pipeline is growing strong.",
    icon: Trophy,
    confettiPreset: 'fireworks',
  },
  'first-week': {
    id: 'first-week',
    title: 'One Week Active!',
    description:
      "You've been using TradesCaptain for a week. Consistency is key!",
    icon: Award,
    confettiPreset: 'celebration',
  },
  'first-month': {
    id: 'first-month',
    title: 'One Month Strong!',
    description:
      "A full month of tracking your business. You're building great habits!",
    icon: Trophy,
    confettiPreset: 'fireworks',
  },
  'first-review': {
    id: 'first-review',
    title: 'First Review Received!',
    description:
      "Someone left you a review! Reviews are gold for getting more customers.",
    icon: Star,
    confettiPreset: 'stars',
    emojis: ['⭐', '🌟', '✨', '💫'],
  },
  'setup-complete': {
    id: 'setup-complete',
    title: 'Setup Complete!',
    description:
      "You've finished setting up your account. You're ready to grow your business!",
    icon: Rocket,
    confettiPreset: 'fireworks',
    action: {
      label: 'Go to Dashboard',
      href: '/dashboard',
    },
  },
};

// Storage key for tracking shown milestones
const MILESTONES_STORAGE_KEY = 'shown-milestones';

function getShownMilestones(): MilestoneId[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(MILESTONES_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

function markMilestoneShown(id: MilestoneId) {
  const shown = getShownMilestones();
  if (!shown.includes(id)) {
    localStorage.setItem(MILESTONES_STORAGE_KEY, JSON.stringify([...shown, id]));
  }
}

function hasMilestoneBeenShown(id: MilestoneId): boolean {
  return getShownMilestones().includes(id);
}

export function resetAllMilestones() {
  localStorage.removeItem(MILESTONES_STORAGE_KEY);
}

interface MilestoneCelebrationProps {
  milestoneId: MilestoneId;
  /**
   * Whether to show the celebration
   */
  trigger: boolean;
  /**
   * Callback when the celebration is dismissed
   */
  onDismiss?: () => void;
  /**
   * Callback when the action button is clicked
   */
  onAction?: () => void;
  /**
   * Whether to show even if already shown before
   */
  showAgain?: boolean;
}

export function MilestoneCelebration({
  milestoneId,
  trigger,
  onDismiss,
  onAction,
  showAgain = false,
}: MilestoneCelebrationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const milestone = MILESTONES[milestoneId];

  useEffect(() => {
    if (trigger && milestone) {
      const shouldShow = showAgain || !hasMilestoneBeenShown(milestoneId);
      if (shouldShow) {
        setIsOpen(true);
        fireConfetti({
          preset: milestone.confettiPreset,
          emojis: milestone.emojis,
          duration: 4000,
        });
        markMilestoneShown(milestoneId);
      }
    }
  }, [trigger, milestoneId, milestone, showAgain]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    onDismiss?.();
  }, [onDismiss]);

  const handleAction = useCallback(() => {
    setIsOpen(false);
    onAction?.();
    if (milestone?.action?.href) {
      window.location.href = milestone.action.href;
    }
  }, [milestone, onAction]);

  if (!milestone) return null;

  const IconComponent = milestone.icon;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex flex-col items-center text-center py-6">
          {/* Animated icon */}
          <div className="relative mb-6">
            <div
              className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center',
                'bg-gradient-to-br from-secondary-400/20 to-primary-600/20',
                'animate-pulse'
              )}
            >
              <IconComponent className="w-10 h-10 text-primary" />
            </div>
            <div className="absolute -top-2 -right-2 text-2xl animate-bounce">
              🎉
            </div>
          </div>

          <DialogHeader>
            <DialogTitle className="text-2xl">{milestone.title}</DialogTitle>
          </DialogHeader>

          <p className="text-muted-foreground mt-4 mb-6 max-w-sm">
            {milestone.description}
          </p>

          <div className="flex items-center gap-3 w-full">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Continue
            </Button>
            {milestone.action && (
              <Button onClick={handleAction} className="flex-1">
                {milestone.action.label}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for triggering milestone celebrations
 */
export function useMilestoneCelebration() {
  const [activeMilestone, setActiveMilestone] = useState<MilestoneId | null>(null);

  const celebrate = useCallback((milestoneId: MilestoneId) => {
    if (!hasMilestoneBeenShown(milestoneId)) {
      setActiveMilestone(milestoneId);
    }
  }, []);

  const dismiss = useCallback(() => {
    setActiveMilestone(null);
  }, []);

  const hasBeenCelebrated = useCallback((milestoneId: MilestoneId) => {
    return hasMilestoneBeenShown(milestoneId);
  }, []);

  return {
    activeMilestone,
    celebrate,
    dismiss,
    hasBeenCelebrated,
  };
}

/**
 * Provider component that listens for milestone events
 */
interface MilestoneCelebrationProviderProps {
  children: React.ReactNode;
}

export function MilestoneCelebrationProvider({
  children,
}: MilestoneCelebrationProviderProps) {
  const { activeMilestone, dismiss } = useMilestoneCelebration();

  return (
    <>
      {children}
      {activeMilestone && (
        <MilestoneCelebration
          milestoneId={activeMilestone}
          trigger
          onDismiss={dismiss}
        />
      )}
    </>
  );
}

// Export milestone IDs for use elsewhere
export { MILESTONES };
