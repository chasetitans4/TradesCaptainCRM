// =====================================================
// CALL TRACKING LIBRARY
// Record, manage, and analyze phone calls
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
const callLogger = logger.child({ context: 'calls' });
import type { CallDirection, CallOutcome, CallLog } from '@/types';

export interface CallLogInput {
  phone: string;
  direction: CallDirection;
  duration_seconds?: number;
  outcome?: CallOutcome;
  notes?: string;
  customer_id?: string;
  lead_id?: string;
  user_id?: string;
  twilio_call_sid?: string;
  recording_url?: string;
}

export interface CallFilters {
  businessId: string;
  direction?: CallDirection;
  outcome?: CallOutcome;
  userId?: string;
  customerId?: string;
  leadId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CallStats {
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  answeredCalls: number;
  missedCalls: number;
  totalDuration: number;
  averageDuration: number;
  byOutcome: Record<string, number>;
  byUser: Record<string, { name: string; count: number; duration: number }>;
}

export interface CallLogWithRelations extends CallLog {
  customer?: { id: string; name: string; phone: string } | null;
  lead?: { id: string; name: string; service_needed: string } | null;
  user?: { id: string; name: string } | null;
}

/**
 * Record a new call log entry
 */
export async function recordCall(
  businessId: string,
  data: CallLogInput
): Promise<CallLog> {
  const supabase = await createClient();

  const { data: call, error } = await supabase
    .from('call_logs')
    .insert({
      business_id: businessId,
      phone: data.phone,
      direction: data.direction,
      duration_seconds: data.duration_seconds || null,
      outcome: data.outcome || null,
      notes: data.notes || null,
      customer_id: data.customer_id || null,
      lead_id: data.lead_id || null,
      user_id: data.user_id || null,
      twilio_call_sid: data.twilio_call_sid || null,
      recording_url: data.recording_url || null,
    })
    .select()
    .single();

  if (error) {
    callLogger.error({ msg: 'Error recording call', error });
    throw new Error('Failed to record call');
  }

  return call;
}

/**
 * Get call logs with filters and relations
 */
export async function getCallLogs(
  filters: CallFilters
): Promise<{ calls: CallLogWithRelations[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from('call_logs')
    .select(
      `
      *,
      customer:customers!call_logs_customer_id_fkey(id, name, phone),
      lead:leads!call_logs_lead_id_fkey(id, name, service_needed),
      user:users!call_logs_user_id_fkey(id, first_name, last_name)
    `,
      { count: 'exact' }
    )
    .eq('business_id', filters.businessId)
    .order('created_at', { ascending: false });

  if (filters.direction) {
    query = query.eq('direction', filters.direction);
  }

  if (filters.outcome) {
    query = query.eq('outcome', filters.outcome);
  }

  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters.customerId) {
    query = query.eq('customer_id', filters.customerId);
  }

  if (filters.leadId) {
    query = query.eq('lead_id', filters.leadId);
  }

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate.toISOString());
  }

  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate.toISOString());
  }

  if (filters.search) {
    query = query.or(
      `phone.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`
    );
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  if (filters.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    callLogger.error({ msg: 'Error fetching call logs', error });
    throw new Error('Failed to fetch call logs');
  }

  return {
    calls: (data || []).map((log: any) => ({
      ...log,
      user: log.user
        ? {
            id: log.user.id,
            name: `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim(),
          }
        : null,
    })) as CallLogWithRelations[],
    total: count || 0,
  };
}

/**
 * Get a single call log by ID
 */
export async function getCallLog(callId: string): Promise<CallLogWithRelations | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('call_logs')
    .select(
      `
      *,
      customer:customers!call_logs_customer_id_fkey(id, name, phone),
      lead:leads!call_logs_lead_id_fkey(id, name, service_needed),
      user:users!call_logs_user_id_fkey(id, first_name, last_name)
    `
    )
    .eq('id', callId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    callLogger.error({ msg: 'Error fetching call log', error });
    throw new Error('Failed to fetch call log');
  }

  const call = data as any;
  return {
    ...call,
    user: call.user
      ? {
          id: call.user.id,
          name: `${call.user.first_name || ''} ${call.user.last_name || ''}`.trim(),
        }
      : null,
  } as CallLogWithRelations;
}

/**
 * Update a call log entry
 */
export async function updateCallLog(
  callId: string,
  updates: Partial<CallLogInput>
): Promise<CallLog> {
  const supabase = await createClient();

  const updateData: Record<string, any> = {};

  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.direction !== undefined) updateData.direction = updates.direction;
  if (updates.duration_seconds !== undefined) updateData.duration_seconds = updates.duration_seconds;
  if (updates.outcome !== undefined) updateData.outcome = updates.outcome;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.customer_id !== undefined) updateData.customer_id = updates.customer_id || null;
  if (updates.lead_id !== undefined) updateData.lead_id = updates.lead_id || null;
  if (updates.user_id !== undefined) updateData.user_id = updates.user_id || null;
  if (updates.recording_url !== undefined) updateData.recording_url = updates.recording_url;

  const { data, error } = await supabase
    .from('call_logs')
    .update(updateData)
    .eq('id', callId)
    .select()
    .single();

  if (error) {
    callLogger.error({ msg: 'Error updating call log', error });
    throw new Error('Failed to update call log');
  }

  return data;
}

/**
 * Delete a call log entry
 */
export async function deleteCallLog(callId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('call_logs')
    .delete()
    .eq('id', callId);

  if (error) {
    callLogger.error({ msg: 'Error deleting call log', error });
    throw new Error('Failed to delete call log');
  }
}

/**
 * Get call statistics for a business
 */
export async function getCallStats(
  businessId: string,
  startDate?: Date,
  endDate?: Date
): Promise<CallStats> {
  const supabase = await createClient();

  let query = supabase
    .from('call_logs')
    .select(
      `
      id,
      direction,
      outcome,
      duration_seconds,
      user_id,
      user:users!call_logs_user_id_fkey(id, name)
    `
    )
    .eq('business_id', businessId);

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString());
  }

  if (endDate) {
    query = query.lte('created_at', endDate.toISOString());
  }

  const { data: calls, error } = await query;

  if (error) {
    callLogger.error({
      msg: 'Error fetching call stats',
      error: error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { message: String(error) },
    });
    throw new Error('Failed to fetch call stats');
  }

  const stats: CallStats = {
    totalCalls: 0,
    inboundCalls: 0,
    outboundCalls: 0,
    answeredCalls: 0,
    missedCalls: 0,
    totalDuration: 0,
    averageDuration: 0,
    byOutcome: {},
    byUser: {},
  };

  (calls || []).forEach((call: any) => {
    stats.totalCalls++;

    if (call.direction === 'inbound') {
      stats.inboundCalls++;
    } else {
      stats.outboundCalls++;
    }

    if (call.outcome === 'answered') {
      stats.answeredCalls++;
    } else if (call.outcome === 'no_answer') {
      stats.missedCalls++;
    }

    if (call.outcome) {
      stats.byOutcome[call.outcome] = (stats.byOutcome[call.outcome] || 0) + 1;
    }

    if (call.duration_seconds) {
      stats.totalDuration += call.duration_seconds;
    }

    if (call.user_id && call.user) {
      if (!stats.byUser[call.user_id]) {
        stats.byUser[call.user_id] = {
          name: call.user.name,
          count: 0,
          duration: 0,
        };
      }
      stats.byUser[call.user_id].count++;
      stats.byUser[call.user_id].duration += call.duration_seconds || 0;
    }
  });

  stats.averageDuration =
    stats.totalCalls > 0 ? Math.round(stats.totalDuration / stats.totalCalls) : 0;

  return stats;
}

/**
 * Get call history for a specific customer
 */
export async function getCustomerCallHistory(
  customerId: string,
  limit: number = 20
): Promise<CallLogWithRelations[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('call_logs')
    .select(
      `
      *,
      user:users!call_logs_user_id_fkey(id, name)
    `
    )
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    callLogger.error({
      msg: 'Error fetching customer call history',
      error: error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { message: String(error) },
    });
    throw new Error('Failed to fetch customer call history');
  }

  return (data as CallLogWithRelations[]) || [];
}

/**
 * Get call history for a specific lead
 */
export async function getLeadCallHistory(
  leadId: string,
  limit: number = 20
): Promise<CallLogWithRelations[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('call_logs')
    .select(
      `
      *,
      user:users!call_logs_user_id_fkey(id, first_name, last_name)
    `
    )
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    callLogger.error({
      msg: 'Error fetching lead call history',
      error: error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { message: String(error) },
    });
    throw new Error('Failed to fetch lead call history');
  }

  return (data as CallLogWithRelations[]) || [];
}

/**
 * Link a call to a customer or lead by phone number
 */
export async function linkCallToContact(
  businessId: string,
  callId: string,
  phone: string
): Promise<CallLog> {
  const supabase = await createClient();

  // First try to find a customer with this phone
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('business_id', businessId)
    .eq('phone', phone)
    .single();

  if (customer) {
    return updateCallLog(callId, { customer_id: customer.id });
  }

  // If no customer, try to find a lead
  const { data: lead } = await supabase
    .from('leads')
    .select('id')
    .eq('business_id', businessId)
    .eq('phone', phone)
    .single();

  if (lead) {
    return updateCallLog(callId, { lead_id: lead.id });
  }

  // No match found, return unchanged
  const call = await getCallLog(callId);
  if (!call) throw new Error('Call not found');
  return call;
}

/**
 * Get today's call activity summary
 */
export async function getTodayCallSummary(businessId: string): Promise<{
  total: number;
  inbound: number;
  outbound: number;
  answered: number;
  missed: number;
  totalDuration: number;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const stats = await getCallStats(businessId, today, tomorrow);

  return {
    total: stats.totalCalls,
    inbound: stats.inboundCalls,
    outbound: stats.outboundCalls,
    answered: stats.answeredCalls,
    missed: stats.missedCalls,
    totalDuration: stats.totalDuration,
  };
}

/**
 * Record an inbound call from Twilio webhook
 */
export async function recordInboundCall(
  businessId: string,
  phone: string,
  twilioCallSid: string,
  userId?: string
): Promise<CallLog> {
  return recordCall(businessId, {
    phone,
    direction: 'inbound',
    twilio_call_sid: twilioCallSid,
    user_id: userId,
  });
}

/**
 * Update call when it ends (from Twilio status callback)
 */
export async function updateCallOnComplete(
  twilioCallSid: string,
  duration: number,
  outcome: CallOutcome,
  recordingUrl?: string
): Promise<CallLog | null> {
  const supabase = await createClient();

  const { data: call } = await supabase
    .from('call_logs')
    .select('id')
    .eq('twilio_call_sid', twilioCallSid)
    .single();

  if (!call) {
    callLogger.error({
      msg: 'Call not found for Twilio SID',
      twilioCallSid,
    });
    return null;
  }

  return updateCallLog(call.id, {
    duration_seconds: duration,
    outcome,
    recording_url: recordingUrl,
  });
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatCallDuration(seconds: number | null): string {
  if (!seconds) return '0s';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Get outcome label and color for display
 */
export function getOutcomeDisplay(outcome: CallOutcome | null): {
  label: string;
  color: string;
} {
  const outcomes: Record<string, { label: string; color: string }> = {
    answered: { label: 'Answered', color: 'bg-success/10 text-success' },
    voicemail: { label: 'Voicemail', color: 'bg-warning/10 text-warning' },
    no_answer: { label: 'No Answer', color: 'bg-danger/10 text-danger' },
    scheduled: { label: 'Scheduled', color: 'bg-info/10 text-info' },
    not_interested: { label: 'Not Interested', color: 'bg-muted text-text-muted' },
    callback_requested: { label: 'Callback Requested', color: 'bg-primary/10 text-primary' },
  };

  return outcome ? outcomes[outcome] || { label: outcome, color: 'bg-muted' } : { label: 'Unknown', color: 'bg-muted' };
}
