// =====================================================
// CUSTOMER ACTIVITY LOG LIBRARY
// Track all interactions and events for customers
// =====================================================

import { createClient as createServerClient } from '@/lib/supabase/server';

export type ActivityType =
  | 'note'
  | 'call_outbound'
  | 'call_inbound'
  | 'call_missed'
  | 'email_sent'
  | 'email_received'
  | 'sms_sent'
  | 'sms_received'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_declined'
  | 'job_scheduled'
  | 'job_completed'
  | 'job_cancelled'
  | 'invoice_sent'
  | 'payment_received'
  | 'equipment_added'
  | 'document_added'
  | 'review_requested'
  | 'review_received'
  | 'survey_completed';

export interface CustomerActivity {
  id: string;
  business_id: string;
  customer_id: string;
  activity_type: ActivityType;
  title: string;
  description?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  metadata?: Record<string, any>;
  created_by?: string;
  created_by_system: boolean;
  created_at: string;
  created_by_user?: { name: string };
}

interface LogActivityParams {
  businessId: string;
  customerId: string;
  activityType: ActivityType;
  title: string;
  description?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, any>;
  createdBy?: string;
  createdBySystem?: boolean;
}

/**
 * Log an activity for a customer
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('customer_activity')
    .insert({
      business_id: params.businessId,
      customer_id: params.customerId,
      activity_type: params.activityType,
      title: params.title,
      description: params.description,
      related_entity_type: params.relatedEntityType,
      related_entity_id: params.relatedEntityId,
      metadata: params.metadata,
      created_by: params.createdBy,
      created_by_system: params.createdBySystem || false,
    });

  if (error) throw error;
}

/**
 * Get customer activity timeline
 */
