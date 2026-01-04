'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AdminShortcut {
  key: string;
  description: string;
  category: 'navigation' | 'actions';
}

export const ADMIN_KEYBOARD_SHORTCUTS: AdminShortcut[] = [
  // Navigation shortcuts (Cmd/Ctrl + Shift + key)
  { key: 'D', description: 'Go to Dashboard', category: 'navigation' },
  { key: 'A', description: 'Go to Accounts', category: 'navigation' },
  { key: 'L', description: 'Go to Leads', category: 'navigation' },
  { key: 'C', description: 'Go to Commissions', category: 'navigation' },
  { key: 'G', description: 'Go to Agents', category: 'navigation' },
  { key: 'R', description: 'Go to Reports', category: 'navigation' },
  { key: 'S', description: 'Go to Settings', category: 'navigation' },
  // Action shortcuts
  { key: '?', description: 'Show keyboard shortcuts', category: 'actions' },
  { key: 'Escape', description: 'Close modal/dialog', category: 'actions' },
];

interface UseAdminKeyboardShortcutsOptions {
  onShowHelp?: () => void;
  enabled?: boolean;
}

export function useAdminKeyboardShortcuts(options: UseAdminKeyboardShortcutsOptions = {}) {
  const router = useRouter();
  const enabled = options.enabled !== false;
  const [showHelp, setShowHelp] = useState(false);

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

      const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;

      // Show help with ? or Cmd/Ctrl + /
      if (event.key === '?' || (modifierKey && event.key === '/')) {
        event.preventDefault();
        setShowHelp(true);
        options.onShowHelp?.();
        return;
      }

      // Close with Escape
      if (event.key === 'Escape') {
        setShowHelp(false);
        return;
      }

      // Navigation shortcuts (Modifier + Shift + key)
      if (modifierKey && event.shiftKey) {
        const key = event.key.toLowerCase();
        let targetPath: string | null = null;

        switch (key) {
          case 'd':
            targetPath = '/admin-portal';
            break;
          case 'a':
            targetPath = '/admin-portal/accounts';
            break;
          case 'l':
            targetPath = '/admin-portal/leads';
            break;
          case 'c':
            targetPath = '/admin-portal/commissions';
            break;
          case 'g':
            targetPath = '/admin-portal/agents';
            break;
          case 'r':
            targetPath = '/admin-portal/reports';
            break;
          case 's':
            targetPath = '/admin-portal/settings';
            break;
        }

        if (targetPath) {
          event.preventDefault();
          router.push(targetPath);
        }
      }
    },
    [router, enabled, options]
  );

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, enabled]);

  return {
    showHelp,
    setShowHelp,
  };
}

/**
 * Format shortcut key for display
 */
export function formatShortcutKey(key: string): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (key === 'Escape') return 'Esc';
  if (key === '?') return '?';

  // Navigation shortcuts use modifier + shift + key
  const modifier = isMac ? '⌘' : 'Ctrl';
  const shift = isMac ? '⇧' : 'Shift+';

  return `${modifier}${shift}${key}`;
}
