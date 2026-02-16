// =====================================================
// SPOKE - CLARIFICATION FLOW
//
// Per Spoke Spec Section 6.3:
// Handle ambiguous job matches via SMS clarification.
//
// Flow:
// 1. Detect ambiguous match or low confidence
// 2. Create DRAFT status spoke_update
// 3. Send clarification SMS with numbered options
// 4. Process reply to assign job
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { smsLogger } from '@/lib/logger';
import { sendSMS } from '@/lib/twilio/sms';
import type { CompositeMatchResult } from './composite-scorer';

const clarificationLogger = smsLogger.child({ context: 'spoke.clarification' });

// =====================================================
// TYPES
// =====================================================

export interface ClarificationOptions {
  spokeUpdateId: string;
  contractorPhone: string;
  matchResult: CompositeMatchResult;
  transcript?: string;
}

export interface ClarificationMessage {
  message: string;
  options: Array<{
    number: number;
    jobId: string;
    customerName: string;
  }>;
}

export interface ClarificationReply {
  spokeUpdateId: string;
  selectedJobId: string | null;
  selectedOption: number | null;
  rawReply: string;
  isValid: boolean;
  error?: string;
}

// =====================================================
// CLARIFICATION MESSAGE GENERATION
// =====================================================

/**
 * Generate clarification SMS for ambiguous match
 */
export function generateClarificationMessage(
  matchResult: CompositeMatchResult,
  context?: {
    mentionedName?: string;
    additionalJobs?: Array<{ jobId: string; customerName: string }>;
  }
): ClarificationMessage {
  const options: ClarificationMessage['options'] = [];

  // Add best match as option 1 (if exists)
  if (matchResult.matchedJob) {
    options.push({
      number: 1,
      jobId: matchResult.matchedJob.jobId,
      customerName: matchResult.matchedJob.customerName,
    });
  }

  // Add alternatives
  for (const alt of matchResult.alternatives) {
    if (options.length >= 4) break; // Max 4 options
    options.push({
      number: options.length + 1,
      jobId: alt.jobId,
      customerName: alt.customerName,
    });
  }

  // Add any additional jobs from context
  if (context?.additionalJobs) {
    for (const job of context.additionalJobs) {
      if (options.length >= 4) break;
      if (!options.some(o => o.jobId === job.jobId)) {
        options.push({
          number: options.length + 1,
          jobId: job.jobId,
          customerName: job.customerName,
        });
      }
    }
  }

  // Build message
  let message: string;

  if (options.length === 0) {
    message = 'Update received but no matching job found. Reply with customer name or job details.';
  } else if (matchResult.isAmbiguous) {
    const optionList = options
      .map(o => `${o.number}. ${o.customerName}`)
      .join('\n');
    message = `Multiple possible jobs. Which one?\n${optionList}\n\nReply with number.`;
  } else if (!matchResult.meetsThreshold) {
    const optionList = options
      .map(o => `${o.number}. ${o.customerName}`)
      .join('\n');
    message = `Please confirm the job:\n${optionList}\n\nReply with number or "NEW" for different job.`;
  } else {
    // Shouldn't reach here normally, but handle gracefully
    message = `Confirm: ${options[0]?.customerName}?\nReply 1 to confirm or customer name for different job.`;
  }

  return { message, options };
}

/**
 * Generate clarification for multi-job detection
 * Per Beta Constraint: Detection only, create DRAFT
 */
export function generateMultiJobClarificationMessage(
  segments: Array<{ customerHint?: string }>,
  candidateJobs?: Array<{ jobId: string; customerName: string }>
): ClarificationMessage {
  const options: ClarificationMessage['options'] = [];

  // Prefer candidate jobs if available
  if (candidateJobs && candidateJobs.length > 0) {
    for (const job of candidateJobs.slice(0, 4)) {
      options.push({
        number: options.length + 1,
        jobId: job.jobId,
        customerName: job.customerName,
      });
    }
  } else {
    // Use customer hints from segments
    const hints = segments
      .filter(s => s.customerHint)
      .map(s => s.customerHint!)
      .slice(0, 4);

    for (const hint of hints) {
      options.push({
        number: options.length + 1,
        jobId: '', // Will need to look up
        customerName: hint,
      });
    }
  }

  const optionList = options
    .map(o => `${o.number}. ${o.customerName}`)
    .join('\n');

  const message = `Multiple jobs mentioned. Which job is this update for?\n${optionList}\n\nReply with number.`;

  return { message, options };
}