export async function getCustomerTimeline(
  customerId: string,
  options?: {
    limit?: number;
    offset?: number;
    activityTypes?: ActivityType[];
  }
): Promise<CustomerActivity[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from('customer_activity')
    .select(`
      *,
      created_by_user:users!created_by(name)
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (options?.activityTypes?.length) {
    query = query.in('activity_type', options.activityTypes);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

/**
 * Add a note to customer timeline
 */
export async function addNote(
  businessId: string,
  customerId: string,
  userId: string,
  note: string
): Promise<void> {
  return logActivity({
    businessId,
    customerId,
    activityType: 'note',
    title: 'Note added',
    description: note,
    createdBy: userId,
  });
}

/**
 * Log an outbound call
 */
export async function logCallMade(
  businessId: string,
  customerId: string,
  userId: string,
  duration?: number,
  notes?: string
): Promise<void> {
  return logActivity({
    businessId,
    customerId,
    activityType: 'call_outbound',
    title: 'Outbound call',
    description: duration
      ? `Duration: ${Math.floor(duration / 60)}m ${duration % 60}s${notes ? ` - ${notes}` : ''}`
      : notes,
    createdBy: userId,
    metadata: { duration },
  });
}

/**
 * Log an inbound call
 */
export async function logCallReceived(
  businessId: string,
  customerId: string,
  userId: string,
  duration?: number,
  notes?: string
): Promise<void> {
  return logActivity({
    businessId,
    customerId,
    activityType: 'call_inbound',
    title: 'Inbound call',
    description: duration
      ? `Duration: ${Math.floor(duration / 60)}m ${duration % 60}s${notes ? ` - ${notes}` : ''}`
      : notes,
    createdBy: userId,
    metadata: { duration },
  });
}

/**
 * Log a missed call
 */
export async function logMissedCall(
  businessId: string,
  customerId: string
): Promise<void> {
  return logActivity({
    businessId,
    customerId,
    activityType: 'call_missed',
    title: 'Missed call',
    createdBySystem: true,
  });
}

/**
 * Log job completion
 */
export async function logJobCompleted(
  businessId: string,
  customerId: string,
  jobId: string,
  jobTitle: string
): Promise<void> {
  return logActivity({
    businessId,
    customerId,
    activityType: 'job_completed',
    title: `Job completed: ${jobTitle}`,
    relatedEntityType: 'job',
    relatedEntityId: jobId,
    createdBySystem: true,
  });
}

/**
 * Log job scheduled
 */
export async function logJobScheduled(
  businessId: string,
  customerId: string,
  jobId: string,
  jobTitle: string,
  scheduledDate: string
): Promise<void> {
  return logActivity({
    businessId,
    customerId,
    activityType: 'job_scheduled',
    title: `Job scheduled: ${jobTitle}`,
    description: `Scheduled for ${new Date(scheduledDate).toLocaleDateString()}`,
    relatedEntityType: 'job',
    relatedEntityId: jobId,
    createdBySystem: true,
  });
}

/**
 * Log payment received
 */
export async function logPaymentReceived(
  businessId: string,
  customerId: string,
  invoiceId: string,
  amount: number
): Promise<void> {
  return logActivity({
    businessId,
    customerId,
    activityType: 'payment_received',
    title: `Payment received: $${amount.toFixed(2)}`,
    relatedEntityType: 'invoice',
    relatedEntityId: invoiceId,
    metadata: { amount },
    createdBySystem: true,
  });
}

/**
 * Log quote sent
 */
export async function logQuoteSent(
  businessId: string,
  customerId: string,
  quoteId: string,
  quoteTitle: string,
  amount: number
): Promise<void> {
  return logActivity({
    businessId,
    customerId,
    activityType: 'quote_sent',
    title: `Quote sent: ${quoteTitle}`,
    description: `Total: $${amount.toFixed(2)}`,
    relatedEntityType: 'quote',
    relatedEntityId: quoteId,
    metadata: { amount },
    createdBySystem: true,
  });
}

/**
 * Log quote accepted
 */
export async function logQuoteAccepted(
  businessId: string,
  customerId: string,
  quoteId: string,
  quoteTitle: string
): Promise<void> {
  return logActivity({
    businessId,
    customerId,
    activityType: 'quote_accepted',
    title: `Quote accepted: ${quoteTitle}`,
    relatedEntityType: 'quote',
    relatedEntityId: quoteId,
    createdBySystem: true,
  });
}

/**
 * Log SMS sent
 */
export async function logSmsSent(
  businessId: string,
  customerId: string,
  message: string,
  userId?: string
): Promise<void> {
  return logActivity({
    businessId,
    customerId,
    activityType: 'sms_sent',
    title: 'SMS sent',
    description: message.length > 100 ? message.substring(0, 100) + '...' : message,
    createdBy: userId,
    createdBySystem: !userId,
  });
}

/**
 * Log SMS received
 */
export async function logSmsReceived(
  businessId: string,
  customerId: string,
  message: string
): Promise<void> {
  return logActivity({
    businessId,
    customerId,
    activityType: 'sms_received',
    title: 'SMS received',
    description: message.length > 100 ? message.substring(0, 100) + '...' : message,
    createdBySystem: true,
  });
}

/**
 * Log email sent
 */
export async function logEmailSent(
  businessId: string,
  customerId: string,
  subject: string,
  userId?: string
): Promise<void> {
  return logActivity({
    businessId,
    customerId,
    activityType: 'email_sent',
    title: `Email sent: ${subject}`,
    createdBy: userId,
    createdBySystem: !userId,
  });
}

/**
 * Log equipment added
 */
export async function logEquipmentAdded(
  businessId: string,
  customerId: string,
  equipmentId: string,
  equipmentName: string,
  userId: string
): Promise<void> {
  return logActivity({
    businessId,
    customerId,
    activityType: 'equipment_added',
    title: `Equipment added: ${equipmentName}`,
    relatedEntityType: 'equipment',
    relatedEntityId: equipmentId,
    createdBy: userId,
  });
}

/**
 * Log review requested
 */
export async function logReviewRequested(
  businessId: string,
  customerId: string,
  jobId?: string
): Promise<void> {
  return logActivity({
    businessId,
    customerId,
    activityType: 'review_requested',
    title: 'Review request sent',
    relatedEntityType: jobId ? 'job' : undefined,
    relatedEntityId: jobId,
    createdBySystem: true,
  });
}

/**
 * Log survey completed
 */
export async function logSurveyCompleted(
  businessId: string,
  customerId: string,
  rating: number,
  jobId?: string
): Promise<void> {
  return logActivity({
    businessId,
    customerId,
    activityType: 'survey_completed',
    title: `Survey completed: ${rating} stars`,
    relatedEntityType: jobId ? 'job' : undefined,
    relatedEntityId: jobId,
    metadata: { rating },
    createdBySystem: true,
  });
}

/**
 * Get activity icon based on type
 */
export function getActivityIcon(activityType: ActivityType): string {
  const icons: Record<ActivityType, string> = {
    note: '📝',
    call_outbound: '📞',
    call_inbound: '📲',
    call_missed: '📵',
    email_sent: '📧',
    email_received: '📬',
    sms_sent: '💬',
    sms_received: '💬',
    quote_sent: '📋',
    quote_accepted: '✅',
    quote_declined: '❌',
    job_scheduled: '📅',
    job_completed: '✅',
    job_cancelled: '🚫',
    invoice_sent: '💰',
    payment_received: '💵',
    equipment_added: '🔧',
    document_added: '📄',
    review_requested: '⭐',
    review_received: '⭐',
    survey_completed: '📊',
  };
  return icons[activityType] || '📌';
}

/**
 * Get recent activity for a business
 */
export async function getRecentBusinessActivity(
  businessId: string,
  limit: number = 50
): Promise<(CustomerActivity & { customer: { name: string } })[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('customer_activity')
    .select(`
      *,
      customer:customers(name),
      created_by_user:users!created_by(name)
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
