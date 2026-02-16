/**
 * "While I'm Here" Evaluator
 *
 * Per CIL Spec Section 3.2:
 * - Surfaces documented historical insights during invoice creation
 * - Informed service, not upselling
 * - Sources: Equipment age, tech observations, customer requests, recurring issues
 * - Dismissible per-job
 */

import type { NudgeEvaluator, NudgeEvaluatorResult, NudgeContext } from '../types';
import { calculateContextHash } from '../dismissal-store';

const EQUIPMENT_AGE_THRESHOLD_YEARS = 8;
const RECURRING_ISSUE_THRESHOLD = 2;
const RECURRING_ISSUE_MONTHS = 12;

/**
 * Suggestion source types
 */
export type SuggestionSource =
  | 'equipment_age'
  | 'tech_observation'
  | 'customer_request'
  | 'recurring_issue';

/**
 * While I'm Here suggestion
 */
export interface WhileImHereSuggestion {
  id: string;
  source: SuggestionSource;
  title: string;
  description: string;
  priority: number;
  equipmentId?: string;
  jobId?: string;
  noteText?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Keywords that indicate tech observations
 */
const OBSERVATION_KEYWORDS = [
  'noted',
  'observed',
  'noticed',
  'recommend',
  'should consider',
  'may need',
  'showing signs',
  'starting to',
  'beginning to',
  'worn',
  'aging',
  'older',
];

/**
 * Keywords that indicate customer requests
 */
const REQUEST_KEYWORDS = [
  'asked about',
  'interested in',
  'wanted to know',
  'inquired',
  'considering',
  'thinking about',
  'mentioned',
  'wants',
  'would like',
];

/**
 * Detect observation keywords in note text
 */
function detectObservation(text: string): string | null {
  const lowerText = text.toLowerCase();

  for (const keyword of OBSERVATION_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return keyword;
    }
  }

  return null;
}

/**
 * Detect customer request keywords in note text
 */
function detectRequest(text: string): string | null {
  const lowerText = text.toLowerCase();

  for (const keyword of REQUEST_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return keyword;
    }
  }

  return null;
}

/**
 * Generate suggestions from equipment data
 */
function generateEquipmentSuggestions(
  equipment: NudgeContext['equipment']
): WhileImHereSuggestion[] {
  if (!equipment || equipment.length === 0) return [];

  const suggestions: WhileImHereSuggestion[] = [];

  for (const equip of equipment) {
    if (equip.age && equip.age >= EQUIPMENT_AGE_THRESHOLD_YEARS) {
      suggestions.push({
        id: `equipment-age-${equip.id}`,
        source: 'equipment_age',
        title: `${equip.type} is ${equip.age} years old`,
        description: 'May be approaching end of service life',
        priority: 5,
        equipmentId: equip.id,
        metadata: {
          equipmentType: equip.type,
          age: equip.age,
          installDate: equip.installDate,
        },
      });
    }
  }

  return suggestions;
}

/**
 * Generate suggestions from job notes
 * This would typically come from the database
 */
function generateNoteSuggestions(
  notes: Array<{ id: string; text: string; jobId: string; createdAt: Date }>
): WhileImHereSuggestion[] {
  const suggestions: WhileImHereSuggestion[] = [];

  for (const note of notes) {
    // Check for tech observations
    const observation = detectObservation(note.text);
    if (observation) {
      suggestions.push({
        id: `observation-${note.id}`,
        source: 'tech_observation',
        title: 'Tech observation',
        description: note.text.substring(0, 100) + (note.text.length > 100 ? '...' : ''),
        priority: 4,
        jobId: note.jobId,
        noteText: note.text,
      });
      continue;
    }

    // Check for customer requests
    const request = detectRequest(note.text);
    if (request) {
      suggestions.push({
        id: `request-${note.id}`,
        source: 'customer_request',
        title: 'Customer request',
        description: note.text.substring(0, 100) + (note.text.length > 100 ? '...' : ''),
        priority: 4,
        jobId: note.jobId,
        noteText: note.text,
      });
    }
  }

  return suggestions;
}

