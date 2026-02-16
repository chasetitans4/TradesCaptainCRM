'use client';

/**
 * "While I'm Here" Suggestions Drawer
 *
 * Per CIL Spec Section 3.2:
 * - Surfaces documented historical insights during invoice creation
 * - Informed service, not upselling
 * - Collapsed by default: "💡 Notes from previous visits →"
 * - Shows only when suggestions exist (no empty state)
 * - Dismissible per-job
 */

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { SuggestionCard, type Suggestion } from './suggestion-card';

interface WhileImHereDrawerProps {
  /** Customer ID to fetch suggestions for */
  customerId: string;
  /** Current job ID for dismissal tracking */
  jobId: string;
  /** Callback when suggestion is added to invoice */
  onAddToInvoice: (description: string) => void;
  /** Callback when suggestion is added as note */
  onAddNote: (note: string) => void;
  /** Custom class name */
  className?: string;
}

interface SuggestionsState {
  suggestions: Suggestion[];
  isLoading: boolean;
  error: string | null;
}

/**
 * "While I'm Here" Drawer Component
 *
 * Per spec:
 * - Link appears ONLY when suggestions exist
 * - Shows equipment age, observations, requests
 * - "Add to invoice" creates description-only line item
 * - Dismissible per-job
 * - No empty state
 */
export function WhileImHereDrawer({
  customerId,
  jobId,
  onAddToInvoice,
  onAddNote,
  className,
}: WhileImHereDrawerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [state, setState] = useState<SuggestionsState>({
    suggestions: [],
    isLoading: true,
    error: null,
  });
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Fetch suggestions on mount
  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const response = await fetch(
          `/api/suggestions/while-im-here?customerId=${customerId}&jobId=${jobId}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch suggestions');
        }

        const data = await response.json();
        setState({
          suggestions: data.suggestions || [],
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setState({
          suggestions: [],
          isLoading: false,
          error: 'Failed to load suggestions',
        });
      }
    }

    fetchSuggestions();
  }, [customerId, jobId]);

  // Load dismissed IDs from localStorage (per-job)
  useEffect(() => {
    const key = `while-im-here-dismissed-${jobId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setDismissedIds(new Set(JSON.parse(stored)));
      } catch {
        // Ignore parse errors
      }
    }
  }, [jobId]);

  // Handle adding suggestion to invoice
  const handleAddToInvoice = useCallback(
    (suggestion: Suggestion) => {
      // Create description-only line item per spec
      const description = suggestion.equipmentName
        ? `${suggestion.title} (${suggestion.equipmentName})`
        : suggestion.title;
      onAddToInvoice(description);

      // Auto-dismiss after adding
      handleDismiss(suggestion.id);
    },
    [onAddToInvoice]
  );

  // Handle adding suggestion as note
  const handleAddNote = useCallback(
    (suggestion: Suggestion) => {
      const note = `[Previous observation] ${suggestion.title}`;
      onAddNote(note);

      // Auto-dismiss after adding
      handleDismiss(suggestion.id);
    },
    [onAddNote]
  );

  // Handle dismissing suggestion (per-job)
  const handleDismiss = useCallback(
    (suggestionId: string) => {
      setDismissedIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(suggestionId);

        // Persist to localStorage (per-job)
        const key = `while-im-here-dismissed-${jobId}`;
        localStorage.setItem(key, JSON.stringify([...newSet]));

        return newSet;
      });
    },
    [jobId]
  );

  // Filter out dismissed suggestions
  const visibleSuggestions = state.suggestions.filter(
    (s) => !dismissedIds.has(s.id)
  );

  // Per spec: Show nothing if no suggestions exist
  if (state.isLoading) {
    return null; // Don't show loading state
  }

  if (visibleSuggestions.length === 0) {
    return null; // No empty state per spec
  }

  return (
    <div
      className={cn(
        // Per spec: Link-weight styling, not aggressive
        'border border-border/50 rounded bg-transparent',
        'transition-none', // No animation per spec
        className
      )}
    >
      {/* Collapsed trigger */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between gap-2',
          'px-3 py-2 min-h-[44px]',
          'text-sm font-normal text-text-muted hover:text-text',
          'transition-colors text-left'
        )}
      >
        <span className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 shrink-0" />
          <span>
            Notes from previous visits
            <span className="ml-1.5 text-text-muted/60">
              ({visibleSuggestions.length})
            </span>
          </span>
        </span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" />
        )}
      </button>

      {/* Expanded suggestions */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {visibleSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onAddToInvoice={handleAddToInvoice}
              onAddNote={handleAddNote}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Hook for managing "While I'm Here" state
 */
export function useWhileImHere(customerId: string, jobId: string) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Fetch suggestions
  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const response = await fetch(
          `/api/suggestions/while-im-here?customerId=${customerId}&jobId=${jobId}`
        );

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSuggestions();
  }, [customerId, jobId]);

  // Load dismissed IDs
  useEffect(() => {
    const key = `while-im-here-dismissed-${jobId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setDismissedIds(new Set(JSON.parse(stored)));
      } catch {
        // Ignore
      }
    }
  }, [jobId]);

  const dismiss = useCallback(
    (suggestionId: string) => {
      setDismissedIds((prev) => {
        const newSet = new Set(prev);
        newSet.add(suggestionId);
        const key = `while-im-here-dismissed-${jobId}`;
        localStorage.setItem(key, JSON.stringify([...newSet]));
        return newSet;
      });
    },
    [jobId]
  );

  const visibleSuggestions = suggestions.filter((s) => !dismissedIds.has(s.id));

  return {
    suggestions: visibleSuggestions,
    isLoading,
    hasSuggestions: visibleSuggestions.length > 0,
    dismiss,
  };
}
