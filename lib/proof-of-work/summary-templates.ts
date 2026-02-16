// =====================================================
// SUMMARY TEMPLATE SELECTOR SERVICE
//
// Selects the appropriate work summary template based on
// trade, category, and job outcome
//
// Templates are pre-seeded and LOCKED - no user editing
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { SummaryTemplate, JobOutcome } from '@/types/proof-of-work';

/**
 * Select the best matching summary template
 *
 * Priority order:
 * 1. Exact match: trade + category + outcome
 * 2. Trade default: trade + NULL category + outcome
 * 3. Universal: NULL trade + NULL category + outcome
 */
export async function selectSummaryTemplate(
  trade: string | null,
  category: string | null,
  outcome: JobOutcome
): Promise<SummaryTemplate | null> {
  const supabase = createAdminClient();

  // Try exact match first (trade + category + outcome)
  if (trade && category) {
    const { data: exactMatch } = await supabase
      .from('summary_templates')
      .select('*')
      .eq('trade', trade)
      .eq('category', category)
      .eq('outcome', outcome)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (exactMatch) {
      return exactMatch as SummaryTemplate;
    }
  }

  // Try trade default (trade + NULL category + outcome)
  if (trade) {
    const { data: tradeDefault } = await supabase
      .from('summary_templates')
      .select('*')
      .eq('trade', trade)
      .is('category', null)
      .eq('outcome', outcome)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (tradeDefault) {
      return tradeDefault as SummaryTemplate;
    }
  }

  // Fall back to universal template (NULL trade + NULL category + outcome)
  const { data: universal, error } = await supabase
    .from('summary_templates')
    .select('*')
    .is('trade', null)
    .is('category', null)
    .eq('outcome', outcome)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    logger.error({
      msg: 'Failed to select summary template',
      trade,
      category,
      outcome,
      error,
    });
  }

  return universal as SummaryTemplate | null;
}

/**
 * Get all active templates for a trade (for admin display)
 */
export async function getTemplatesForTrade(
  trade: string | null
): Promise<SummaryTemplate[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('summary_templates')
    .select('*')
    .eq('is_active', true)
    .order('outcome', { ascending: true })
    .order('category', { ascending: true, nullsFirst: true });

  if (trade) {
    // Get trade-specific and universal templates
    query = query.or(`trade.eq.${trade},trade.is.null`);
  } else {
    // Only universal templates
    query = query.is('trade', null);
  }

  const { data, error } = await query;

  if (error) {
    logger.error({
      msg: 'Failed to get templates for trade',
      trade,
      error,
    });
    return [];
  }

  return data as SummaryTemplate[];
}

/**
 * Get all unique trades that have templates
 */
export async function getTemplatedTrades(): Promise<string[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('summary_templates')
    .select('trade')
    .eq('is_active', true)
    .not('trade', 'is', null);

  if (error) {
    logger.error({
      msg: 'Failed to get templated trades',
      error,
    });
    return [];
  }

  // Get unique trades
  const trades = new Set(data?.map((t) => t.trade).filter(Boolean));
  return Array.from(trades) as string[];
}

/**
 * Get template by ID
 */
export async function getTemplateById(
  templateId: string
): Promise<SummaryTemplate | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('summary_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      logger.error({
        msg: 'Failed to get template by ID',
        templateId,
        error,
      });
    }
    return null;
  }

  return data as SummaryTemplate;
}

/**
 * Map common trade names to normalized values
 */
const TRADE_ALIASES: Record<string, string> = {
  // HVAC variations
  hvac: 'HVAC',
  'heating and cooling': 'HVAC',
  'air conditioning': 'HVAC',
  ac: 'HVAC',

  // Plumbing variations
  plumbing: 'Plumbing',
  plumber: 'Plumbing',

  // Electrical variations
  electrical: 'Electrical',
  electrician: 'Electrical',
  electric: 'Electrical',

  // General/Handyman variations
  general: 'General',
  handyman: 'General',
  maintenance: 'General',
};

/**
 * Normalize trade name for template lookup
 */
export function normalizeTradeName(trade: string | null): string | null {
  if (!trade) return null;

  const normalized = trade.toLowerCase().trim();
  return TRADE_ALIASES[normalized] || trade;
}

/**
 * Get the default summary text for an outcome (fallback)
 */
export function getDefaultSummaryText(outcome: JobOutcome): string {
  switch (outcome) {
    case 'COMPLETED':
      return 'Service completed successfully. All work performed as requested.';
    case 'DIAGNOSED':
      return 'Diagnostic assessment completed. Findings documented for review.';
    case 'PARTIAL':
      return 'Initial work completed. Additional service may be required.';
    case 'DEFERRED':
      return 'Service visit completed. Work deferred pending customer approval or parts.';
    default:
      return 'Service completed.';
  }
}
