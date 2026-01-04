'use client';

import { useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';

export type ConfettiPreset = 'celebration' | 'fireworks' | 'stars' | 'emoji';

interface ConfettiOptions {
  /**
   * Preset animation style
   */
  preset?: ConfettiPreset;
  /**
   * Duration of animation in milliseconds
   */
  duration?: number;
  /**
   * Number of particles (for non-preset mode)
   */
  particleCount?: number;
  /**
   * Custom emojis for emoji preset
   */
  emojis?: string[];
}

/**
 * Fire confetti with preset animations
 */
export function fireConfetti(options: ConfettiOptions = {}) {
  const { preset = 'celebration', duration = 3000 } = options;

  switch (preset) {
    case 'celebration':
      fireCelebration(duration);
      break;
    case 'fireworks':
      fireFireworks(duration);
      break;
    case 'stars':
      fireStars(duration);
      break;
    case 'emoji':
      fireEmoji(duration, options.emojis);
      break;
    default:
      fireCelebration(duration);
  }
}

function fireCelebration(duration: number) {
  const end = Date.now() + duration;

  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  (function frame() {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

function fireFireworks(duration: number) {
  const end = Date.now() + duration;
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  (function frame() {
    confetti({
      particleCount: 50,
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      origin: {
        x: Math.random(),
        y: Math.random() - 0.2,
      },
      colors,
    });

    if (Date.now() < end) {
      setTimeout(frame, 250);
    }
  })();
}

function fireStars(duration: number) {
  const end = Date.now() + duration;

  const defaults = {
    spread: 360,
    ticks: 100,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
    shapes: ['star'] as confetti.Shape[],
    colors: ['#fbbf24', '#f59e0b', '#fcd34d', '#fef3c7'],
  };

  (function frame() {
    confetti({
      ...defaults,
      particleCount: 30,
      scalar: 1.2,
      origin: { x: Math.random(), y: Math.random() * 0.5 },
    });

    confetti({
      ...defaults,
      particleCount: 10,
      scalar: 0.75,
      origin: { x: Math.random(), y: Math.random() * 0.5 },
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

function fireEmoji(duration: number, emojis: string[] = ['🎉', '✨', '🎊', '⭐']) {
  const end = Date.now() + duration;

  const defaults = {
    spread: 360,
    ticks: 100,
    gravity: 0.5,
    decay: 0.94,
    startVelocity: 20,
    shapes: ['circle'] as confetti.Shape[],
    scalar: 2,
  };

  // Create emoji shapes
  const shapes = emojis.map((emoji) =>
    confetti.shapeFromText({ text: emoji, scalar: 2 })
  );

  (function frame() {
    confetti({
      ...defaults,
      particleCount: 2,
      shapes,
      origin: { x: Math.random(), y: Math.random() * 0.5 },
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

/**
 * Hook for triggering confetti
 */
export function useConfetti() {
  const fire = useCallback((options?: ConfettiOptions) => {
    fireConfetti(options);
  }, []);

  return { fire };
}

/**
 * Component that fires confetti when shown
 */
interface ConfettiTriggerProps {
  /**
   * Whether to trigger the confetti
   */
  trigger: boolean;
  /**
   * Confetti options
   */
  options?: ConfettiOptions;
  /**
   * Callback after confetti finishes
   */
  onComplete?: () => void;
}

export function ConfettiTrigger({
  trigger,
  options,
  onComplete,
}: ConfettiTriggerProps) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (trigger && !hasFired.current) {
      hasFired.current = true;
      fireConfetti(options);

      const duration = options?.duration ?? 3000;
      if (onComplete) {
        setTimeout(onComplete, duration);
      }
    }
  }, [trigger, options, onComplete]);

  return null;
}
