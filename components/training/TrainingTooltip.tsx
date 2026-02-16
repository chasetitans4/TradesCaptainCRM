'use client';

import { Button } from '@/components/ui/button';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Volume2,
  VolumeX,
  RotateCcw,
  Lightbulb,
  Loader2,
} from 'lucide-react';
import type { TrainingStep } from '@/types/training';
import { STEP_TYPE_LABELS } from '@/types/training';
import type { TooltipRenderProps } from 'react-joyride';

// =====================================================
// TRAINING TOOLTIP COMPONENT
// =====================================================

interface TrainingTooltipProps extends TooltipRenderProps {
  trainingStep: TrainingStep | null;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onExit: () => void;
  onToggleVoice: () => void;
  onReplayVoice: () => void;
  isVoiceMuted: boolean;
  isVoiceSupported: boolean;
  isNavigating?: boolean;
}

export function TrainingTooltip({
  step,
  trainingStep,
  stepIndex,
  totalSteps,
  onNext,
  onBack,
  onExit,
  onToggleVoice,
  onReplayVoice,
  isVoiceMuted,
  isVoiceSupported,
  isNavigating = false,
}: TrainingTooltipProps) {
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;
  const isModal = trainingStep?.type === 'MODAL';
  const isCheckpoint = trainingStep?.type === 'CHECKPOINT';
  const isAction = trainingStep?.type === 'ACTION';
  const isNavigate = trainingStep?.type === 'NAVIGATE';

  // Get aria-label as string (step.title from joyride can be ReactNode)
  const ariaLabel = typeof step.title === 'string' ? step.title : 'Training step';

  // Determine tooltip width based on content
  const hasRichContent = trainingStep?.content.bullets || trainingStep?.content.tip;
  const tooltipWidth = isModal || hasRichContent ? 'w-[90vw] max-w-lg' : 'w-[90vw] max-w-md';

  return (
    <div
      className={`bg-card border border-border rounded-xl shadow-md ${tooltipWidth} p-4 sm:p-5`}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      {/* Header with close button */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          {/* Step type badge */}
          {trainingStep && (
            <span className="inline-flex items-center text-xs font-medium text-muted-foreground mb-1">
              {STEP_TYPE_LABELS[trainingStep.type]}
            </span>
          )}

          {/* Title */}
          {step.title && (
            <h3 className="font-semibold text-foreground text-base sm:text-lg leading-tight">
              {step.title}
            </h3>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onExit}
          className="text-muted-foreground hover:text-foreground transition-colors p-1.5 -m-1 rounded-lg hover:bg-muted shrink-0"
          aria-label="Exit training"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content */}
      <div className="text-sm text-muted-foreground leading-relaxed">
        {trainingStep?.content.body || step.content}
      </div>

      {/* Bullet points */}
      {trainingStep?.content.bullets && trainingStep.content.bullets.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {trainingStep.content.bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <span className="text-primary mt-1 shrink-0">•</span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Pro Tip */}
      {trainingStep?.content.tip && (
        <div className="mt-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 flex items-start gap-2">
          <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 dark:text-amber-200">
            <span className="font-medium">Pro tip:</span> {trainingStep.content.tip}
          </p>
        </div>
      )}

      {/* Action hint for ACTION steps */}
      {isAction && (
        <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-sm font-medium text-primary">
            👆 Click the highlighted element to continue
          </p>
        </div>
      )}

      {/* Navigation loading indicator */}
      {(isNavigate || isNavigating) && (
        <div className="mt-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
            Taking you to the next section...
          </p>
        </div>
      )}

      {/* Checkpoint options (for CHECKPOINT steps) */}
      {isCheckpoint && trainingStep?.type === 'CHECKPOINT' && trainingStep.options && (
        <div className="mt-4 space-y-2">
          {trainingStep.options.map((option) => (
            <button
              key={option.id}
              onClick={() => {
                if (option.correct) {
                  onNext();
                }
              }}
              className="w-full text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-sm"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Progress and voice controls */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border gap-2">
        {/* Voice controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          {isVoiceSupported && (
            <>
              <button
                onClick={onToggleVoice}
                className={`p-2 rounded-lg transition-colors ${
                  isVoiceMuted
                    ? 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    : 'text-primary hover:text-primary/80 hover:bg-primary/10'
                }`}
                aria-label={isVoiceMuted ? 'Enable voice' : 'Disable voice'}
                title={isVoiceMuted ? 'Enable voice' : 'Disable voice'}
              >
                {isVoiceMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              {!isVoiceMuted && trainingStep?.content.voice && (
                <button
                  onClick={onReplayVoice}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Replay voice"
                  title="Replay"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-1 h-9 px-3"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          )}

          {!isAction && !isNavigate && (
            <Button
              size="sm"
              onClick={onNext}
              className="gap-1 h-9 px-4"
              disabled={isNavigating}
            >
              {isNavigating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Loading...</span>
                </>
              ) : isLastStep ? (
                <>
                  <span>Finish</span>
                  <Check className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Progress indicator - simplified for mobile */}
      <div className="mt-3 flex items-center justify-center gap-1">
        {totalSteps <= 10 ? (
          // Show dots for 10 or fewer steps
          Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex
                  ? 'w-5 sm:w-6 bg-primary'
                  : i < stepIndex
                  ? 'w-1.5 bg-primary/50'
                  : 'w-1.5 bg-muted'
              }`}
            />
          ))
        ) : (
          // Show progress bar for many steps
          <div className="w-full max-w-[200px] h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Step counter */}
      <p className="text-xs text-muted-foreground text-center mt-2">
        Step {stepIndex + 1} of {totalSteps}
      </p>

      {/* Exit option - more visible on mobile */}
      <button
        onClick={onExit}
        className="text-xs text-muted-foreground hover:text-foreground mt-3 block w-full text-center py-1"
      >
        Exit training
      </button>
    </div>
  );
}