/**
 * "While I'm Here" Evaluator
 */
export const whileImHereEvaluator: NudgeEvaluator = {
  id: 'while-im-here',
  source: 'while_im_here',
  entityTypes: ['job'],

  async evaluate(context: NudgeContext): Promise<NudgeEvaluatorResult> {
    // Only show on invoice creation screen
    if (context.screen !== 'invoice_create') {
      return { shouldShow: false };
    }

    const { job, equipment, customer } = context;

    if (!job || !customer) {
      return { shouldShow: false };
    }

    // Collect all suggestions
    const allSuggestions: WhileImHereSuggestion[] = [];

    // Equipment age suggestions
    const equipmentSuggestions = generateEquipmentSuggestions(equipment);
    allSuggestions.push(...equipmentSuggestions);

    // Note-based suggestions (would come from context)
    const previousNotes = (context.entity?.data?.previousNotes as Array<{
      id: string;
      text: string;
      jobId: string;
      createdAt: Date;
    }>) || [];
    const noteSuggestions = generateNoteSuggestions(previousNotes);
    allSuggestions.push(...noteSuggestions);

    // No suggestions to show
    if (allSuggestions.length === 0) {
      return { shouldShow: false };
    }

    // Sort by priority (higher first)
    allSuggestions.sort((a, b) => b.priority - a.priority);

    // Context hash for the job (dismissal is per-job)
    const contextHash = calculateContextHash({
      jobId: job.id,
      suggestionCount: allSuggestions.length,
    });

    // Return as a single nudge that links to the drawer
    return {
      shouldShow: true,
      contextHash,
      nudge: {
        type: 'insight',
        entityType: 'job',
        entityId: job.id,
        message: 'Notes from previous visits',
        description: `${allSuggestions.length} suggestion${allSuggestions.length > 1 ? 's' : ''}`,
        actionLabel: 'View →',
        actionHandler: 'open_while_im_here_drawer',
        priority: 4,
        source: 'while_im_here',
        metadata: {
          suggestions: allSuggestions,
          jobId: job.id,
          customerId: customer.id,
        },
      },
    };
  },
};

/**
 * Get all "While I'm Here" suggestions for a job
 * Used by the drawer component
 */
export async function getWhileImHereSuggestions(
  jobId: string,
  customerId: string,
  equipment: NudgeContext['equipment'],
  previousNotes: Array<{ id: string; text: string; jobId: string; createdAt: Date }>
): Promise<WhileImHereSuggestion[]> {
  const allSuggestions: WhileImHereSuggestion[] = [];

  // Equipment age suggestions
  const equipmentSuggestions = generateEquipmentSuggestions(equipment);
  allSuggestions.push(...equipmentSuggestions);

  // Note-based suggestions
  const noteSuggestions = generateNoteSuggestions(previousNotes);
  allSuggestions.push(...noteSuggestions);

  // Sort by priority
  return allSuggestions.sort((a, b) => b.priority - a.priority);
}

/**
 * Format suggestion for display
 */
export function formatSuggestionIcon(source: SuggestionSource): string {
  switch (source) {
    case 'equipment_age':
      return '🔧';
    case 'tech_observation':
      return '👁️';
    case 'customer_request':
      return '💬';
    case 'recurring_issue':
      return '⚠️';
    default:
      return '📋';
  }
}

/**
 * Format suggestion source label
 */
export function formatSuggestionSourceLabel(source: SuggestionSource): string {
  switch (source) {
    case 'equipment_age':
      return 'Equipment Age';
    case 'tech_observation':
      return 'Tech Observation';
    case 'customer_request':
      return 'Customer Request';
    case 'recurring_issue':
      return 'Recurring Issue';
    default:
      return 'Suggestion';
  }
}
