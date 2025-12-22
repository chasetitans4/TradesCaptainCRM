// =====================================================
// ACCESSIBILITY UTILITIES
// WCAG 2.1 AA compliance helpers
// =====================================================

/**
 * Generate unique IDs for form fields and labels
 */
let idCounter = 0;
export function generateId(prefix = 'field'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Screen reader only class
 * Hides content visually but keeps it accessible to screen readers
 */
export const srOnly = 'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0';

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Check if high contrast mode is preferred
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: more)').matches;
}

/**
 * Focus trap for modals and dialogs
 */
export function createFocusTrap(container: HTMLElement) {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable?.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable?.focus();
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown);

  return {
    activate: () => firstFocusable?.focus(),
    deactivate: () => container.removeEventListener('keydown', handleKeyDown),
  };
}

/**
 * Announce message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  if (typeof document === 'undefined') return;

  const announcer = document.createElement('div');
  announcer.setAttribute('role', 'status');
  announcer.setAttribute('aria-live', priority);
  announcer.setAttribute('aria-atomic', 'true');
  announcer.className = srOnly;
  announcer.textContent = message;

  document.body.appendChild(announcer);

  setTimeout(() => {
    document.body.removeChild(announcer);
  }, 1000);
}

/**
 * Color contrast ratio calculation (WCAG)
 */
function getLuminance(hex: string): number {
  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = rgb & 0xff;

  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG AA requirements
 */
export function meetsContrastAA(foreground: string, background: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if color combination meets WCAG AAA requirements
 */
export function meetsContrastAAA(foreground: string, background: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Keyboard navigation helpers
 */
export const keyboardNavigation = {
  /**
   * Handle arrow key navigation in a list
   */
  handleArrowKeys(
    e: React.KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    options: { loop?: boolean; orientation?: 'horizontal' | 'vertical' } = {}
  ): number {
    const { loop = true, orientation = 'vertical' } = options;

    const prevKey = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight';

    let newIndex = currentIndex;

    if (e.key === prevKey) {
      e.preventDefault();
      newIndex = currentIndex - 1;
      if (newIndex < 0) {
        newIndex = loop ? items.length - 1 : 0;
      }
    } else if (e.key === nextKey) {
      e.preventDefault();
      newIndex = currentIndex + 1;
      if (newIndex >= items.length) {
        newIndex = loop ? 0 : items.length - 1;
      }
    } else if (e.key === 'Home') {
      e.preventDefault();
      newIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      newIndex = items.length - 1;
    }

    if (newIndex !== currentIndex) {
      items[newIndex]?.focus();
    }

    return newIndex;
  },

  /**
   * Check if key is an activation key (Enter or Space)
   */
  isActivationKey(e: React.KeyboardEvent): boolean {
    return e.key === 'Enter' || e.key === ' ';
  },
};

/**
 * ARIA label generators
 */
export const ariaLabels = {
  /**
   * Generate label for required field
   */
  required: (label: string) => `${label} (required)`,

  /**
   * Generate label for field with error
   */
  error: (label: string, error: string) => `${label}, error: ${error}`,

  /**
   * Generate label for loading state
   */
  loading: (action: string) => `${action}, please wait...`,

  /**
   * Generate label for expandable content
   */
  expandable: (label: string, expanded: boolean) =>
    `${label}, ${expanded ? 'expanded' : 'collapsed'}, press Enter to ${expanded ? 'collapse' : 'expand'}`,

  /**
   * Generate label for pagination
   */
  pagination: (current: number, total: number) =>
    `Page ${current} of ${total}`,

  /**
   * Generate label for progress
   */
  progress: (label: string, percent: number) =>
    `${label}: ${percent}% complete`,
};

/**
 * Semantic HTML helper types
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type LandmarkRole = 'banner' | 'navigation' | 'main' | 'complementary' | 'contentinfo' | 'search' | 'region';

export default {
  generateId,
  srOnly,
  prefersReducedMotion,
  prefersHighContrast,
  createFocusTrap,
  announce,
  getContrastRatio,
  meetsContrastAA,
  meetsContrastAAA,
  keyboardNavigation,
  ariaLabels,
};
