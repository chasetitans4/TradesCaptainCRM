// =====================================================
// SPOKE - EDIT HANDLER
//
// Per Spoke Spec Section 8.3:
// Handle EDIT replies for corrections.
//
// Flow:
// 1. User replies EDIT
// 2. System sends current state summary
// 3. User sends correction
// 4. System parses and applies correction
// 5. System sends confirmation of change
//
// Beta Constraint:
// - Corrections are logged but don't modify system behavior
// - 30-minute EDIT window
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { smsLogger } from '@/lib/logger';
import { sendSMS } from '@/lib/twilio/sms';
import type { SpokeParsedData } from '../types';
import { normalizePaymentAmount, normalizeDuration } from '../parser/normalizer';

const editLogger = smsLogger.child({ context: 'spoke.edit-handler' });

// =====================================================
// TYPES
// =====================================================

export interface EditSession {
  spokeUpdateId: string;
  contractorPhoneId: string;
  contractorPhone: string;
  businessId: string;
  jobId: string | null;
  customerName: string;
  currentData: SpokeParsedData;
  createdAt: Date;
  expiresAt: Date;
}

export interface EditResult {
  success: boolean;
  field?: string;
  originalValue?: any;
  newValue?: any;
  confirmationMessage?: string;
  error?: string;
}

// Edit window duration (30 minutes per spec)
const EDIT_WINDOW_MS = 30 * 60 * 1000;

// =====================================================
// EDIT SESSION MANAGEMENT
// =====================================================

/**
 * Check if spoke update is still editable
 */
export async function isEditable(spokeUpdateId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    const { data } = await supabase
      .from('spoke_updates')
      .select('created_at, status')
      .eq('id', spokeUpdateId)
      .single();

    if (!data) return false;

    // Check if within edit window
    const createdAt = new Date(data.created_at);
    const now = new Date();
    const ageMs = now.getTime() - createdAt.getTime();

    if (ageMs > EDIT_WINDOW_MS) {
      return false;
    }

    // Check status allows editing
    const editableStatuses = ['MATCHED', 'PROCESSED', 'CONFIRMED'];
    return editableStatuses.includes(data.status);

  } catch {
    return false;
  }
}

/**
 * Start an edit session
 */
export async function startEditSession(
  contractorPhone: string
): Promise<EditSession | null> {
  try {
    const supabase = createAdminClient();

    // Find contractor phone record
    const { data: phoneRecord } = await supabase
      .from('contractor_phones')
      .select('id, business_id')
      .eq('phone_number', contractorPhone)
      .single();

    if (!phoneRecord) {
      editLogger.warn({
        msg: 'Unknown phone for edit request',
        contractorPhone,
      });
      return null;
    }

    // Find most recent editable spoke update
    const cutoffTime = new Date(Date.now() - EDIT_WINDOW_MS).toISOString();

    const { data: spokeUpdate } = await supabase
      .from('spoke_updates')
      .select(`
        id,
        job_id,
        parsed_data,
        created_at,
        jobs (
          customers (name)
        )
      `)
      .eq('contractor_phone_id', phoneRecord.id)
      .gte('created_at', cutoffTime)
      .in('status', ['MATCHED', 'PROCESSED', 'CONFIRMED'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!spokeUpdate) {
      editLogger.info({
        msg: 'No editable update found',
        contractorPhone,
        contractorPhoneId: phoneRecord.id,
      });
      return null;
    }

    const customerName = (spokeUpdate.jobs as any)?.customers?.name || 'Unknown';
    const createdAt = new Date(spokeUpdate.created_at);

    return {
      spokeUpdateId: spokeUpdate.id,
      contractorPhoneId: phoneRecord.id,
      contractorPhone,
      businessId: phoneRecord.business_id,
      jobId: spokeUpdate.job_id,
      customerName,
      currentData: spokeUpdate.parsed_data as SpokeParsedData,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + EDIT_WINDOW_MS),
    };

  } catch (error) {
    editLogger.error({
      msg: 'Failed to start edit session',
      error: error instanceof Error ? error.message : String(error),
      contractorPhone,
    });
    return null;
  }
}

/**
 * Generate summary of current state for editing
 */
