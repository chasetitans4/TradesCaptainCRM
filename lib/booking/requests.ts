// =====================================================
// BOOKING REQUEST HANDLING
// Create, manage, and convert booking requests
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { getBookingSettings } from './settings';
import { isSlotAvailable } from './slots';

export interface BookingRequestInput {
  // Customer info
  customerName: string;
  customerEmail: string;
  customerPhone: string;

  // Service details
  serviceType: string;
  description?: string;
  urgency?: 'normal' | 'urgent' | 'emergency';

  // Preferred times
  preferredDate: string; // YYYY-MM-DD
  preferredTimeSlot?: string; // 'morning', 'afternoon', 'evening', or 'HH:MM'
  alternateDate?: string;
  alternateTimeSlot?: string;

  // Address
  address: string;
  city?: string;
  state?: string;
  zip?: string;

  // Tracking
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface BookingRequest {
  id: string;
  businessId: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceType: string;
  description: string | null;
  urgency: string;
  preferredDate: string;
  preferredTimeSlot: string | null;
  alternateDate: string | null;
  alternateTimeSlot: string | null;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: string;
  confirmedDate: string | null;
  confirmedTime: string | null;
  confirmedBy: string | null;
  declineReason: string | null;
  jobId: string | null;
  source: string;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create a new booking request
 */
export async function createBookingRequest(
  businessId: string,
  input: BookingRequestInput
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  const supabase = await createClient();

  // Verify booking is enabled
  const settings = await getBookingSettings(businessId);
  if (!settings || !settings.isEnabled) {
    return { success: false, error: 'Online booking is not available' };
  }

  // Verify service type is enabled
  if (settings.enabledServices.length > 0 && !settings.enabledServices.includes(input.serviceType)) {
    return { success: false, error: 'This service is not available for online booking' };
  }

  // Check if we can find an existing customer
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id')
    .eq('business_id', businessId)
    .or(`email.eq.${input.customerEmail},phone.eq.${input.customerPhone}`)
    .single();

  const insertData: Record<string, any> = {
    business_id: businessId,
    customer_id: existingCustomer?.id || null,
    customer_name: input.customerName,
    customer_email: input.customerEmail.toLowerCase(),
    customer_phone: input.customerPhone,
    service_type: input.serviceType,
    description: input.description || null,
    urgency: input.urgency || 'normal',
    preferred_date: input.preferredDate,
    preferred_time_slot: input.preferredTimeSlot || null,
    alternate_date: input.alternateDate || null,
    alternate_time_slot: input.alternateTimeSlot || null,
    address: input.address,
    city: input.city || null,
    state: input.state || null,
    zip: input.zip || null,
    status: settings.autoConfirm ? 'confirmed' : 'pending',
    source: input.source || 'website',
    utm_source: input.utmSource || null,
    utm_medium: input.utmMedium || null,
    utm_campaign: input.utmCampaign || null,
  };

  // If auto-confirm and a specific time was requested, confirm it
  if (settings.autoConfirm && input.preferredTimeSlot && input.preferredTimeSlot.includes(':')) {
    insertData.confirmed_date = input.preferredDate;
    insertData.confirmed_time = input.preferredTimeSlot;
  }

  const { data, error } = await supabase
    .from('booking_requests')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Failed to create booking request:', error);
    return { success: false, error: 'Failed to create booking request' };
  }

  // Send notifications
  await sendBookingNotifications(businessId, data, settings);

  return { success: true, requestId: data.id };
}

/**
 * Get booking requests for a business
 */
export async function getBookingRequests(
  businessId: string,
  options?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ requests: BookingRequest[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from('booking_requests')
    .select('*', { count: 'exact' })
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.startDate) {
    query = query.gte('preferred_date', options.startDate);
  }

  if (options?.endDate) {
    query = query.lte('preferred_date', options.endDate);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    requests: (data || []).map(mapBookingRequest),
    total: count || 0,
  };
}

/**
 * Get a single booking request
 */
export async function getBookingRequest(requestId: string): Promise<BookingRequest | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('booking_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  return data ? mapBookingRequest(data) : null;
}

/**
 * Confirm a booking request
 */
export async function confirmBookingRequest(
  requestId: string,
  userId: string,
  confirmedDate: string,
  confirmedTime: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: request } = await supabase
    .from('booking_requests')
    .select('business_id, customer_email, customer_name')
    .eq('id', requestId)
    .single();

