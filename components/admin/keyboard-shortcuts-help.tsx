'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';
import { ADMIN_KEYBOARD_SHORTCUTS, formatShortcutKey } from '@/hooks/useAdminKeyboardShortcuts';

interface AdminKeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminKeyboardShortcutsHelp({
  open,
  onOpenChange,
}: AdminKeyboardShortcutsHelpProps) {
  const navigationShortcuts = ADMIN_KEYBOARD_SHORTCUTS.filter(s => s.category === 'navigation');
  const actionShortcuts = ADMIN_KEYBOARD_SHORTCUTS.filter(s => s.category === 'actions');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Navigation */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Navigation</h3>
            <div className="space-y-2">
              {navigationShortcuts.map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{shortcut.description}</span>
                  <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border">
                    {formatShortcutKey(shortcut.key)}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Actions</h3>
            <div className="space-y-2">
              {actionShortcuts.map((shortcut) => (
                <div key={shortcut.key} className="flex items-center justify-between">
                  <span className="text-sm text-foreground">{shortcut.description}</span>
                  <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border">
                    {formatShortcutKey(shortcut.key)}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground pt-2 border-t border-border">
            Press <kbd className="px-1 py-0.5 text-xs font-mono bg-muted rounded border border-border">?</kbd> anytime to show this help
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
