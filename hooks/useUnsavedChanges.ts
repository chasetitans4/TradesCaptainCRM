'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UseUnsavedChangesOptions {
  /** Message to show in the browser's beforeunload dialog */
  message?: string;
  /** Whether changes are currently unsaved */
  hasUnsavedChanges: boolean;
  /** Callback when user confirms they want to leave */
  onConfirmLeave?: () => void;
}

/**
 * Hook to warn users about unsaved changes before leaving a page.
 *
 * Features:
 * - Browser beforeunload warning (native dialog)
 * - Can be used with form dirty state
 * - Cleans up on unmount
 *
 * @example
 * ```tsx
 * const { isDirty, setIsDirty } = useState(false);
 *
 * useUnsavedChanges({
 *   hasUnsavedChanges: isDirty,
 *   message: 'You have unsaved changes. Are you sure you want to leave?'
 * });
 *
 * // Mark as dirty when form changes
 * <input onChange={() => setIsDirty(true)} />
 *
 * // Clear dirty state on save
 * const handleSave = async () => {
 *   await save();
 *   setIsDirty(false);
 * };
 * ```
 */
export function useUnsavedChanges({
  message = 'You have unsaved changes. Are you sure you want to leave?',
  hasUnsavedChanges,
  onConfirmLeave,
}: UseUnsavedChangesOptions) {
  // Handle browser's beforeunload event
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom messages but still show the dialog
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, message]);

  // Provide a confirm function for programmatic navigation
  const confirmLeave = useCallback((): boolean => {
    if (!hasUnsavedChanges) return true;

    const confirmed = window.confirm(message);
    if (confirmed && onConfirmLeave) {
      onConfirmLeave();
    }
    return confirmed;
  }, [hasUnsavedChanges, message, onConfirmLeave]);

  return { confirmLeave };
}

/**
 * Hook to track form dirty state with unsaved changes warning.
 *
 * @example
 * ```tsx
 * const { isDirty, markDirty, markClean, confirmLeave } = useFormDirtyState();
 *
 * <input onChange={markDirty} />
 *
 * const handleSave = async () => {
 *   await save();
 *   markClean();
 * };
 *
 * const handleCancel = () => {
 *   if (confirmLeave()) {
 *     router.back();
 *   }
 * };
 * ```
 */
export function useFormDirtyState(options?: {
  message?: string;
  onConfirmLeave?: () => void;
}) {
  const [isDirty, setIsDirty] = useState(false);

  const { confirmLeave } = useUnsavedChanges({
    hasUnsavedChanges: isDirty,
    message: options?.message,
    onConfirmLeave: options?.onConfirmLeave,
  });

  const markDirty = useCallback(() => setIsDirty(true), []);
  const markClean = useCallback(() => setIsDirty(false), []);

  return {
    isDirty,
    setIsDirty,
    markDirty,
    markClean,
    confirmLeave,
  };
}

export default useUnsavedChanges;
