// =====================================================
// FOLLOW-UP ENGINE
// Automated follow-up scheduling and execution
// =====================================================

import { createClient } from '@/lib/supabase/server';

export type TriggerType =
  | 'quote_sent'
  | 'quote_no_response'
  | 'job_completed'
  | 'lead_created'
  | 'lead_no_response'
  | 'invoice_overdue'
  | 'maintenance_due'
  | 'review_request'
  | 'booking_confirmed'
  | 'appointment_reminder';

export type ActionType = 'sms' | 'email' | 'task' | 'notification';

export interface FollowUpRule {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  triggerType: TriggerType;
  delayHours: number;
  actionType: ActionType;
  messageTemplate: string | null;
  emailSubject: string | null;
  emailTemplate: string | null;
  taskTitle: string | null;
  taskAssignedTo: string | null;
  conditions: Record<string, any> | null;
  maxAttempts: number;
  stopOnResponse: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface FollowUpInstance {
  id: string;
  businessId: string;
  ruleId: string;
  entityType: string;
  entityId: string;
  customerId: string | null;
  scheduledAt: string;
  status: 'scheduled' | 'sent' | 'cancelled' | 'failed' | 'stopped';
  sentAt: string | null;
  attemptNumber: number;
  resultMessage: string | null;
  stoppedReason: string | null;
  messageSid: string | null;
  emailId: string | null;
}

/**
 * Get follow-up rules for a business
 */
export async function getFollowUpRules(
  businessId: string,
  options?: {
    triggerType?: TriggerType;
    isActive?: boolean;
  }
): Promise<FollowUpRule[]> {
  const supabase = await createClient();

  let query = supabase
    .from('follow_up_rules')
    .select('*')
    .eq('business_id', businessId)
    .order('sort_order', { ascending: true });

  if (options?.triggerType) {
    query = query.eq('trigger_type', options.triggerType);
  }

  if (options?.isActive !== undefined) {
    query = query.eq('is_active', options.isActive);
  }

  const { data } = await query;

  return (data || []).map(mapFollowUpRule);
}

/**
 * Create a follow-up rule
 */
export async function createFollowUpRule(
  businessId: string,
  rule: Omit<FollowUpRule, 'id' | 'businessId'>
): Promise<FollowUpRule> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('follow_up_rules')
    .insert({
      business_id: businessId,
      name: rule.name,
      description: rule.description,
      trigger_type: rule.triggerType,
      delay_hours: rule.delayHours,
      action_type: rule.actionType,
      message_template: rule.messageTemplate,
      email_subject: rule.emailSubject,
      email_template: rule.emailTemplate,
      task_title: rule.taskTitle,
      task_assigned_to: rule.taskAssignedTo,
      conditions: rule.conditions,
      max_attempts: rule.maxAttempts,
      stop_on_response: rule.stopOnResponse,
      is_active: rule.isActive,
      sort_order: rule.sortOrder,
    })
    .select()
    .single();

  if (error) throw error;

  return mapFollowUpRule(data);
}

/**
 * Update a follow-up rule
 */
export async function updateFollowUpRule(
  ruleId: string,
  updates: Partial<Omit<FollowUpRule, 'id' | 'businessId'>>
): Promise<FollowUpRule> {
  const supabase = await createClient();

  const updateData: Record<string, any> = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.triggerType !== undefined) updateData.trigger_type = updates.triggerType;
  if (updates.delayHours !== undefined) updateData.delay_hours = updates.delayHours;
  if (updates.actionType !== undefined) updateData.action_type = updates.actionType;
  if (updates.messageTemplate !== undefined) updateData.message_template = updates.messageTemplate;
  if (updates.emailSubject !== undefined) updateData.email_subject = updates.emailSubject;
  if (updates.emailTemplate !== undefined) updateData.email_template = updates.emailTemplate;
  if (updates.taskTitle !== undefined) updateData.task_title = updates.taskTitle;
  if (updates.taskAssignedTo !== undefined) updateData.task_assigned_to = updates.taskAssignedTo;
  if (updates.conditions !== undefined) updateData.conditions = updates.conditions;
  if (updates.maxAttempts !== undefined) updateData.max_attempts = updates.maxAttempts;
  if (updates.stopOnResponse !== undefined) updateData.stop_on_response = updates.stopOnResponse;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
  if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;

  const { data, error } = await supabase
    .from('follow_up_rules')
    .update(updateData)
    .eq('id', ruleId)
    .select()
    .single();

  if (error) throw error;

  return mapFollowUpRule(data);
}