export function generateEditSummary(session: EditSession): string {
  const data = session.currentData;
  const parts: string[] = [];

  parts.push(`${session.customerName}:`);

  if (data.status) {
    parts.push(`Status: ${data.status.value}`);
  }

  if (data.payment) {
    const method = data.payment.method ? ` (${data.payment.method})` : '';
    parts.push(`Pay: $${data.payment.amount}${method}`);
  }

  if (data.duration) {
    const hours = Math.floor(data.duration.minutes / 60);
    const mins = data.duration.minutes % 60;
    const timeStr = hours > 0 ? `${hours}h${mins > 0 ? mins + 'm' : ''}` : `${mins}m`;
    parts.push(`Time: ${timeStr}`);
  }

  if (data.notes?.value) {
    const notePreview = data.notes.value.length > 30
      ? data.notes.value.slice(0, 30) + '...'
      : data.notes.value;
    parts.push(`Note: ${notePreview}`);
  }

  parts.push('\nReply with correction (e.g. "300 cash" or "2 hours")');

  return parts.join('\n');
}

// =====================================================
// EDIT PARSING
// =====================================================

/**
 * Parse an edit reply to determine what field and value
 */
export function parseEditReply(
  reply: string,
  currentData: SpokeParsedData
): { field: string; value: any } | null {
  const text = reply.trim().toLowerCase();

  // Try payment amount
  const paymentResult = normalizePaymentAmount(reply);
  if (paymentResult) {
    // Check for method
    let method: string | null = null;
    if (/cash/i.test(reply)) method = 'cash';
    else if (/check/i.test(reply)) method = 'check';
    else if (/card|credit|debit/i.test(reply)) method = 'card';
    else if (/zelle/i.test(reply)) method = 'zelle';
    else if (/venmo/i.test(reply)) method = 'venmo';

    return {
      field: 'payment',
      value: {
        amount: paymentResult.value,
        method: method || currentData.payment?.method || null,
      },
    };
  }

  // Try duration
  const durationResult = normalizeDuration(reply);
  if (durationResult) {
    return {
      field: 'duration',
      value: { minutes: durationResult.value },
    };
  }

  // Try status keywords
  if (/complete|done|finished/i.test(text)) {
    return { field: 'status', value: { value: 'complete' } };
  }
  if (/issue|problem/i.test(text)) {
    return { field: 'status', value: { value: 'issue' } };
  }
  if (/delayed|postponed/i.test(text)) {
    return { field: 'status', value: { value: 'delayed' } };
  }

  // Try explicit field patterns
  const paymentMatch = text.match(/pay(?:ment)?[:\s]+\$?(\d+)/i);
  if (paymentMatch) {
    return {
      field: 'payment',
      value: { amount: parseInt(paymentMatch[1], 10) },
    };
  }

  const timeMatch = text.match(/time[:\s]+(\d+)\s*(h|hr|hour|m|min)/i);
  if (timeMatch) {
    const num = parseInt(timeMatch[1], 10);
    const unit = timeMatch[2].toLowerCase();
    const minutes = unit.startsWith('h') ? num * 60 : num;
    return { field: 'duration', value: { minutes } };
  }

  // If text is longer, treat as note update
  if (text.length > 20) {
    return { field: 'notes', value: { text: reply.trim() } };
  }

  return null;
}

// =====================================================
// APPLY EDIT
// =====================================================

/**
 * Apply an edit to a spoke update
 */