  if (!request) {
    return { success: false, error: 'Booking request not found' };
  }

  // Verify slot is available
  const dateTime = new Date(`${confirmedDate}T${confirmedTime}`);
  const availability = await isSlotAvailable(request.business_id, dateTime);

  if (!availability.available) {
    return { success: false, error: availability.reason || 'Time slot not available' };
  }

  const { error } = await supabase
    .from('booking_requests')
    .update({
      status: 'confirmed',
      confirmed_date: confirmedDate,
      confirmed_time: confirmedTime,
      confirmed_by: userId,
    })
    .eq('id', requestId);

  if (error) {
    return { success: false, error: 'Failed to confirm booking' };
  }

  // Send confirmation email to customer
  await sendConfirmationEmail(request.customer_email, request.customer_name, confirmedDate, confirmedTime);

  return { success: true };
}

/**
 * Decline a booking request
 */
export async function declineBookingRequest(
  requestId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: request } = await supabase
    .from('booking_requests')
    .select('customer_email, customer_name')
    .eq('id', requestId)
    .single();

  const { error } = await supabase
    .from('booking_requests')
    .update({
      status: 'declined',
      decline_reason: reason,
    })
    .eq('id', requestId);

  if (error) {
    return { success: false, error: 'Failed to decline booking' };
  }

  // Notify customer
  if (request) {
    await sendDeclineEmail(request.customer_email, request.customer_name, reason);
  }

  return { success: true };
}

/**
 * Convert booking request to a job
 */
export async function convertToJob(
  requestId: string,
  userId: string,
  additionalData?: {
    assignedTo?: string;
    estimatedDuration?: number;
    notes?: string;
  }
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  const supabase = await createClient();

  const { data: request } = await supabase
    .from('booking_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (!request) {
    return { success: false, error: 'Booking request not found' };
  }

  if (request.status !== 'confirmed') {
    return { success: false, error: 'Only confirmed bookings can be converted to jobs' };
  }

  // Create or find customer
  let customerId = request.customer_id;

  if (!customerId) {
    const { data: newCustomer } = await supabase
      .from('customers')
      .insert({
        business_id: request.business_id,
        name: request.customer_name,
        email: request.customer_email,
        phone: request.customer_phone,
        address: request.address,
        city: request.city,
        state: request.state,
        zip: request.zip,
        source: 'online_booking',
      })
      .select()
      .single();

    customerId = newCustomer?.id;
  }

  // Create job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert({
      business_id: request.business_id,
      customer_id: customerId,
      title: `${request.service_type} - ${request.customer_name}`,
      type: request.service_type,
      description: request.description,
      status: 'scheduled',
      priority: request.urgency === 'emergency' ? 'high' : request.urgency === 'urgent' ? 'medium' : 'normal',
      scheduled_date: request.confirmed_date,
      scheduled_time: request.confirmed_time,
      estimated_duration: additionalData?.estimatedDuration || 60,
      address: request.address,
      city: request.city,
      state: request.state,
      zip: request.zip,
      assigned_to: additionalData?.assignedTo || null,
      notes: additionalData?.notes || null,
      created_by: userId,
    })
    .select()
    .single();

  if (jobError) {
    console.error('Failed to create job:', jobError);
    return { success: false, error: 'Failed to create job' };
  }

  // Update booking request
  await supabase
    .from('booking_requests')
    .update({
      status: 'converted',
      job_id: job.id,
      customer_id: customerId,
    })
    .eq('id', requestId);

  return { success: true, jobId: job.id };
}

/**
 * Cancel a booking request
 */
export async function cancelBookingRequest(
  requestId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('booking_requests')
    .update({
      status: 'cancelled',
      internal_notes: reason ? `Cancelled: ${reason}` : null,
    })
    .eq('id', requestId);

  if (error) {
    return { success: false, error: 'Failed to cancel booking' };
  }

  return { success: true };
}

/**
 * Add internal notes to a booking request
 */
export async function updateBookingNotes(
  requestId: string,
  notes: string
): Promise<void> {
  const supabase = await createClient();

  await supabase
    .from('booking_requests')
    .update({ internal_notes: notes })
    .eq('id', requestId);
}

/**
 * Map database row to BookingRequest type
 */