/**
 * Delete a follow-up rule
 */
export async function deleteFollowUpRule(ruleId: string): Promise<void> {
  const supabase = await createClient();

  await supabase.from('follow_up_rules').delete().eq('id', ruleId);
}

/**
 * Trigger follow-ups for an event
 */
export async function triggerFollowUps(
  businessId: string,
  triggerType: TriggerType,
  entityType: string,
  entityId: string,
  customerId?: string,
  context?: Record<string, any>
): Promise<number> {
  const supabase = await createClient();

  // Get active rules for this trigger
  const rules = await getFollowUpRules(businessId, {
    triggerType,
    isActive: true,
  });

  if (rules.length === 0) return 0;

  let scheduled = 0;

  for (const rule of rules) {
    // Check conditions
    if (rule.conditions && !checkConditions(rule.conditions, context)) {
      continue;
    }

    // Calculate scheduled time
    const scheduledAt = new Date(Date.now() + rule.delayHours * 60 * 60 * 1000);

    // Create follow-up instance
    const { error } = await supabase.from('follow_up_instances').insert({
      business_id: businessId,
      rule_id: rule.id,
      entity_type: entityType,
      entity_id: entityId,
      customer_id: customerId || null,
      scheduled_at: scheduledAt.toISOString(),
      status: 'scheduled',
      attempt_number: 1,
    });

    if (!error) scheduled++;
  }

  return scheduled;
}

/**
 * Process due follow-ups
 * This should be called by a cron job or background worker
 */
export async function processScheduledFollowUps(): Promise<{
  processed: number;
  sent: number;
  failed: number;
}> {
  const supabase = await createClient();

  // Get due follow-ups
  const { data: instances } = await supabase
    .from('follow_up_instances')
    .select(`
      *,
      rule:follow_up_rules(*)
    `)
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .limit(100);

  if (!instances || instances.length === 0) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const instance of instances) {
    const result = await executeFollowUp(instance, instance.rule);

    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { processed: instances.length, sent, failed };
}

/**
 * Execute a single follow-up
 */
async function executeFollowUp(
  instance: any,
  rule: any
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  try {
    // Get entity data for template variables
    const entityData = await getEntityData(instance.entity_type, instance.entity_id);
    const customerData = instance.customer_id
      ? await getCustomerData(instance.customer_id)
      : null;

    // Check if we should stop (customer responded, entity converted, etc.)
    if (rule.stop_on_response) {
      const shouldStop = await checkShouldStop(instance, entityData);
      if (shouldStop.stop) {
        await supabase
          .from('follow_up_instances')
          .update({
            status: 'stopped',
            stopped_reason: shouldStop.reason,
          })
          .eq('id', instance.id);
        return { success: true };
      }
    }

    // Execute based on action type
    let result: { success: boolean; messageId?: string; error?: string };

    switch (rule.action_type) {
      case 'sms':
        result = await sendSmsFollowUp(rule, customerData, entityData);
        break;
      case 'email':
        result = await sendEmailFollowUp(rule, customerData, entityData);
        break;
      case 'task':
        result = await createTaskFollowUp(rule, instance, entityData);
        break;
      case 'notification':
        result = await sendNotificationFollowUp(rule, instance, entityData);
        break;
      default:
        result = { success: false, error: 'Unknown action type' };
    }

    // Update instance status
    await supabase
      .from('follow_up_instances')
      .update({
        status: result.success ? 'sent' : 'failed',
        sent_at: result.success ? new Date().toISOString() : null,
        result_message: result.error || null,
        message_sid: rule.action_type === 'sms' ? result.messageId : null,
        email_id: rule.action_type === 'email' ? result.messageId : null,
      })
      .eq('id', instance.id);

    // Schedule next attempt if failed and under max attempts
    if (!result.success && instance.attempt_number < rule.max_attempts) {
      const nextScheduled = new Date(Date.now() + rule.delay_hours * 60 * 60 * 1000);

      await supabase.from('follow_up_instances').insert({
        business_id: instance.business_id,
        rule_id: rule.id,
        entity_type: instance.entity_type,
        entity_id: instance.entity_id,
        customer_id: instance.customer_id,
        scheduled_at: nextScheduled.toISOString(),
        status: 'scheduled',
        attempt_number: instance.attempt_number + 1,
      });
    }

    return result;
  } catch (error: any) {
    await supabase
      .from('follow_up_instances')
      .update({
        status: 'failed',
        result_message: error.message,
      })
      .eq('id', instance.id);

    return { success: false, error: error.message };
  }
}

