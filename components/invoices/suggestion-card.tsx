'use client';

/**
 * Suggestion Card for "While I'm Here" Drawer
 *
 * Per CIL Spec Section 3.2:
 * - Individual suggestion with source icon
 * - Actions: Add to invoice, Add note, Dismiss
 * - Link-weight styling (NOT button styling)
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Wrench, Eye, MessageSquare, AlertTriangle, Plus, FileText, X } from 'lucide-react';

export interface Suggestion {
  id: string;
  type: 'equipment_age' | 'tech_observation' | 'customer_request' | 'recurring_issue';
  title: string;
  description: string;
  sourceJobId?: string;
  sourceDate?: string;
  equipmentId?: string;
  equipmentName?: string;
  priority: number;
}

interface SuggestionCardProps {
  suggestion: Suggestion;
  onAddToInvoice: (suggestion: Suggestion) => void;
  onAddNote: (suggestion: Suggestion) => void;
  onDismiss: (suggestionId: string) => void;
  className?: string;
}

/**
 * Get icon for suggestion type
 */
function getSuggestionIcon(type: Suggestion['type']) {
  switch (type) {
    case 'equipment_age':
      return <Wrench className="h-4 w-4" />;
    case 'tech_observation':
      return <Eye className="h-4 w-4" />;
    case 'customer_request':
      return <MessageSquare className="h-4 w-4" />;
    case 'recurring_issue':
      return <AlertTriangle className="h-4 w-4" />;
    default:
      return <Wrench className="h-4 w-4" />;
  }
}

/**
 * Get label for suggestion type
 */
function getSuggestionLabel(type: Suggestion['type']): string {
  switch (type) {
    case 'equipment_age':
      return 'Equipment';
    case 'tech_observation':
      return 'Observation';
    case 'customer_request':
      return 'Customer request';
    case 'recurring_issue':
      return 'Recurring';
    default:
      return 'Insight';
  }
}

/**
 * Suggestion Card Component
 *
 * Per spec: Link-weight styling, not aggressive
 */
export function SuggestionCard({
  suggestion,
  onAddToInvoice,
  onAddNote,
  onDismiss,
  className,
}: SuggestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAddToInvoice = useCallback(() => {
    onAddToInvoice(suggestion);
  }, [suggestion, onAddToInvoice]);

  const handleAddNote = useCallback(() => {
    onAddNote(suggestion);
  }, [suggestion, onAddNote]);

  const handleDismiss = useCallback(() => {
    onDismiss(suggestion.id);
  }, [suggestion.id, onDismiss]);

  return (
    <div
      className={cn(
        'border border-border/50 rounded bg-background',
        'transition-none', // No animation per spec
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-start gap-3 p-3',
          'text-left min-h-[44px]',
          'hover:bg-muted/30 transition-colors'
        )}
      >
        <span className="text-text-muted shrink-0 mt-0.5">
          {getSuggestionIcon(suggestion.type)}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted font-normal">
              {getSuggestionLabel(suggestion.type)}
            </span>
            {suggestion.sourceDate && (
              <span className="text-xs text-text-muted/60">
                {new Date(suggestion.sourceDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            )}
          </div>
          <p className="text-sm text-text font-normal mt-0.5 line-clamp-2">
            {suggestion.title}
          </p>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0">
          {/* Full description */}
          {suggestion.description && suggestion.description !== suggestion.title && (
            <p className="text-sm text-text-muted font-normal mb-3 pl-7">
              {suggestion.description}
            </p>
          )}

          {/* Equipment info */}
          {suggestion.equipmentName && (
            <p className="text-xs text-text-muted/70 mb-3 pl-7">
              Equipment: {suggestion.equipmentName}
            </p>
          )}

          {/* Actions - Link-weight styling per spec */}
          <div className="flex items-center gap-1 pl-7">
            <button
              onClick={handleAddToInvoice}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1.5',
                'text-xs font-normal text-text-muted hover:text-text',
                'min-h-[44px] transition-colors'
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              Add to invoice
            </button>
            <button
              onClick={handleAddNote}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1.5',
                'text-xs font-normal text-text-muted hover:text-text',
                'min-h-[44px] transition-colors'
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              Add note
            </button>
            <button
              onClick={handleDismiss}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1.5 ml-auto',
                'text-xs font-normal text-text-muted/50 hover:text-text-muted',
                'min-h-[44px] transition-colors'
              )}
            >
              <X className="h-3.5 w-3.5" />
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
