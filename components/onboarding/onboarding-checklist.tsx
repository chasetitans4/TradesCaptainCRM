'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Check,
  ChevronRight,
  X,
  Building2,
  Users,
  Briefcase,
  CreditCard,
  MessageSquare,
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  completed: boolean;
}

interface OnboardingChecklistProps {
  steps?: OnboardingStep[];
  onDismiss?: () => void;
}

const defaultSteps: OnboardingStep[] = [
  {
    id: 'business',
    title: 'Set up your business',
    description: 'Add your company name, logo, and contact info',
    icon: Building2,
    href: '/settings',
    completed: false,
  },
  {
    id: 'customer',
    title: 'Add your first customer',
    description: 'Import or create a customer record',
    icon: Users,
    href: '/customers/new',
    completed: false,
  },
  {
    id: 'job',
    title: 'Create a job',
    description: 'Schedule your first service appointment',
    icon: Briefcase,
    href: '/jobs/new',
    completed: false,
  },
  {
    id: 'payment',
    title: 'Connect payments',
    description: 'Set up Stripe to accept online payments',
    icon: CreditCard,
    href: '/settings/billing',
    completed: false,
  },
  {
    id: 'messaging',
    title: 'Enable SMS messaging',
    description: 'Connect Twilio to text customers',
    icon: MessageSquare,
    href: '/settings/sms-templates',
    completed: false,
  },
];

export function OnboardingChecklist({
  steps = defaultSteps,
  onDismiss,
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(false);

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  if (dismissed || progress === 100) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="bg-card border rounded-xl p-6 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Get started with TradesCaptain</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Complete these steps to set up your account
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDismiss}
          className="text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <Progress value={progress} className="flex-1" />
        <span className="text-sm font-medium">
          {completedCount}/{steps.length}
        </span>
      </div>

      <div className="space-y-2">
        {steps.map((step) => (
          <Link
            key={step.id}
            href={step.href}
            className={cn(
              'flex items-center gap-4 p-3 rounded-lg transition-colors',
              step.completed ? 'bg-muted/50' : 'hover:bg-muted/50'
            )}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                step.completed
                  ? 'bg-green-100 text-green-600'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {step.completed ? (
                <Check className="w-5 h-5" />
              ) : (
                <step.icon className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'font-medium',
                  step.completed && 'line-through text-muted-foreground'
                )}
              >
                {step.title}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {step.description}
              </p>
            </div>
            {!step.completed && (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
