'use client';

import { cn } from '@/lib/utils';

interface WorkflowStepperProps {
  status: string;
}

const STEPS = [
  { key: 'scheduled', label: 'Enroute' },
  { key: 'on_way', label: 'On Site' },
  { key: 'in_progress', label: 'Working' },
  { key: 'voice_note', label: 'Notes' },
  { key: 'done', label: 'Done' },
];

const STATUS_TO_STEP: Record<string, number> = {
  scheduled: 0,
  on_way: 1,
  in_progress: 2,
  completing: 3,
  completed: 4,
};

export function WorkflowStepper({ status }: WorkflowStepperProps) {
  const currentStep = STATUS_TO_STEP[status] ?? 0;

  return (
    <div className="flex items-center gap-1 px-4 py-2">
      {STEPS.map((step, i) => {
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            {/* Dot */}
            <div
              className={cn(
                'h-2 w-2 rounded-full shrink-0 transition-colors duration-300',
                isCompleted ? 'bg-primary' :
                isCurrent ? 'bg-primary' :
                'bg-muted-foreground/30'
              )}
            />
            {/* Line between dots */}
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mx-1">
                <div
                  className={cn(
                    'h-full rounded-full transition-colors duration-300',
                    isCompleted ? 'bg-primary' : 'bg-muted-foreground/20'
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