/**
 * Get entity data for template variables
 */
async function getEntityData(entityType: string, entityId: string): Promise<any> {
  const supabase = await createClient();

  const tableMap: Record<string, string> = {
    quote: 'quotes',
    lead: 'leads',
    job: 'jobs',
    invoice: 'invoices',
    customer: 'customers',
    booking: 'booking_requests',
  };

  const table = tableMap[entityType];
  if (!table) return null;

  const { data } = await supabase.from(table).select('*').eq('id', entityId).single();

  return data;
}

/**
 * Get customer data
 */
async function getCustomerData(customerId: string): Promise<any> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  return data;
}

/**
 * Check if follow-up should be stopped
 */
async function checkShouldStop(
  instance: any,
  entityData: any
): Promise<{ stop: boolean; reason?: string }> {
  if (!entityData) return { stop: false };

  // Check based on entity type
  switch (instance.entity_type) {
    case 'quote':
      if (entityData.status === 'accepted') {
        return { stop: true, reason: 'customer_responded' };
      }
      if (entityData.status === 'declined') {
        return { stop: true, reason: 'customer_responded' };
      }
      break;
    case 'lead':
      if (entityData.status === 'converted') {
        return { stop: true, reason: 'converted' };
      }
      break;
    case 'invoice':
      if (entityData.status === 'paid') {
        return { stop: true, reason: 'paid' };
      }
      break;
    case 'booking':
      if (entityData.status === 'confirmed' || entityData.status === 'converted') {
        return { stop: true, reason: 'converted' };
      }
      break;
  }

  return { stop: false };
}

/**
 * Send SMS follow-up
 */