function mapBookingRequest(row: any): BookingRequest {
  return {
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    serviceType: row.service_type,
    description: row.description,
    urgency: row.urgency,
    preferredDate: row.preferred_date,
    preferredTimeSlot: row.preferred_time_slot,
    alternateDate: row.alternate_date,
    alternateTimeSlot: row.alternate_time_slot,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    status: row.status,
    confirmedDate: row.confirmed_date,
    confirmedTime: row.confirmed_time,
    confirmedBy: row.confirmed_by,
    declineReason: row.decline_reason,
    jobId: row.job_id,
    source: row.source,
    internalNotes: row.internal_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Send notifications for new booking request
 */
async function sendBookingNotifications(
  businessId: string,
  request: any,
  settings: any
): Promise<void> {
  if (!settings.notifyEmail) return;

  try {
    const { sendEmail } = await import('@/lib/email');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    await sendEmail({
      to: settings.notifyEmail,
      subject: `New Booking Request: ${request.service_type}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .detail { margin: 10px 0; }
            .label { font-weight: 600; color: #374151; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
            .urgent { color: #dc2626; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">New Booking Request</h2>
            </div>
            <div class="content">
              ${request.urgency === 'urgent' || request.urgency === 'emergency' ? `<p class="urgent">*** ${request.urgency.toUpperCase()} REQUEST ***</p>` : ''}

              <div class="detail">
                <span class="label">Customer:</span> ${request.customer_name}
              </div>
              <div class="detail">
                <span class="label">Email:</span> ${request.customer_email}
              </div>
              <div class="detail">
                <span class="label">Phone:</span> ${request.customer_phone}
              </div>
              <div class="detail">
                <span class="label">Service:</span> ${request.service_type}
              </div>
              <div class="detail">
                <span class="label">Preferred Date:</span> ${request.preferred_date} ${request.preferred_time_slot || ''}
              </div>
              <div class="detail">
                <span class="label">Address:</span> ${request.address}${request.city ? `, ${request.city}` : ''}${request.state ? `, ${request.state}` : ''} ${request.zip || ''}
              </div>
              ${request.description ? `<div class="detail"><span class="label">Description:</span><br>${request.description}</div>` : ''}

              <a href="${baseUrl}/dashboard/bookings/${request.id}" class="button">View Request</a>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `New booking request from ${request.customer_name}\n\nService: ${request.service_type}\nDate: ${request.preferred_date}\nPhone: ${request.customer_phone}\n\nView at: ${baseUrl}/dashboard/bookings/${request.id}`,
    });
  } catch (error) {
    console.log('[DEV] Would send booking notification email');
  }
}

/**
 * Send confirmation email to customer
 */
async function sendConfirmationEmail(
  email: string,
  name: string,
  date: string,
  time: string
): Promise<void> {
  try {
    const { sendEmail } = await import('@/lib/email');

    await sendEmail({
      to: email,
      subject: 'Your Appointment is Confirmed',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .confirmed { background: #10b981; color: white; padding: 20px; border-radius: 8px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="confirmed">
              <h2 style="margin: 0;">Appointment Confirmed!</h2>
            </div>
            <div style="padding: 20px;">
              <p>Hi ${name.split(' ')[0]},</p>
              <p>Your appointment has been confirmed for:</p>
              <p style="font-size: 18px; font-weight: 600;">${new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${time}</p>
              <p>We look forward to seeing you!</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${name.split(' ')[0]},\n\nYour appointment has been confirmed for ${date} at ${time}.\n\nWe look forward to seeing you!`,
    });
  } catch (error) {
    console.log('[DEV] Would send confirmation email');
  }
}

/**
 * Send decline email to customer
 */
async function sendDeclineEmail(
  email: string,
  name: string,
  reason: string
): Promise<void> {
  try {
    const { sendEmail } = await import('@/lib/email');

    await sendEmail({
      to: email,
      subject: 'Booking Request Update',
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <p>Hi ${name.split(' ')[0]},</p>
            <p>Unfortunately, we are unable to accommodate your booking request at this time.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p>Please contact us to discuss alternative options.</p>
          </div>
        </body>
        </html>
      `,
      text: `Hi ${name.split(' ')[0]},\n\nUnfortunately, we are unable to accommodate your booking request at this time.\n\n${reason ? `Reason: ${reason}\n\n` : ''}Please contact us to discuss alternative options.`,
    });
  } catch (error) {
    console.log('[DEV] Would send decline email');
  }
}
