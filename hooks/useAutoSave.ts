'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Auto-save status for UI feedback
 */
export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/**
 * Auto-save options
 */
export interface AutoSaveOptions<T> {
  /** Data to be saved */
  data: T;
  /** Save function - should return a promise */
  onSave: (data: T) => Promise<void>;
  /** Debounce delay in milliseconds. Default: 2000 (2s per Constitution) */
  debounceMs?: number;
  /** Enable auto-save. Default: true */
  enabled?: boolean;
  /** Save on blur event. Default: true (per Constitution Section 3.9.3) */
  saveOnBlur?: boolean;
  /** Callback when save completes */
  onSaveComplete?: () => void;
  /** Callback when save fails */
  onSaveError?: (error: Error) => void;
  /** Compare function to check if data changed. Default: JSON.stringify comparison */
  hasChanged?: (prev: T, current: T) => boolean;
}

/**
 * Auto-save result
 */
export interface AutoSaveResult {
  /** Current save status */
  status: AutoSaveStatus;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Last saved timestamp */
  lastSaved: Date | null;
  /** Error message if save failed */
  error: string | null;
  /** Manually trigger save */
  save: () => Promise<void>;
  /** Handle blur event (triggers immediate save) */
  handleBlur: () => void;
  /** Mark as clean (after external save) */
  markClean: () => void;
}

/**
 * Auto-Save Hook
 *
 * Per Design Constitution Section 3.9.3 - Auto-Save Behavior:
 * - Save on blur event
 * - Save after 2 seconds of inactivity (debounced)
 * - Show "Saving..." indicator
 * - Show "Saved ✓" confirmation
 * - Queue for offline sync if needed
 *
 * Recovery:
 * - Form state persists through app close, crash, or signal loss
 * - On reopen: "You have an unfinished form for [Job]. Continue?"
 * - Never lose work. Ever.
 */
export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 2000,
  enabled = true,
  saveOnBlur = true,
  onSaveComplete,
  onSaveError,
  hasChanged,
}: AutoSaveOptions<T>): AutoSaveResult {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs to track data and avoid stale closures
  const dataRef = useRef(data);
  const lastSavedDataRef = useRef<T | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  // Default change detection
  const defaultHasChanged = useCallback((prev: T, current: T): boolean => {
    try {
      return JSON.stringify(prev) !== JSON.stringify(current);
    } catch {
      return true; // If serialization fails, assume changed
    }
  }, []);

  const checkChanged = hasChanged || defaultHasChanged;

  // Update data ref
  useEffect(() => {
    dataRef.current = data;

    // Check if data changed from last save
    if (lastSavedDataRef.current !== null) {
      const changed = checkChanged(lastSavedDataRef.current, data);
      setIsDirty(changed);
    } else {
      // First render, check if data has meaningful content
      setIsDirty(false);
    }
  }, [data, checkChanged]);

  // Save function
  const performSave = useCallback(async () => {
    if (isSavingRef.current || !enabled) return;
    if (!isDirty && lastSavedDataRef.current !== null) return;

    isSavingRef.current = true;
    setStatus('saving');
    setError(null);

    try {
      await onSave(dataRef.current);

      lastSavedDataRef.current = dataRef.current;
      setLastSaved(new Date());
      setStatus('saved');
      setIsDirty(false);
      onSaveComplete?.();

      // Reset to idle after showing "Saved" for 2 seconds
      setTimeout(() => {
        setStatus((current) => (current === 'saved' ? 'idle' : current));
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Save failed';
      setError(errorMessage);
      setStatus('error');
      onSaveError?.(err instanceof Error ? err : new Error(errorMessage));

      // Reset to idle after showing error for 3 seconds
      setTimeout(() => {
        setStatus((current) => (current === 'error' ? 'idle' : current));
      }, 3000);
    } finally {
      isSavingRef.current = false;
    }
  }, [enabled, isDirty, onSave, onSaveComplete, onSaveError]);

  // Debounced auto-save on data change
  useEffect(() => {
    if (!enabled || !isDirty) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for debounced save
    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, enabled, isDirty, debounceMs, performSave]);

  // Handle blur - immediate save
  const handleBlur = useCallback(() => {
    if (!saveOnBlur || !enabled || !isDirty) return;

    // Clear debounce timeout and save immediately
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    performSave();
  }, [saveOnBlur, enabled, isDirty, performSave]);

  // Manual save trigger
  const save = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await performSave();
  }, [performSave]);

  // Mark as clean (after external save)
  const markClean = useCallback(() => {
    lastSavedDataRef.current = dataRef.current;
    setIsDirty(false);
    setStatus('idle');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    status,
    isDirty,
    lastSaved,
    error,
    save,
    handleBlur,
    markClean,
  };
}

/**
 * Status indicator component props
 */
export interface AutoSaveIndicatorProps {
  status: AutoSaveStatus;
  lastSaved: Date | null;
  error: string | null;
  className?: string;
}

/**
 * Format "last saved" time for display
 */
export function formatLastSaved(date: Date | null): string {
  if (!date) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;

  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}