// =====================================================
// SEND CLARIFICATION
// =====================================================

/**
 * Send clarification SMS and create draft
 */
export async function sendClarificationSms(
  options: ClarificationOptions
): Promise<{ success: boolean; draftId?: string; error?: string }> {
  const { spokeUpdateId, contractorPhone, matchResult, transcript } = options;

  try {
    const supabase = createAdminClient();

    // Generate clarification message
    const clarification = generateClarificationMessage(matchResult);

    // Get business ID
    const businessId = await getBusinessIdForUpdate(spokeUpdateId);

    // Create draft record
    const { data: draft, error: draftError } = await supabase
      .from('spoke_drafts')
      .insert({
        spoke_update_id: spokeUpdateId,
        business_id: businessId,
        clarification_options: clarification.options,
        clarification_sent_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (draftError) {
      clarificationLogger.error({
        msg: 'Failed to create draft',
        error: draftError,
        spokeUpdateId,
      });
      return { success: false, error: 'Failed to create draft record' };
    }

    // Update spoke_update status to DRAFT
    await supabase
      .from('spoke_updates')
      .update({
        status: 'DRAFT',
        needs_clarification: true,
        clarification_type: matchResult.isAmbiguous ? 'AMBIGUOUS_MATCH' : 'LOW_CONFIDENCE',
      })
      .eq('id', spokeUpdateId);

    // Send SMS
    const smsResult = await sendSMS({
      to: contractorPhone,
      body: clarification.message,
      businessId,
    });

    if (!smsResult.success) {
      clarificationLogger.error({
        msg: 'Failed to send clarification SMS',
        error: smsResult.error,
        spokeUpdateId,
        contractorPhone,
      });
      return { success: false, draftId: draft.id, error: 'SMS delivery failed' };
    }

    clarificationLogger.info({
      msg: 'Clarification SMS sent',
      spokeUpdateId,
      draftId: draft.id,
      optionCount: clarification.options.length,
      contractorPhone,
    });

    return { success: true, draftId: draft.id };

  } catch (error) {
    clarificationLogger.error({
      msg: 'Error sending clarification',
      error: error instanceof Error ? error.message : String(error),
      spokeUpdateId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =====================================================
// PROCESS CLARIFICATION REPLY
// =====================================================

/**
 * Parse and process a clarification reply
 */
export async function processClarificationReply(
  contractorPhone: string,
  replyText: string
): Promise<ClarificationReply> {
  const supabase = createAdminClient();

  try {
    // Find the most recent draft for this contractor
    const { data: phoneRecord } = await supabase
      .from('contractor_phones')
      .select('id, business_id')
      .eq('phone_number', contractorPhone)
      .single();

    if (!phoneRecord) {
      return {
        spokeUpdateId: '',
        selectedJobId: null,
        selectedOption: null,
        rawReply: replyText,
        isValid: false,
        error: 'Unknown phone number',
      };
    }

    // Find pending draft
    const { data: draft } = await supabase
      .from('spoke_drafts')
      .select(`
        id,
        spoke_update_id,
        clarification_options,
        spoke_updates!inner (
          id,
          contractor_phone_id
        )
      `)
      .eq('spoke_updates.contractor_phone_id', phoneRecord.id)
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!draft) {
      return {
        spokeUpdateId: '',
        selectedJobId: null,
        selectedOption: null,
        rawReply: replyText,
        isValid: false,
        error: 'No pending clarification found',
      };
    }

    const options = draft.clarification_options as Array<{
      number: number;
      jobId: string;
      customerName: string;
    }>;

    // Parse reply
    const trimmedReply = replyText.trim().toLowerCase();

    // Check for numeric selection
    const numericMatch = trimmedReply.match(/^(\d)$/);
    if (numericMatch) {
      const selectedNumber = parseInt(numericMatch[1], 10);
      const selectedOption = options.find(o => o.number === selectedNumber);

      if (selectedOption) {
        return {
          spokeUpdateId: draft.spoke_update_id,
          selectedJobId: selectedOption.jobId,
          selectedOption: selectedNumber,
          rawReply: replyText,
          isValid: true,
        };
      } else {
        return {
          spokeUpdateId: draft.spoke_update_id,
          selectedJobId: null,
          selectedOption: selectedNumber,
          rawReply: replyText,
          isValid: false,
          error: `Invalid option ${selectedNumber}. Choose 1-${options.length}.`,
        };
      }
    }

    // Check for "NEW" keyword
    if (trimmedReply === 'new' || trimmedReply === 'other' || trimmedReply === 'different') {
      return {
        spokeUpdateId: draft.spoke_update_id,
        selectedJobId: null,
        selectedOption: null,
        rawReply: replyText,
        isValid: true,
        error: 'User requested different job - manual assignment needed',
      };
    }

    // Check for customer name match
    const matchedByName = options.find(o =>
      o.customerName.toLowerCase().includes(trimmedReply) ||
      trimmedReply.includes(o.customerName.toLowerCase())
    );

    if (matchedByName) {
      return {
        spokeUpdateId: draft.spoke_update_id,
        selectedJobId: matchedByName.jobId,
        selectedOption: matchedByName.number,
        rawReply: replyText,
        isValid: true,
      };
    }

    // Invalid reply
    return {
      spokeUpdateId: draft.spoke_update_id,
      selectedJobId: null,
      selectedOption: null,
      rawReply: replyText,
      isValid: false,
      error: `Didn't understand "${replyText}". Reply with a number (1-${options.length}) or customer name.`,
    };

  } catch (error) {
    clarificationLogger.error({
      msg: 'Error processing clarification reply',
      error: error instanceof Error ? error.message : String(error),
      contractorPhone,
    });

    return {
      spokeUpdateId: '',
      selectedJobId: null,
      selectedOption: null,
      rawReply: replyText,
      isValid: false,
      error: 'Processing error',
    };
  }
}

/**
 * Resolve a draft by assigning it to a job
 */
export async function resolveDraft(
  spokeUpdateId: string,
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  try {
    // Update spoke_update with job assignment
    const { error: updateError } = await supabase
      .from('spoke_updates')
      .update({
        job_id: jobId,
        status: 'PROCESSED',
        needs_clarification: false,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', spokeUpdateId);

    if (updateError) {
      throw updateError;
    }

    // Mark draft as resolved
    await supabase
      .from('spoke_drafts')
      .update({
        assigned_to_job_id: jobId,
        resolved_at: new Date().toISOString(),
      })
      .eq('spoke_update_id', spokeUpdateId);

    clarificationLogger.info({
      msg: 'Draft resolved',
      spokeUpdateId,
      jobId,
    });

    return { success: true };

  } catch (error) {
    clarificationLogger.error({
      msg: 'Failed to resolve draft',
      error: error instanceof Error ? error.message : String(error),
      spokeUpdateId,
      jobId,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get business ID for a spoke update
 */
async function getBusinessIdForUpdate(spokeUpdateId: string): Promise<string> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('spoke_updates')
    .select('business_id')
    .eq('id', spokeUpdateId)
    .single();

  return data?.business_id || '';
}

/**
 * Check if there's a pending clarification for this contractor
 */
export async function hasPendingClarification(
  contractorPhoneId: string
): Promise<{ pending: boolean; draftId?: string; spokeUpdateId?: string }> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('spoke_drafts')
    .select(`
      id,
      spoke_update_id,
      spoke_updates!inner (contractor_phone_id)
    `)
    .eq('spoke_updates.contractor_phone_id', contractorPhoneId)
    .is('resolved_at', null)
    .limit(1)
    .single();

  if (data) {
    return {
      pending: true,
      draftId: data.id,
      spokeUpdateId: data.spoke_update_id,
    };
  }

  return { pending: false };
}

/**
 * Generate follow-up message if no reply received
 */
export function generateFollowUpMessage(
  originalOptions: Array<{ number: number; customerName: string }>
): string {
  if (originalOptions.length === 0) {
    return 'Still need job details. Reply with customer name.';
  }

  return `Reminder: Which job?\n${originalOptions.map(o => `${o.number}. ${o.customerName}`).join('\n')}\n\nReply with number.`;
}