async function sendSmsFollowUp(
  rule: any,
  customer: any,
  entity: any
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!customer?.phone) {
    return { success: false, error: 'No phone number available' };
  }

  const message = replaceTemplateVariables(rule.message_template, customer, entity);

  try {
    const { sendSms } = await import('@/lib/sms');
    const result = await sendSms(customer.phone, message);
    return { success: true, messageId: result.sid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Send email follow-up
 */
async function sendEmailFollowUp(
  rule: any,
  customer: any,
  entity: any
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!customer?.email) {
    return { success: false, error: 'No email address available' };
  }

  const subject = replaceTemplateVariables(rule.email_subject, customer, entity);
  const html = replaceTemplateVariables(rule.email_template, customer, entity);

  try {
    const { sendEmail } = await import('@/lib/email');
    await sendEmail({
      to: customer.email,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, ''),
    });
    return { success: true, messageId: `email-${Date.now()}` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Create task follow-up
 */
async function createTaskFollowUp(
  rule: any,
  instance: any,
  entity: any
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const title = replaceTemplateVariables(rule.task_title, null, entity);

  const { error } = await supabase.from('tasks').insert({
    business_id: instance.business_id,
    title,
    description: `Follow-up task for ${instance.entity_type} ${instance.entity_id}`,
    assigned_to: rule.task_assigned_to,
    related_type: instance.entity_type,
    related_id: instance.entity_id,
    due_date: new Date().toISOString().split('T')[0],
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Send notification follow-up
 */
async function sendNotificationFollowUp(
  rule: any,
  instance: any,
  entity: any
): Promise<{ success: boolean; error?: string }> {
  // For now, just log - could integrate with push notifications
  console.log(`[NOTIFICATION] Follow-up for ${instance.entity_type} ${instance.entity_id}`);
  return { success: true };
}

/**
 * Replace template variables
 */
function replaceTemplateVariables(
  template: string | null,
  customer: any,
  entity: any
): string {
  if (!template) return '';

  let result = template;

  // Customer variables
  if (customer) {
    result = result.replace(/\{\{customer\.name\}\}/g, customer.name || '');
    result = result.replace(/\{\{customer\.firstName\}\}/g, customer.name?.split(' ')[0] || '');
    result = result.replace(/\{\{customer\.email\}\}/g, customer.email || '');
    result = result.replace(/\{\{customer\.phone\}\}/g, customer.phone || '');
  }

  // Entity variables
  if (entity) {
    result = result.replace(/\{\{entity\.id\}\}/g, entity.id || '');
    result = result.replace(/\{\{entity\.title\}\}/g, entity.title || entity.name || '');
    result = result.replace(/\{\{entity\.total\}\}/g, entity.total?.toFixed(2) || entity.amount?.toFixed(2) || '');
    result = result.replace(/\{\{entity\.status\}\}/g, entity.status || '');
  }

  // Date variables
  const now = new Date();
  result = result.replace(/\{\{today\}\}/g, now.toLocaleDateString());
  result = result.replace(/\{\{year\}\}/g, now.getFullYear().toString());

  return result;
}

/**
 * Check rule conditions
 */
function checkConditions(
  conditions: Record<string, any>,
  context?: Record<string, any>
): boolean {
  if (!context) return true;

  for (const [key, value] of Object.entries(conditions)) {
    if (key.endsWith('_min') && context[key.replace('_min', '')] < value) {
      return false;
    }
    if (key.endsWith('_max') && context[key.replace('_max', '')] > value) {
      return false;
    }
    if (!key.endsWith('_min') && !key.endsWith('_max') && context[key] !== value) {
      return false;
    }
  }

  return true;
}

/**
 * Cancel pending follow-ups for an entity
 */
export async function cancelPendingFollowUps(
  entityType: string,
  entityId: string,
  reason: string
): Promise<number> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('follow_up_instances')
    .update({
      status: 'cancelled',
      stopped_reason: reason,
    })
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('status', 'scheduled')
    .select();

  return data?.length || 0;
}

/**
 * Get follow-up instances for an entity
 */
export async function getEntityFollowUps(
  entityType: string,
  entityId: string
): Promise<FollowUpInstance[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('follow_up_instances')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('scheduled_at', { ascending: false });

  return (data || []).map(mapFollowUpInstance);
}

/**
 * Map database row to FollowUpRule type
 */
function mapFollowUpRule(row: any): FollowUpRule {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    triggerType: row.trigger_type,
    delayHours: row.delay_hours,
    actionType: row.action_type,
    messageTemplate: row.message_template,
    emailSubject: row.email_subject,
    emailTemplate: row.email_template,
    taskTitle: row.task_title,
    taskAssignedTo: row.task_assigned_to,
    conditions: row.conditions,
    maxAttempts: row.max_attempts,
    stopOnResponse: row.stop_on_response,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  };
}

/**
 * Map database row to FollowUpInstance type
 */
function mapFollowUpInstance(row: any): FollowUpInstance {
  return {
    id: row.id,
    businessId: row.business_id,
    ruleId: row.rule_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    customerId: row.customer_id,
    scheduledAt: row.scheduled_at,
    status: row.status,
    sentAt: row.sent_at,
    attemptNumber: row.attempt_number,
    resultMessage: row.result_message,
    stoppedReason: row.stopped_reason,
    messageSid: row.message_sid,
    emailId: row.email_id,
  };
}
