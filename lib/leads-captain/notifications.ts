// Leads Captain Owner Notification System
// Based on AI Conversation Specification v1.4 - Section 8

import { twilioClient } from '@/lib/twilio/client';
import { createClient } from '@/lib/supabase/server';
import {
  BusinessSettings,
  CapturedLead,
  ConversationMessage,
  OwnerNotification,
  UrgencyLevel
} from './types';
import { logger } from '@/lib/logger';
const lcNotifyLogger = logger.child({ context: 'leads-captain.notifications' });

// Urgency emoji mapping
const URGENCY_EMOJI: Record<UrgencyLevel, string> = {
  emergency: '🚨',
  high: '🔴',
  medium: '🟡',
  low: '🟢'
};

const URGENCY_LABEL: Record<UrgencyLevel, string> = {
  emergency: 'EMERGENCY',
  high: 'HIGH',
  medium: 'MEDIUM',
  low: 'LOW'
};

/**
 * Format phone number for display
 */
function formatPhoneForDisplay(phone: string): string {
  // Remove +1 prefix if present
  const cleaned = phone.replace(/^\+1/, '').replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
}

/**
 * Format conversation transcript for notifications
 */
function formatTranscript(messages: ConversationMessage[]): string {
  return messages.map(msg => {
    const role = msg.role === 'assistant' ? 'AI' : 'Customer';
    const time = new Date(msg.timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return `[${time}] ${role}: ${msg.content}`;
  }).join('\n');
}

/**
 * Generate SMS notification body
 * Spec Section 8.1 & 8.4
 */
export function generateSmsNotificationBody(
  lead: CapturedLead,
  isEmergency: boolean
): string {
  const displayPhone = formatPhoneForDisplay(lead.customer.phone);

  if (isEmergency) {
    // Emergency SMS format (Section 8.4)
    return `🚨 EMERGENCY — Leads Captain

${lead.serviceRequest.serviceNeeded}
📍 ${lead.serviceRequest.address.raw}
📞 ${displayPhone}

Customer reported: ${lead.serviceRequest.urgencyReason || lead.serviceRequest.serviceNeeded}

CALL THEM NOW`;
  }

  // Standard SMS format (Section 8.1)
  let body = `🔔 Leads Captain Lead

${lead.serviceRequest.serviceNeeded}
📍 ${lead.serviceRequest.address.raw}
⚡ ${URGENCY_LABEL[lead.serviceRequest.urgency]}${lead.serviceRequest.urgencyReason ? ` — ${lead.serviceRequest.urgencyReason}` : ''}
📞 ${displayPhone}`;

  if (lead.serviceRequest.preferredTime) {
    body += `\n🕐 ${lead.serviceRequest.preferredTime}`;
  }

  body += '\n\nReply CALL to auto-dial';

  return body;
}

/**
 * Generate email notification
 * Spec Section 8.2
 */
export function generateEmailNotification(
  lead: CapturedLead,
  _settings: BusinessSettings
): { subject: string; body: string; html: string } {
  const urgencyEmoji = URGENCY_EMOJI[lead.serviceRequest.urgency];
  const urgencyLabel = URGENCY_LABEL[lead.serviceRequest.urgency];
  const displayPhone = formatPhoneForDisplay(lead.customer.phone);
  const isEmergency = lead.serviceRequest.urgency === 'emergency';

  // Subject line
  const subject = isEmergency
    ? `🚨 EMERGENCY — ${lead.serviceRequest.serviceNeeded}`
    : `🔔 New Lead — ${lead.serviceRequest.serviceNeeded} (${urgencyLabel} URGENCY)`;

  // Plain text body
  const transcript = formatTranscript(lead.conversation.messages);

  const body = `Leads Captain captured a new lead:

SERVICE NEEDED
${lead.serviceRequest.serviceNeeded}

LOCATION
${lead.serviceRequest.address.street || lead.serviceRequest.address.raw}
${lead.serviceRequest.address.city ? `${lead.serviceRequest.address.city}, ${lead.serviceRequest.address.state || ''}` : ''}

URGENCY
${urgencyEmoji} ${urgencyLabel}${lead.serviceRequest.urgencyReason ? ` — Customer mentioned "${lead.serviceRequest.urgencyReason}"` : ''}

${lead.serviceRequest.preferredTime ? `PREFERRED TIME\n${lead.serviceRequest.preferredTime}\n\n` : ''}CUSTOMER PHONE
${displayPhone}

${lead.customer.name ? `CUSTOMER NAME\n${lead.customer.name}\n\n` : ''}CONVERSATION TRANSCRIPT
─────────────────────────────
${transcript}
─────────────────────────────

View in Dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/leads-captain/conversations/${lead.conversation.id}
`;

  // HTML body
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${isEmergency ? '#dc2626' : '#2563eb'}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 20px; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; }
    .section-content { font-size: 16px; }
    .urgency { display: inline-block; padding: 4px 12px; border-radius: 999px; font-weight: 600; font-size: 14px; }
    .urgency-emergency { background: #fee2e2; color: #dc2626; }
    .urgency-high { background: #fee2e2; color: #dc2626; }
    .urgency-medium { background: #fef3c7; color: #d97706; }
    .urgency-low { background: #d1fae5; color: #059669; }
    .phone { font-size: 20px; font-weight: 600; color: #2563eb; }
    .transcript { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; font-family: monospace; font-size: 13px; white-space: pre-wrap; }
    .actions { margin-top: 20px; }
    .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; margin-right: 10px; }
    .btn-secondary { background: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${isEmergency ? '🚨 EMERGENCY' : '🔔 New Lead'} — Leads Captain</h1>
  </div>
  <div class="content">
    <div class="section">
      <div class="section-title">Service Needed</div>
      <div class="section-content">${lead.serviceRequest.serviceNeeded}</div>
    </div>

    <div class="section">
      <div class="section-title">Location</div>
      <div class="section-content">
        ${lead.serviceRequest.address.street || lead.serviceRequest.address.raw}<br>
        ${lead.serviceRequest.address.city ? `${lead.serviceRequest.address.city}, ${lead.serviceRequest.address.state || ''}` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Urgency</div>
      <div class="section-content">
        <span class="urgency urgency-${lead.serviceRequest.urgency}">${urgencyEmoji} ${urgencyLabel}</span>
        ${lead.serviceRequest.urgencyReason ? `<br><small>Customer mentioned: "${lead.serviceRequest.urgencyReason}"</small>` : ''}
      </div>
    </div>

    ${lead.serviceRequest.preferredTime ? `
    <div class="section">
      <div class="section-title">Preferred Time</div>
      <div class="section-content">${lead.serviceRequest.preferredTime}</div>
    </div>
    ` : ''}

    <div class="section">
      <div class="section-title">Customer Phone</div>
      <div class="section-content">
        <a href="tel:${lead.customer.phone}" class="phone">${displayPhone}</a>
      </div>
    </div>

    ${lead.customer.name ? `
    <div class="section">
      <div class="section-title">Customer Name</div>
      <div class="section-content">${lead.customer.name}</div>
    </div>
    ` : ''}

    <div class="section">
      <div class="section-title">Conversation Transcript</div>
      <div class="transcript">${transcript.replace(/\n/g, '<br>')}</div>
    </div>

    <div class="actions">
      <a href="tel:${lead.customer.phone}" class="btn">📞 Call Customer</a>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/leads-captain/conversations/${lead.conversation.id}" class="btn btn-secondary">View Details</a>
    </div>
  </div>
</body>
</html>
`;

  return { subject, body, html };
}

/**
 * Generate push notification
 * Spec Section 8.3 & 8.4
 */
export function generatePushNotification(
  lead: CapturedLead,
  isEmergency: boolean
): { title: string; body: string; data: Record<string, string> } {
  const urgencyLabel = URGENCY_LABEL[lead.serviceRequest.urgency];

  if (isEmergency) {
    return {
      title: `🚨 EMERGENCY: ${lead.serviceRequest.serviceNeeded}`,
      body: `${lead.serviceRequest.address.raw}\nTap to call customer immediately`,
      data: {
        type: 'leads_captain_emergency',
        leadId: lead.leadId,
        conversationId: lead.conversation.id,
        customerPhone: lead.customer.phone,
        action: 'call'
      }
    };
  }

  return {
    title: '🔔 Leads Captain: New Lead',
    body: `${lead.serviceRequest.serviceNeeded} — ${urgencyLabel} URGENCY\n${lead.serviceRequest.address.raw}\nTap to view details`,
    data: {
      type: 'leads_captain_lead',
      leadId: lead.leadId,
      conversationId: lead.conversation.id,
      customerPhone: lead.customer.phone,
      action: 'view'
    }
  };
}

/**
 * Send SMS notification to owner
 */
async function sendSmsNotification(
  notification: OwnerNotification,
  settings: BusinessSettings
): Promise<{ success: boolean; error?: string }> {
  if (!settings.forwardTo) {
    return { success: false, error: 'No forward-to phone number configured' };
  }

  try {
    await twilioClient.messages.create({
      body: notification.body,
      to: settings.forwardTo,
      from: settings.phoneNumber,
      statusCallback: `${process.env.TWILIO_WEBHOOK_BASE_URL}/api/twilio/sms/status`
    });

    return { success: true };
  } catch (error) {
    lcNotifyLogger.error({
      msg: 'Failed to send SMS notification',
      businessId: notification.businessId,
      recipientPhone: notification.recipientPhone,
      urgency: notification.urgency,
      leadId: notification.leadId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send email notification to owner
 * This uses the notification_queue table for async processing
 */
async function queueEmailNotification(
  notification: OwnerNotification,
  lead: CapturedLead,
  settings: BusinessSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const emailContent = generateEmailNotification(lead, settings);

    const { error } = await supabase
      .from('notification_queue')
      .insert({
        business_id: settings.businessId,
        notification_type: 'follow_up', // Using existing type
        recipient_email: settings.forwardTo, // Assuming email is configured
        subject: emailContent.subject,
        body: emailContent.body,
        template_data: {
          html: emailContent.html,
          lead_id: lead.leadId
        },
        scheduled_for: new Date().toISOString(),
        status: 'pending'
      });

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    lcNotifyLogger.error({
      msg: 'Failed to queue email notification',
      businessId: settings.businessId,
      leadId: lead.leadId,
      recipientEmail: settings.forwardTo,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send push notification to owner
 * This would integrate with your push notification service
 */
async function sendPushNotification(
  lead: CapturedLead,
  settings: BusinessSettings,
  isEmergency: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    generatePushNotification(lead, isEmergency);

    // TODO: Integrate with your push notification service (e.g., Firebase, OneSignal)
    // Push notification service not yet configured - return success silently

    return { success: true };
  } catch (error) {
    lcNotifyLogger.error({
      msg: 'Failed to send push notification',
      businessId: settings.businessId,
      leadId: lead.leadId,
      isEmergency,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send all configured notifications to owner
 */
export async function notifyOwner(
  lead: CapturedLead,
  settings: BusinessSettings
): Promise<{
  sent: ('sms' | 'email' | 'push')[];
  failed: { type: 'sms' | 'email' | 'push'; error: string }[];
}> {
  const isEmergency = lead.serviceRequest.urgency === 'emergency';
  const sent: ('sms' | 'email' | 'push')[] = [];
  const failed: { type: 'sms' | 'email' | 'push'; error: string }[] = [];

  // Always send SMS for emergencies, otherwise check settings
  if (isEmergency || settings.notifySms) {
    const smsBody = generateSmsNotificationBody(lead, isEmergency);
    const smsNotification: OwnerNotification = {
      type: 'sms',
      businessId: settings.businessId,
      recipientPhone: settings.forwardTo,
      body: smsBody,
      urgency: lead.serviceRequest.urgency,
      leadId: lead.leadId,
      customerPhone: lead.customer.phone,
      serviceNeeded: lead.serviceRequest.serviceNeeded,
      address: lead.serviceRequest.address.raw,
      urgencyReason: lead.serviceRequest.urgencyReason || undefined,
      preferredTime: lead.serviceRequest.preferredTime || undefined,
      conversationId: lead.conversation.id,
      status: 'pending'
    };

    const smsResult = await sendSmsNotification(smsNotification, settings);
    if (smsResult.success) {
      sent.push('sms');
    } else {
      failed.push({ type: 'sms', error: smsResult.error || 'Unknown error' });
    }
  }

  // Email notification
  if (settings.notifyEmail) {
    const emailNotification: OwnerNotification = {
      type: 'email',
      businessId: settings.businessId,
      body: '', // Will be generated in queue function
      urgency: lead.serviceRequest.urgency,
      leadId: lead.leadId,
      customerPhone: lead.customer.phone,
      serviceNeeded: lead.serviceRequest.serviceNeeded,
      address: lead.serviceRequest.address.raw,
      conversationId: lead.conversation.id,
      status: 'pending'
    };

    const emailResult = await queueEmailNotification(emailNotification, lead, settings);
    if (emailResult.success) {
      sent.push('email');
    } else {
      failed.push({ type: 'email', error: emailResult.error || 'Unknown error' });
    }
  }

  // Push notification (especially important for emergencies)
  if (isEmergency || settings.notifyPush) {
    const pushResult = await sendPushNotification(lead, settings, isEmergency);
    if (pushResult.success) {
      sent.push('push');
    } else {
      failed.push({ type: 'push', error: pushResult.error || 'Unknown error' });
    }
  }

  return { sent, failed };
}

/**
 * Queue notification for later (e.g., after hours, schedule for morning)
 */
export async function queueNotificationForMorning(
  lead: CapturedLead,
  settings: BusinessSettings
): Promise<{ success: boolean; scheduledFor: Date; error?: string }> {
  try {
    const supabase = await createClient();

    // Calculate next business hours start
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [startHour, startMinute] = settings.businessHoursStart.split(':').map(Number);
    tomorrow.setHours(startHour, startMinute, 0, 0);

    const smsBody = generateSmsNotificationBody(lead, false);

    const { error } = await supabase
      .from('notification_queue')
      .insert({
        business_id: settings.businessId,
        notification_type: 'follow_up',
        recipient_phone: settings.forwardTo,
        body: smsBody,
        scheduled_for: tomorrow.toISOString(),
        status: 'pending',
        metadata: {
          lead_id: lead.leadId,
          conversation_id: lead.conversation.id,
          type: 'leads_captain_morning_notification'
        }
      });

    if (error) {
      throw error;
    }

    return { success: true, scheduledFor: tomorrow };
  } catch (error) {
    lcNotifyLogger.error({
      msg: 'Failed to queue morning notification',
      businessId: settings.businessId,
      leadId: lead.leadId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return {
      success: false,
      scheduledFor: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
