'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { CallBackProps, Step, Styles } from 'react-joyride';
import { useTrainingContext } from './TrainingProvider';
import { TrainingTooltip } from './TrainingTooltip';
import type { TrainingStep } from '@/types/training';

// Dynamic import to avoid SSR issues
const Joyride = dynamic(() => import('react-joyride'), { ssr: false });

// =====================================================
// JOYRIDE STYLES
// =====================================================

const joyrideStyles: Partial<Styles> = {
  options: {
    arrowColor: 'hsl(var(--card))',
    backgroundColor: 'hsl(var(--card))',
    overlayColor: 'rgba(0, 0, 0, 0.6)',
    primaryColor: 'hsl(var(--primary))',
    textColor: 'hsl(var(--foreground))',
    zIndex: 10000,
  },
  spotlight: {
    borderRadius: 8,
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
};

// =====================================================
// TRAINING OVERLAY COMPONENT
// =====================================================

export function TrainingOverlay() {
  const router = useRouter();
  const pathname = usePathname();

  const {
    isActive,
    step,
    stepIndex,
    module,
    totalSteps,
    next,
    back,
    exit,
    toggleVoice,
    replayVoice,
    progress,
    tts,
  } = useTrainingContext();

  const [joyrideSteps, setJoyrideSteps] = useState<Step[]>([]);
  const [run, setRun] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Convert training steps to Joyride steps
  useEffect(() => {
    if (!module) {
      setJoyrideSteps([]);
      return;
    }

    const steps: Step[] = module.steps.map((trainingStep) => {
      // NAVIGATE steps and steps with navigateTo target body
      const isNavigateStep = trainingStep.type === 'NAVIGATE';
      const hasTarget = 'target' in trainingStep && (trainingStep as { target?: string }).target;
      const targetValue = hasTarget ? (trainingStep as { target: string }).target : null;

      const baseStep: Step = {
        target: isNavigateStep || trainingStep.type === 'MODAL' || trainingStep.type === 'CHECKPOINT'
          ? 'body'
          : targetValue
          ? `[data-training="${targetValue}"]`
          : 'body',
        content: trainingStep.content.body,
        title: trainingStep.content.title,
        disableBeacon: true,
        placement: getPlacement(trainingStep),
        spotlightClicks: trainingStep.type === 'ACTION',
        hideCloseButton: false,
        showSkipButton: true,
        showProgress: true,
        // Store original step data for tooltip
        data: { trainingStep },
      };

      return baseStep;
    });

    setJoyrideSteps(steps);
  }, [module]);

  // Sync step index
  useEffect(() => {
    setCurrentStepIndex(stepIndex);
  }, [stepIndex]);

  // Start/stop Joyride when training becomes active/inactive
  useEffect(() => {
    setRun(isActive && joyrideSteps.length > 0);
  }, [isActive, joyrideSteps.length]);

  // Handle navigation for NAVIGATE steps and navigateTo property
  useEffect(() => {
    if (!isActive || !step) return;

    // Get the destination URL
    let destination: string | undefined;

    if (step.type === 'NAVIGATE' && 'destination' in step) {
      destination = step.destination;
    } else if (step.navigateTo) {
      destination = step.navigateTo;
    }

    // If there's a destination and we're not already there, navigate
    if (destination && pathname !== destination) {
      setIsNavigating(true);
      setPendingNavigation(destination);
      router.push(destination);
    }
  }, [isActive, step, pathname, router]);

  // Handle navigation completion
  useEffect(() => {
    if (pendingNavigation && pathname === pendingNavigation) {
      // Navigation complete, wait a bit for page to render
      const timeout = setTimeout(() => {
        setIsNavigating(false);
        setPendingNavigation(null);

        // For NAVIGATE steps, auto-advance after reaching destination
        if (step?.type === 'NAVIGATE') {
          next();
        }
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [pathname, pendingNavigation, step, next]);

  // Handle waitForElement - wait for target element to appear
  useEffect(() => {
    if (!isActive || !step || isNavigating) return;

    const waitTarget = step.waitForElement;
    if (!waitTarget) return;

    const checkElement = () => {
      const element = document.querySelector(`[data-training="${waitTarget}"]`);
      return !!element;
    };

    // If element already exists, we're good
    if (checkElement()) return;

    // Poll for the element
    const interval = setInterval(() => {
      if (checkElement()) {
        clearInterval(interval);
      }
    }, 100);

    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval);
      console.warn(`[Training] Waited element not found: "${waitTarget}" (step: ${step.id})`);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isActive, step, isNavigating]);

  // Handle missing target elements (auto-skip)
  useEffect(() => {
    if (!isActive || !step || isNavigating) return;

    // For SPOTLIGHT and ACTION steps, check if target exists
    if ((step.type === 'SPOTLIGHT' || step.type === 'ACTION') && 'target' in step && step.target) {
      const targetElement = document.querySelector(`[data-training="${step.target}"]`);

      if (!targetElement) {
        console.warn(`[Training] Target not found: "${step.target}" (step: ${step.id}). Auto-skipping.`);
        // Auto-skip to next step after short delay
        const timeout = setTimeout(() => {
          next();
        }, 100);
        return () => clearTimeout(timeout);
      }

      // Scroll element into view
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isActive, step, next, isNavigating]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive || isNavigating) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          exit();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (step?.type !== 'ACTION' && step?.type !== 'NAVIGATE') {
            next();
          }
          break;
        case 'ArrowLeft':
        case 'Backspace':
          e.preventDefault();
          back();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (step?.type !== 'ACTION' && step?.type !== 'NAVIGATE') {
            next();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, isNavigating, next, back, exit, step]);

  // Handle Joyride callbacks
  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, action } = data;

    // Handle close/skip actions
    if (action === 'close' || action === 'skip' || status === 'skipped') {
      exit();
    }
  }, [exit]);

  if (!isActive || joyrideSteps.length === 0) {
    return null;
  }

  return (
    <Joyride
      steps={joyrideSteps}
      run={run && !isNavigating}
      stepIndex={currentStepIndex}
      continuous
      showSkipButton
      showProgress
      disableOverlayClose
      spotlightClicks={step?.type === 'ACTION'}
      callback={handleJoyrideCallback}
      styles={joyrideStyles}
      tooltipComponent={(props) => (
        <TrainingTooltip
          {...props}
          trainingStep={step}
          stepIndex={stepIndex}
          totalSteps={totalSteps}
          onNext={next}
          onBack={back}
          onExit={exit}
          onToggleVoice={toggleVoice}
          onReplayVoice={replayVoice}
          isVoiceMuted={progress.isVoiceMuted()}
          isVoiceSupported={tts.isSupported}
          isNavigating={isNavigating}
        />
      )}
      floaterProps={{
        hideArrow: false,
        disableAnimation: false,
      }}
    />
  );
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function getPlacement(step: TrainingStep): Step['placement'] {
  if (step.type === 'MODAL' || step.type === 'CHECKPOINT' || step.type === 'NAVIGATE') {
    return 'center';
  }

  // Check for display.position on SPOTLIGHT and ACTION steps
  if (step.type === 'SPOTLIGHT' || step.type === 'ACTION') {
    if (step.display?.position) {
      return step.display.position === 'auto' ? 'auto' : step.display.position;
    }
  }

  return 'auto';
}
