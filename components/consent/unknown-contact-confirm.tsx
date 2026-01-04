'use client';

// =====================================================
// UNKNOWN CONTACT CONFIRMATION DIALOG
// Per Section 4.2 - Unknown contacts require confirmation before sending
// Per Appendix A.2 - Automation Permission Matrix
// =====================================================

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Shield, UserX } from 'lucide-react';

interface UnknownContactConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName?: string;
  contactPhone?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation dialog shown before sending to contacts with 'unknown' relationship state.
 * Per Section 4.2 of Product Identity:
 * "Unknown contacts cannot receive automated messages. They can receive manual messages
 * only if the user explicitly confirms intent."
 */
export function UnknownContactConfirmDialog({
  open,
  onOpenChange,
  contactName,
  contactPhone,
  onConfirm,
  onCancel,
}: UnknownContactConfirmProps) {
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    if (confirmed) {
      onConfirm();
      setConfirmed(false);
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    setConfirmed(false);
    onCancel();
    onOpenChange(false);
  };

  const displayName = contactName || contactPhone || 'this contact';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <AlertDialogTitle>Confirm First Contact</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              You&apos;re about to send a message to <strong>{displayName}</strong>, who has no
              prior message history in the system.
            </p>

            <div className="rounded-lg border border-muted p-3 bg-muted/30 space-y-2">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <p className="text-sm">
                  Per our compliance policy, you must have a legitimate business relationship
                  with this contact before sending messages.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <UserX className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <p className="text-sm">
                  Your message will include opt-out instructions. If they reply STOP,
                  they will be automatically opted out.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="confirm-relationship"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
              className="mt-0.5"
            />
            <Label
              htmlFor="confirm-relationship"
              className="text-sm leading-relaxed cursor-pointer"
            >
              I confirm this contact is a customer, lead, or has a prior business
              relationship with us. This is not cold outreach.
            </Label>
          </div>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!confirmed}
            className={!confirmed ? 'opacity-50 cursor-not-allowed' : ''}
          >
            Send Message
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Hook to use the unknown contact confirmation
 */
export function useUnknownContactConfirm() {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    contactName?: string;
    contactPhone?: string;
    onConfirm: () => void;
  }>({
    open: false,
    onConfirm: () => {},
  });

  const showConfirmation = (
    contactName?: string,
    contactPhone?: string
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialogState({
        open: true,
        contactName,
        contactPhone,
        onConfirm: () => {
          resolve(true);
          setDialogState((prev) => ({ ...prev, open: false }));
        },
      });
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setDialogState((prev) => ({ ...prev, open: false }));
    }
  };

  const handleCancel = () => {
    setDialogState((prev) => ({ ...prev, open: false }));
  };

  return {
    dialogProps: {
      open: dialogState.open,
      onOpenChange: handleOpenChange,
      contactName: dialogState.contactName,
      contactPhone: dialogState.contactPhone,
      onConfirm: dialogState.onConfirm,
      onCancel: handleCancel,
    },
    showConfirmation,
  };
}
