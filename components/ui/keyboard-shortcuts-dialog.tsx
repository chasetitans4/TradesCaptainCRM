'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { KEYBOARD_SHORTCUTS } from '@/lib/hooks/use-keyboard-shortcuts';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  const [isMac, setIsMac] = useState(true);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  const formatKeys = (keys: string) => {
    if (!isMac) {
      return keys
        .replace('⌘', 'Ctrl+')
        .replace('⇧', 'Shift+')
        .replace('⌥', 'Alt+');
    }
    return keys;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Navigation Section */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Navigation
            </h3>
            <div className="space-y-2">
              {KEYBOARD_SHORTCUTS.navigation.map((shortcut) => (
                <div
                  key={shortcut.keys}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm">{shortcut.description}</span>
                  <KeyCombo keys={formatKeys(shortcut.keys)} />
                </div>
              ))}
            </div>
          </div>

          {/* Actions Section */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              Actions
            </h3>
            <div className="space-y-2">
              {KEYBOARD_SHORTCUTS.actions.map((shortcut) => (
                <div
                  key={shortcut.keys}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm">{shortcut.description}</span>
                  <KeyCombo keys={formatKeys(shortcut.keys)} />
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Tip: Press{' '}
              <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">
                {isMac ? '⌘' : 'Ctrl'}K
              </kbd>{' '}
              anytime to open the command palette for quick actions
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KeyCombo({ keys }: { keys: string }) {
  // Split the key combo into individual keys
  const keyParts = keys.split('+').length > 1
    ? keys.split('+')
    : keys.split('').filter(k => k.trim());

  return (
    <div className="flex items-center gap-1">
      {keyParts.map((key, index) => (
        <kbd
          key={index}
          className="px-2 py-1 text-xs font-medium bg-muted rounded border min-w-[24px] text-center"
        >
          {key}
        </kbd>
      ))}
    </div>
  );
}
