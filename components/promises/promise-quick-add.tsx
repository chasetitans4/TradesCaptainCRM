'use client';

/**
 * Promise Quick Add Modal
 *
 * Per CIL Spec Section 2.2:
 * - Set reminder in ≤3 taps
 * - Date picker: Today, Tomorrow, This Week, Next Week, Custom
 * - Confirmation toast after setting
 */

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar, Clock, Check, ChevronRight } from 'lucide-react';
import { suggestDueDate } from '@/lib/nudges/evaluators/promise-due';

interface PromiseQuickAddProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback to close the modal */
  onOpenChange: (open: boolean) => void;
  /** Customer ID */
  customerId: string;
  /** Customer name (for display) */
  customerName: string;
  /** Optional job ID */
  jobId?: string;
  /** Pre-filled description from detected note */
  initialDescription?: string;
  /** Source note text */
  sourceNote?: string;
  /** Callback when reminder is created */
  onCreated?: (reminder: CreatedReminder) => void;
}

interface CreatedReminder {
  id: string;
  description: string;
  dueDate: string;
  customerId: string;
  jobId?: string;
}

type DateOption = 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'custom';

/**
 * Get the date for each quick option
 */
function getDateForOption(option: DateOption): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (option) {
    case 'today':
      return today;

    case 'tomorrow': {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }

    case 'this_week': {
      // Friday, or Monday if Fri/Sat/Sun
      const dayOfWeek = today.getDay();
      const result = new Date(today);

      if (dayOfWeek >= 5) {
        // Friday, Saturday, or Sunday -> next Monday
        result.setDate(result.getDate() + ((8 - dayOfWeek) % 7 || 7));
      } else {
        // Otherwise -> Friday
        result.setDate(result.getDate() + (5 - dayOfWeek));
      }
      return result;
    }

    case 'next_week': {
      // Next Monday
      const nextMonday = new Date(today);
      const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
      nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
      return nextMonday;
    }

    case 'custom':
    default:
      return today;
  }
}

/**
 * Format date option label
 */
function formatDateOptionLabel(option: DateOption): string {
  const date = getDateForOption(option);

  switch (option) {
    case 'today':
      return 'Today';
    case 'tomorrow':
      return 'Tomorrow';
    case 'this_week':
      return `This Week (${date.toLocaleDateString('en-US', { weekday: 'short' })})`;
    case 'next_week':
      return `Next Week (${date.toLocaleDateString('en-US', { weekday: 'short' })})`;
    case 'custom':
      return 'Pick Date';
    default:
      return '';
  }
}

/**
 * Promise Quick Add Modal
 */
export function PromiseQuickAdd({
  open,
  onOpenChange,
  customerId,
  customerName,
  jobId,
  initialDescription = '',
  sourceNote,
  onCreated,
}: PromiseQuickAddProps) {
  const [description, setDescription] = useState(initialDescription);
  const [selectedOption, setSelectedOption] = useState<DateOption | null>(null);
  const [customDate, setCustomDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Date options
  const dateOptions: DateOption[] = ['today', 'tomorrow', 'this_week', 'next_week', 'custom'];

  // Reset state when modal opens
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        setDescription(initialDescription);
        setSelectedOption(null);
        setCustomDate('');
        setShowCustomPicker(false);
      }
      onOpenChange(newOpen);
    },
    [initialDescription, onOpenChange]
  );

  // Handle date option selection
  const handleOptionSelect = useCallback((option: DateOption) => {
    if (option === 'custom') {
      setShowCustomPicker(true);
      setSelectedOption(null);
    } else {
      setSelectedOption(option);
      setShowCustomPicker(false);
    }
  }, []);

  // Handle custom date selection
  const handleCustomDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCustomDate(e.target.value);
      if (e.target.value) {
        setSelectedOption('custom');
      }
    },
    []
  );

  // Get the final due date
  const dueDate = useMemo(() => {
    if (selectedOption === 'custom' && customDate) {
      return customDate;
    }
    if (selectedOption && selectedOption !== 'custom') {
      return getDateForOption(selectedOption).toISOString().split('T')[0];
    }
    return null;
  }, [selectedOption, customDate]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!dueDate || !description.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/promises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          jobId,
          description: description.trim(),
          sourceNote,
          dueDate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create reminder');
      }

      const data = await response.json();

      onCreated?.({
        id: data.id,
        description: description.trim(),
        dueDate,
        customerId,
        jobId,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error creating reminder:', error);
      // Could show error toast here
    } finally {
      setIsSubmitting(false);
    }
  }, [
    dueDate,
    description,
    customerId,
    jobId,
    sourceNote,
    onCreated,
    onOpenChange,
  ]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-text-muted" />
            Follow-up Reminder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Customer info */}
          <p className="text-sm text-text-muted">
            For: <span className="text-text font-medium">{customerName}</span>
          </p>

          {/* Description input */}
          <div>
            <label className="text-sm font-medium text-text mb-1.5 block">
              What do you need to follow up on?
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Send quote for AC repair"
              className={cn(
                'w-full h-12 px-3 rounded-lg',
                'bg-background border border-border',
                'text-text placeholder:text-text-muted',
                'focus:outline-none focus:ring-2 focus:ring-primary/50'
              )}
              autoFocus
            />
          </div>

          {/* Date options - Per spec: Today, Tomorrow, This Week, Next Week, Custom */}
          <div>
            <label className="text-sm font-medium text-text mb-2 block">
              When?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {dateOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleOptionSelect(option)}
                  className={cn(
                    'flex items-center justify-between',
                    'h-12 px-3 rounded-lg border',
                    'text-sm font-medium transition-colors',
                    option === 'custom' && showCustomPicker
                      ? 'border-primary bg-primary/5 text-primary'
                      : selectedOption === option
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-background text-text hover:bg-muted/50'
                  )}
                >
                  <span>{formatDateOptionLabel(option)}</span>
                  {selectedOption === option && option !== 'custom' && (
                    <Check className="h-4 w-4" />
                  )}
                  {option === 'custom' && (
                    <Calendar className="h-4 w-4 text-text-muted" />
                  )}
                </button>
              ))}
            </div>

            {/* Custom date picker */}
            {showCustomPicker && (
              <div className="mt-3">
                <input
                  type="date"
                  value={customDate}
                  onChange={handleCustomDateChange}
                  min={new Date().toISOString().split('T')[0]}
                  className={cn(
                    'w-full h-12 px-3 rounded-lg',
                    'bg-background border border-border',
                    'text-text',
                    'focus:outline-none focus:ring-2 focus:ring-primary/50'
                  )}
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 min-h-[44px]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!dueDate || !description.trim() || isSubmitting}
            className="flex-1 min-h-[44px]"
          >
            {isSubmitting ? 'Creating...' : 'Set Reminder'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for managing promise quick add state
 */
export function usePromiseQuickAdd() {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<{
    customerId: string;
    customerName: string;
    jobId?: string;
    description?: string;
    sourceNote?: string;
  } | null>(null);

  const open = useCallback(
    (ctx: {
      customerId: string;
      customerName: string;
      jobId?: string;
      description?: string;
      sourceNote?: string;
    }) => {
      setContext(ctx);
      setIsOpen(true);
    },
    []
  );

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    context,
    open,
    close,
    setIsOpen,
  };
}