export async function applyEdit(
  spokeUpdateId: string,
  field: string,
  newValue: any,
  contractorPhoneId: string
): Promise<EditResult> {
  try {
    const supabase = createAdminClient();

    // Get current data
    const { data: spokeUpdate } = await supabase
      .from('spoke_updates')
      .select('parsed_data, edit_count')
      .eq('id', spokeUpdateId)
      .single();

    if (!spokeUpdate) {
      return { success: false, error: 'Update not found' };
    }

    const currentData = spokeUpdate.parsed_data as SpokeParsedData;
    const originalValue = (currentData as any)[field];

    // Build updated data
    const updatedData = {
      ...currentData,
      [field]: {
        ...newValue,
        confidence: 1.0, // User-provided = full confidence
        raw_tokens: ['EDIT correction'],
      },
    };

    // Update spoke_update
    await supabase
      .from('spoke_updates')
      .update({
        parsed_data: updatedData,
        edit_count: (spokeUpdate.edit_count || 0) + 1,
        last_edited_at: new Date().toISOString(),
      })
      .eq('id', spokeUpdateId);

    // Log correction (Beta: logged but not used for learning)
    await supabase
      .from('spoke_corrections')
      .insert({
        spoke_update_id: spokeUpdateId,
        contractor_phone_id: contractorPhoneId,
        field_name: field,
        original_value: originalValue,
        corrected_value: newValue,
        correction_method: 'SMS_EDIT',
        time_to_correction: `${Math.floor((Date.now() - new Date(spokeUpdate.parsed_data as any).getTime()) / 1000)} seconds`,
      });

    editLogger.info({
      msg: 'Edit applied',
      spokeUpdateId,
      field,
      originalValue,
      newValue,
    });

    // Generate confirmation message
    const confirmationMessage = generateEditConfirmation(field, newValue);

    return {
      success: true,
      field,
      originalValue,
      newValue,
      confirmationMessage,
    };

  } catch (error) {
    editLogger.error({
      msg: 'Failed to apply edit',
      error: error instanceof Error ? error.message : String(error),
      spokeUpdateId,
      field,
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Edit failed',
    };
  }
}

/**
 * Generate confirmation message for applied edit
 */
function generateEditConfirmation(field: string, value: any): string {
  switch (field) {
    case 'payment':
      const method = value.method ? ` (${value.method})` : '';
      return `✓ Updated payment to $${value.amount}${method}`;

    case 'duration':
      const hours = Math.floor(value.minutes / 60);
      const mins = value.minutes % 60;
      const timeStr = hours > 0 ? `${hours}h${mins > 0 ? mins + 'm' : ''}` : `${mins}m`;
      return `✓ Updated time to ${timeStr}`;

    case 'status':
      return `✓ Updated status to ${value.value}`;

    case 'notes':
      return `✓ Note updated`;

    default:
      return `✓ Updated ${field}`;
  }
}

// =====================================================
// HANDLE EDIT FLOW
// =====================================================

/**
 * Handle incoming EDIT keyword
 */
export async function handleEditKeyword(
  contractorPhone: string
): Promise<{ success: boolean; message: string }> {
  const session = await startEditSession(contractorPhone);

  if (!session) {
    return {
      success: false,
      message: 'No recent update to edit. EDIT is available for 30 minutes after each update.',
    };
  }

  const summary = generateEditSummary(session);

  // Store session reference for follow-up
  const supabase = createAdminClient();
  await supabase
    .from('spoke_updates')
    .update({ edit_session_active: true })
    .eq('id', session.spokeUpdateId);

  // Send summary
  await sendSMS({
    to: contractorPhone,
    body: summary,
    businessId: session.businessId,
  });

  return {
    success: true,
    message: summary,
  };
}

/**
 * Handle edit correction reply
 */
export async function handleEditCorrection(
  contractorPhone: string,
  correction: string
): Promise<{ success: boolean; message: string }> {
  // Find active edit session
  const session = await startEditSession(contractorPhone);

  if (!session) {
    return {
      success: false,
      message: 'Edit window expired. Call in again to make changes.',
    };
  }

  // Parse the correction
  const parsed = parseEditReply(correction, session.currentData);

  if (!parsed) {
    return {
      success: false,
      message: 'Didn\'t understand that. Try: "$300 cash" or "2 hours"',
    };
  }

  // Apply the edit
  const result = await applyEdit(
    session.spokeUpdateId,
    parsed.field,
    parsed.value,
    session.contractorPhoneId
  );

  if (!result.success) {
    return {
      success: false,
      message: result.error || 'Failed to save edit. Please try again.',
    };
  }

  // Clear edit session flag
  const supabase = createAdminClient();
  await supabase
    .from('spoke_updates')
    .update({ edit_session_active: false })
    .eq('id', session.spokeUpdateId);

  // Send confirmation
  if (result.confirmationMessage) {
    await sendSMS({
      to: contractorPhone,
      body: result.confirmationMessage,
      businessId: session.businessId,
    });
  }

  return {
    success: true,
    message: result.confirmationMessage || 'Edit saved.',
  };
}

/**
 * Check if user is in an active edit session
 */
export async function hasActiveEditSession(
  contractorPhone: string
): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    const { data: phoneRecord } = await supabase
      .from('contractor_phones')
      .select('id')
      .eq('phone_number', contractorPhone)
      .single();

    if (!phoneRecord) return false;

    const { data } = await supabase
      .from('spoke_updates')
      .select('id')
      .eq('contractor_phone_id', phoneRecord.id)
      .eq('edit_session_active', true)
      .limit(1)
      .single();

    return !!data;
  } catch {
    return false;
  }
}
