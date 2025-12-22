// =====================================================
// KEYBOARD SHORTCUTS HOOK
// Global keyboard shortcuts for the application
// =====================================================

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type ShortcutHandler = () => void;

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: ShortcutHandler;
  description: string;
  category: 'navigation' | 'actions' | 'ui';
}

// Default shortcuts configuration
const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  // Navigation shortcuts
  {
    key: 'h',
    meta: true,
    handler: () => {},
    description: 'Go to Dashboard',
    category: 'navigation',
  },
  {
    key: 'c',
    meta: true,
    shift: true,
    handler: () => {},
    description: 'Go to Customers',
    category: 'navigation',
  },
  {
    key: 'j',
    meta: true,
    shift: true,
    handler: () => {},
    description: 'Go to Jobs',
    category: 'navigation',
  },
  {
    key: 'l',
    meta: true,
    shift: true,
    handler: () => {},
    description: 'Go to Leads',
    category: 'navigation',
  },
  {
    key: 'i',
    meta: true,
    shift: true,
    handler: () => {},
    description: 'Go to Invoices',
    category: 'navigation',
  },
  {
    key: 's',
    meta: true,
    shift: true,
    handler: () => {},
    description: 'Go to Schedule',
    category: 'navigation',
  },
  // Action shortcuts
  {
    key: 'n',
    meta: true,
    handler: () => {},
    description: 'New Customer',
    category: 'actions',
  },
  {
    key: '/',
    meta: true,
    handler: () => {},
    description: 'Show Keyboard Shortcuts',
    category: 'ui',
  },
];

/**
 * Check if a keyboard event matches a shortcut config
 */
function matchesShortcut(event: KeyboardEvent, shortcut: ShortcutConfig): boolean {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const metaKey = isMac ? event.metaKey : event.ctrlKey;

  // Check modifier keys
  if (shortcut.meta && !metaKey) return false;
  if (shortcut.ctrl && !event.ctrlKey) return false;
  if (shortcut.shift && !event.shiftKey) return false;
  if (shortcut.alt && !event.altKey) return false;

  // Check if no modifier is required but one is pressed
  if (!shortcut.meta && !shortcut.ctrl && metaKey) return false;
  if (!shortcut.shift && event.shiftKey) return false;
  if (!shortcut.alt && event.altKey) return false;

  // Check the key
  return event.key.toLowerCase() === shortcut.key.toLowerCase();
}

/**
 * Custom hook for keyboard shortcuts
 */
export function useKeyboardShortcuts(options?: {
  onToggleShortcutsHelp?: () => void;
  onNewCustomer?: () => void;
  enabled?: boolean;
}) {
  const router = useRouter();
  const enabled = options?.enabled !== false;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const metaKey = isMac ? event.metaKey : event.ctrlKey;

      // Command/Ctrl + K is handled by the command palette
      if (metaKey && event.key === 'k') {
        return;
      }

      // Navigation shortcuts (Meta/Ctrl + Shift + key)
      if (metaKey && event.shiftKey) {
        switch (event.key.toLowerCase()) {
          case 'h':
            event.preventDefault();
            router.push('/');
            return;
          case 'c':
            event.preventDefault();
            router.push('/customers');
            return;
          case 'j':
            event.preventDefault();
            router.push('/jobs');
            return;
          case 'l':
            event.preventDefault();
            router.push('/leads');
            return;
          case 'i':
            event.preventDefault();
            router.push('/invoices');
            return;
          case 's':
            event.preventDefault();
            router.push('/schedule');
            return;
          case 'q':
            event.preventDefault();
            router.push('/quotes');
            return;
          case 'r':
            event.preventDefault();
            router.push('/reports');
            return;
          case 'm':
            event.preventDefault();
            router.push('/messages');
            return;
        }
      }

      // Action shortcuts (Meta/Ctrl + key)
      if (metaKey && !event.shiftKey) {
        switch (event.key.toLowerCase()) {
          case 'n':
            event.preventDefault();
            options?.onNewCustomer?.();
            return;
          case '/':
            event.preventDefault();
            options?.onToggleShortcutsHelp?.();
            return;
        }
      }

      // Quick navigation without modifiers (g + key)
      // This uses a two-key combo pattern
    },
    [router, options, enabled]
  );

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);
}

/**
 * Get formatted shortcut key for display
 */
export function getShortcutDisplay(shortcut: ShortcutConfig): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const parts: string[] = [];

  if (shortcut.meta) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.ctrl) {
    parts.push('Ctrl');
  }
  if (shortcut.shift) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  parts.push(shortcut.key.toUpperCase());

  return parts.join(isMac ? '' : '+');
}

/**
 * All available shortcuts for help display
 */
export const KEYBOARD_SHORTCUTS = {
  navigation: [
    { keys: '⌘⇧H', description: 'Go to Dashboard' },
    { keys: '⌘⇧C', description: 'Go to Customers' },
    { keys: '⌘⇧J', description: 'Go to Jobs' },
    { keys: '⌘⇧L', description: 'Go to Leads' },
    { keys: '⌘⇧I', description: 'Go to Invoices' },
    { keys: '⌘⇧Q', description: 'Go to Quotes' },
    { keys: '⌘⇧S', description: 'Go to Schedule' },
    { keys: '⌘⇧R', description: 'Go to Reports' },
    { keys: '⌘⇧M', description: 'Go to Messages' },
  ],
  actions: [
    { keys: '⌘K', description: 'Open Command Palette' },
    { keys: '⌘N', description: 'New Customer' },
    { keys: '⌘/', description: 'Show Keyboard Shortcuts' },
  ],
};
