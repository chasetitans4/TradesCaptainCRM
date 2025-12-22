// =====================================================
// UNIFIED NOTIFICATIONS SERVICE
// Handles email, SMS, and push notifications
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail, isEmailConfigured } from '@/lib/email';
import * as emailTemplates from '@/lib/email';
import { sendPushNotification } from './push';

export type NotificationType =
  | 'job_confirmed'
  | 'job_completed'
  | 'job_rescheduled'
  | 'job_cancelled'
  | 'technician_en_route'
  | 'invoice_sent'
  | 'payment_received'
  | 'payment_reminder'
  | 'quote_sent'
  | 'review_request'
  | 'new_lead'
  | 'new_message';

export interface NotificationOptions {
  channels?: ('email' | 'sms' | 'push')[];
  skipPreferenceCheck?: boolean;
}

/**
 * Send a job confirmation notification to customer
 */
export async function notifyJobConfirmed(
  jobId: string,
  options: NotificationOptions = {}
): Promise<void> {
  const supabase = createAdminClient();

  const { data: job } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers (id, name, email, phone),
      business:businesses (id, name, phone, email),
      assigned_user:users (name)
    `)
    .eq('id', jobId)
    .single();

  if (!job?.customer) return;

  const channels = options.channels || ['email', 'sms'];

  // Send email
  if (channels.includes('email') && job.customer.email && isEmailConfigured()) {
    const html = emailTemplates.getJobConfirmationEmailHtml({
      customerName: job.customer.name,
      businessName: job.business.name,
      businessPhone: job.business.phone,
      jobTitle: job.title || 'Service Appointment',
      scheduledDate: job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'TBD',
      scheduledTime: job.scheduled_time || 'TBD',
      address: job.address,
      technicianName: job.assigned_user?.name,
      notes: job.customer_notes,
      portalLink: `${process.env.NEXT_PUBLIC_APP_URL}/portal/${job.business_id}`,
    });

    await sendEmail({
      to: job.customer.email,
      subject: `Appointment Confirmed - ${job.business.name}`,
      html,
    });
  }

  // Send SMS
  if (channels.includes('sms') && job.customer.phone) {
    const { sendSMS } = await import('@/lib/twilio/sms');
    const date = job.scheduled_date ? new Date(job.scheduled_date).toLocaleDateString() : 'TBD';
    const time = job.scheduled_time || '';

    await sendSMS({
      to: job.customer.phone,
      body: `Hi ${job.customer.name}! Your appointment with ${job.business.name} is confirmed for ${date}${time ? ` at ${time}` : ''}. Reply HELP for assistance.`,
      businessId: job.business_id,
    });
  }

  // Log notification
  await logNotification(job.business_id, job.customer.id, 'job_confirmed', jobId);
}

/**
 * Send a job completed notification to customer
 */
export async function notifyJobCompleted(
  jobId: string,
  options: NotificationOptions = {}
): Promise<void> {
  const supabase = createAdminClient();

  const { data: job } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers (id, name, email, phone),
      business:businesses (id, name, phone, google_review_url),
      assigned_user:users (name),
      invoice:invoices (id, access_token)
    `)
    .eq('id', jobId)
    .single();

  if (!job?.customer) return;

  const channels = options.channels || ['email', 'sms'];
  const invoiceLink = job.invoice?.[0]?.access_token
    ? `${process.env.NEXT_PUBLIC_APP_URL}/view/invoice/${job.invoice[0].access_token}`
    : undefined;

  // Send email
  if (channels.includes('email') && job.customer.email && isEmailConfigured()) {
    const html = emailTemplates.getJobCompletedEmailHtml({
      customerName: job.customer.name,
      businessName: job.business.name,
      businessPhone: job.business.phone,
      jobTitle: job.title || 'Service',
      completedDate: new Date().toLocaleDateString(),
      technicianName: job.assigned_user?.name,
      workSummary: job.completion_notes,
      invoiceLink,
      reviewLink: job.business.google_review_url,
    });

    await sendEmail({
      to: job.customer.email,
      subject: `Service Completed - ${job.business.name}`,
      html,
    });
  }

  // Send SMS
  if (channels.includes('sms') && job.customer.phone) {
    const { sendSMS } = await import('@/lib/twilio/sms');
    let message = `Hi ${job.customer.name}! Your service with ${job.business.name} is complete.`;
    if (invoiceLink) {
      message += ` View invoice: ${invoiceLink}`;
    }
    if (job.business.google_review_url) {
      message += ` We'd love your review!`;
    }

    await sendSMS({
      to: job.customer.phone,
      body: message,
      businessId: job.business_id,
    });
  }

  await logNotification(job.business_id, job.customer.id, 'job_completed', jobId);
}

/**
 * Send technician en route notification
 */
