'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check, Pause, AlertCircle } from 'lucide-react';

export type JobStage = 'scheduled' | 'on_my_way' | 'on_site' | 'completed' | 'paid';
export type StepState = 'completed' | 'current' | 'upcoming' | 'paused' | 'revisit_required';

interface Step {
  id: JobStage;
  label: string;
}

const STEPS: Step[] = [
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'on_my_way', label: 'On My Way' },
  { id: 'on_site', label: 'On Site' },
  { id: 'completed', label: 'Completed' },
  { id: 'paid', label: 'Paid' },
];

export interface ProgressStepperProps {
  currentStage: JobStage;
  isPaused?: boolean;
  revisitRequired?: boolean;
  className?: string;
  compact?: boolean;
}

function getStepState(
  stepIndex: number,
  currentIndex: number,
  isPaused: boolean,
  revisitRequired: boolean
): StepState {
  if (stepIndex < currentIndex) {
    return 'completed';
  }
  if (stepIndex === currentIndex) {
    if (isPaused) return 'paused';
    if (revisitRequired) return 'revisit_required';
    return 'current';
  }
  return 'upcoming';
}

function StepCircle({ state, compact }: { state: StepState; compact?: boolean }) {
  const size = compact ? 'h-2.5 w-2.5' : 'h-3 w-3';
  const iconSize = compact ? 8 : 10;

  const baseClasses = cn(
    'rounded-full flex items-center justify-center transition-all duration-200',
    size
  );

  switch (state) {
    case 'completed':
      return (
        <div className={cn(baseClasses, 'bg-tc-success')}>
          <Check className="text-white" size={iconSize} strokeWidth={3} />
        </div>
      );
    case 'current':
      return (
        <div className={cn(baseClasses, 'bg-tc-accent animate-pulse-subtle ring-2 ring-tc-accent/30')} />
      );
    case 'paused':
      return (
        <div className={cn(baseClasses, 'border-2 border-dashed border-tc-warning bg-tc-warning-muted')}>
          <Pause className="text-tc-warning" size={iconSize - 2} />
        </div>
      );
    case 'revisit_required':
      return (
        <div className={cn(baseClasses, 'bg-tc-warning')}>
          <AlertCircle className="text-white" size={iconSize} />
        </div>
      );
    case 'upcoming':
    default:
      return (
        <div className={cn(baseClasses, 'border-2 border-tc-border bg-transparent')} />
      );
  }
}

function ConnectorLine({ completed, compact }: { completed: boolean; compact?: boolean }) {
  return (
    <div
      className={cn(
        'flex-1 h-0.5 mx-1 transition-colors duration-200',
        completed ? 'bg-tc-success' : 'bg-tc-border'
      )}
    />
  );
}

export function ProgressStepper({
  currentStage,
  isPaused = false,
  revisitRequired = false,
  className,
  compact = false,
}: ProgressStepperProps) {
  const currentIndex = STEPS.findIndex((s) => s.id === currentStage);

  return (
    <div className={cn('w-full', className)}>
      {/* Steps row */}
      <div className="flex items-center">
        {STEPS.map((step, index) => {
          const state = getStepState(index, currentIndex, isPaused, revisitRequired);
          const isLast = index === STEPS.length - 1;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <StepCircle state={state} compact={compact} />
              </div>
              {!isLast && (
                <ConnectorLine completed={index < currentIndex} compact={compact} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Labels row - only show if not compact */}
      {!compact && (
        <div className="flex items-start mt-2">
          {STEPS.map((step, index) => {
            const state = getStepState(index, currentIndex, isPaused, revisitRequired);
            const isLast = index === STEPS.length - 1;

            return (
              <React.Fragment key={`label-${step.id}`}>
                <div className="flex flex-col items-center min-w-0">
                  <span
                    className={cn(
                      'text-[10px] leading-tight text-center whitespace-nowrap',
                      state === 'completed' && 'text-tc-success font-medium',
                      state === 'current' && 'text-tc-accent font-medium',
                      state === 'paused' && 'text-tc-warning font-medium',
                      state === 'revisit_required' && 'text-tc-warning font-medium',
                      state === 'upcoming' && 'text-text-muted'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {!isLast && <div className="flex-1 mx-1" />}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { STEPS as JOB_STAGES };