export async function notifyTechnicianEnRoute(
  jobId: string,
  estimatedMinutes: number = 30,
  options: NotificationOptions = {}
): Promise<void> {
  const supabase = createAdminClient();

  const { data: job } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers (id, name, email, phone),
      business:businesses (id, name, phone),
      assigned_user:users (name)
    `)
    .eq('id', jobId)
    .single();

  if (!job?.customer || !job.assigned_user) return;

  const channels = options.channels || ['email', 'sms'];
  const eta = new Date(Date.now() + estimatedMinutes * 60 * 1000);
  const etaStr = eta.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  // Send email
  if (channels.includes('email') && job.customer.email && isEmailConfigured()) {
    const html = emailTemplates.getTechnicianEnRouteEmailHtml({
      customerName: job.customer.name,
      businessName: job.business.name,
      businessPhone: job.business.phone,
      technicianName: job.assigned_user.name,
      estimatedArrival: etaStr,
      jobTitle: job.title || 'Service',
    });

    await sendEmail({
      to: job.customer.email,
      subject: `${job.assigned_user.name} is on the way! - ${job.business.name}`,
      html,
    });
  }

  // Send SMS
  if (channels.includes('sms') && job.customer.phone) {
    const { sendSMS } = await import('@/lib/twilio/sms');
    await sendSMS({
      to: job.customer.phone,
      body: `Hi ${job.customer.name}! ${job.assigned_user.name} from ${job.business.name} is on the way. ETA: ${etaStr}. Please ensure access to the service area.`,
      businessId: job.business_id,
    });
  }

  await logNotification(job.business_id, job.customer.id, 'technician_en_route', jobId);
}

/**
 * Send quote to customer
 */
export async function sendQuoteNotification(
  quoteId: string,
  options: NotificationOptions = {}
): Promise<void> {
  const supabase = createAdminClient();

  const { data: quote } = await supabase
    .from('quotes')
    .select(`
      *,
      customer:customers (id, name, email, phone),
      business:businesses (id, name, phone),
      line_items:quote_items (description, quantity, unit_price)
    `)
    .eq('id', quoteId)
    .single();

  if (!quote?.customer) return;

  const channels = options.channels || ['email', 'sms'];
  const viewLink = `${process.env.NEXT_PUBLIC_APP_URL}/view/quote/${quote.access_token}`;

  // Build line items
  const lineItems = (quote.line_items || []).map((item: any) => ({
    name: item.description,
    quantity: item.quantity,
    unitPrice: item.unit_price,
    total: item.quantity * item.unit_price,
  }));

  // Send email
  if (channels.includes('email') && quote.customer.email && isEmailConfigured()) {
    const html = emailTemplates.getQuoteDeliveryEmailHtml({
      customerName: quote.customer.name,
      businessName: quote.business.name,
      businessPhone: quote.business.phone,
      quoteNumber: quote.quote_number,
      totalAmount: `$${quote.total.toFixed(2)}`,
      validUntil: quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : 'N/A',
      lineItems,
      subtotal: `$${quote.subtotal.toFixed(2)}`,
      taxAmount: quote.tax_amount > 0 ? `$${quote.tax_amount.toFixed(2)}` : undefined,
      viewLink,
      notes: quote.notes,
    });

    await sendEmail({
      to: quote.customer.email,
      subject: `Quote ${quote.quote_number} from ${quote.business.name}`,
      html,
    });
  }

  // Send SMS
  if (channels.includes('sms') && quote.customer.phone) {
    const { sendSMS } = await import('@/lib/twilio/sms');
    await sendSMS({
      to: quote.customer.phone,
      body: `Hi ${quote.customer.name}! ${quote.business.name} has sent you a quote for $${quote.total.toFixed(2)}. View & accept: ${viewLink}`,
      businessId: quote.business_id,
    });
  }

  // Update quote status
  await supabase
    .from('quotes')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', quoteId);

  await logNotification(quote.business_id, quote.customer.id, 'quote_sent', quoteId);
}

/**
 * Send review request to customer
 */
export async function sendReviewRequest(
  customerId: string,
  businessId: string,
  options: NotificationOptions = {}
): Promise<void> {
  const supabase = createAdminClient();

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, email, phone')
    .eq('id', customerId)
    .single();

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, phone, google_review_url')
    .eq('id', businessId)
    .single();

  if (!customer || !business) return;

  const channels = options.channels || ['email', 'sms'];
  const reviewLink = business.google_review_url || `${process.env.NEXT_PUBLIC_APP_URL}/portal/${businessId}`;

  // Send email
  if (channels.includes('email') && customer.email && isEmailConfigured()) {
    const html = emailTemplates.getReviewRequestEmailHtml({
      customerName: customer.name,
      businessName: business.name,
      reviewLink,
    });

    await sendEmail({
      to: customer.email,
      subject: `How did we do? - ${business.name}`,
      html,
    });
  }

  // Send SMS
  if (channels.includes('sms') && customer.phone) {
    const { sendSMS } = await import('@/lib/twilio/sms');
    await sendSMS({
      to: customer.phone,
      body: `Hi ${customer.name}! Thank you for choosing ${business.name}. We'd love to hear about your experience! Leave a review: ${reviewLink}`,
      businessId,
    });
  }

  await logNotification(businessId, customerId, 'review_request');
}

/**
 * Log a notification for tracking
 */
async function logNotification(
  businessId: string,
  customerId: string,
  type: NotificationType,
  referenceId?: string
): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from('notification_logs').insert({
    business_id: businessId,
    customer_id: customerId,
    type,
    reference_id: referenceId,
    sent_at: new Date().toISOString(),
  });
}

// Re-export push notification functions
export { sendPushNotification } from './push';
export * from './push';
