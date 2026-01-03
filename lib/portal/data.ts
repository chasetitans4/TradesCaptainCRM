// =====================================================
// CUSTOMER PORTAL DATA ACCESS
// Read customer data for portal views
// =====================================================

import { createClient } from '@/lib/supabase/server';

/**
 * Get customer's upcoming appointments
 */
export async function getCustomerAppointments(customerId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('jobs')
    .select(
      `
      id,
      title,
      description,
      scheduled_date,
      scheduled_time,
      estimated_duration,
      status,
      address,
      assigned_user:users(id, name, phone)
    `
    )
    .eq('customer_id', customerId)
    .in('status', ['scheduled', 'in_progress', 'on_the_way'])
    .order('scheduled_date', { ascending: true })
    .limit(10);

  return data || [];
}

/**
 * Get customer's job history
 */
export async function getCustomerJobHistory(
  customerId: string,
  options?: {
    limit?: number;
    offset?: number;
  }
) {
  const supabase = await createClient();
  const limit = options?.limit || 20;
  const offset = options?.offset || 0;

  const { data, count } = await supabase
    .from('jobs')
    .select(
      `
      id,
      title,
      description,
      scheduled_date,
      completed_at,
      status,
      total,
      job_type
    `,
      { count: 'exact' }
    )
    .eq('customer_id', customerId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { jobs: data || [], total: count || 0 };
}

/**
 * Get customer's invoices
 */
export async function getCustomerInvoices(
  customerId: string,
  status?: 'unpaid' | 'paid' | 'all'
) {
  const supabase = await createClient();

  let query = supabase
    .from('invoices')
    .select(
      `
      id,
      invoice_number,
      status,
      subtotal,
      tax,
      total,
      due_date,
      paid_at,
      paid_amount,
      payment_method,
      created_at,
      job:jobs(title)
    `
    )
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (status === 'unpaid') {
    query = query.in('status', ['sent', 'overdue', 'partial']);
  } else if (status === 'paid') {
    query = query.eq('status', 'paid');
  }

  const { data } = await query;
  return data || [];
}

/**
 * Get customer's quotes
 */
export async function getCustomerQuotes(customerId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('quotes')
    .select(
      `
      id,
      quote_number,
      status,
      total,
      valid_until,
      created_at,
      items
    `
    )
    .eq('customer_id', customerId)
    .in('status', ['sent', 'viewed'])
    .order('created_at', { ascending: false });

  return data || [];
}

/**
 * Get customer's equipment
 */
export async function getCustomerEquipment(customerId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('customer_equipment')
    .select(
      `
      id,
      equipment_type,
      name,
      brand,
      model,
      serial_number,
      install_date,
      warranty_expires,
      last_service_date,
      next_service_due,
      notes,
      status
    `
    )
    .eq('customer_id', customerId)
    .eq('status', 'active')
    .order('equipment_type');

  return data || [];
}

/**
 * Get customer's service agreements
 */
export async function getCustomerAgreements(customerId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('service_agreements')
    .select(
      `
      id,
      name,
      type,
      status,
      start_date,
      end_date,
      billing_cycle,
      amount,
      services_included,
      visits_remaining
    `
    )
    .eq('customer_id', customerId)
    .in('status', ['active', 'pending'])
    .order('end_date', { ascending: true });

  return data || [];
}

/**
 * Get customer profile
 */
export async function getCustomerProfile(customerId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('customers')
    .select(
      `
      id,
      name,
      email,
      phone,
      address,
      city,
      state,
      zip,
      created_at
    `
    )
    .eq('id', customerId)
    .single();

  return data;
}

/**
 * Get business info for portal branding
 */
export async function getBusinessForPortal(businessId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('businesses')
    .select(
      `
      id,
      name,
      phone,
      email,
      address,
      city,
      state,
      zip,
      website,
      logo_url
    `
    )
    .eq('id', businessId)
    .single();

  return data;
}

/**
 * Get customer's service requests
 */
export async function getCustomerServiceRequests(customerId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('service_requests')
    .select(
      `
      id,
      service_type,
      description,
      urgency,
      status,
      preferred_date,
      preferred_time_slot,
      job_id,
      created_at
    `
    )
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(20);

  return data || [];
}

/**
 * Submit a service request from the portal
 */
export async function submitServiceRequest(
  customerId: string,
  businessId: string,
  data: {
    serviceType: string;
    description: string;
    preferredDate?: string;
    preferredTimeSlot?: string;
    urgency?: 'normal' | 'urgent' | 'emergency';
    flexibleScheduling?: boolean;
    equipmentId?: string;
    notes?: string;
  }
) {
  const supabase = await createClient();

  const { data: request, error } = await supabase
    .from('service_requests')
    .insert({
      business_id: businessId,
      customer_id: customerId,
      service_type: data.serviceType,
      description: data.description,
      preferred_date: data.preferredDate,
      preferred_time_slot: data.preferredTimeSlot,
      urgency: data.urgency || 'normal',
      flexible_scheduling: data.flexibleScheduling !== false,
      equipment_id: data.equipmentId,
      customer_notes: data.notes,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  // Notify business about new request
  await notifyNewServiceRequest(businessId, request.id);

  return request;
}

/**
 * Notify business about new service request
 */
async function notifyNewServiceRequest(
  businessId: string,
  requestId: string
): Promise<void> {
  const supabase = await createClient();

  // Get request details
  const { data: request } = await supabase
    .from('service_requests')
    .select('*, customer:customers(name, phone)')
    .eq('id', requestId)
    .single();

  if (!request) return;

  // Get business notification settings
  const { data: settings } = await supabase
    .from('booking_settings')
    .select('notify_email')
    .eq('business_id', businessId)
    .single();

  if (settings?.notify_email) {
    try {
      const { sendEmail } = await import('@/lib/email');
      await sendEmail({
        to: settings.notify_email,
        subject: `New Service Request from ${request.customer?.name}`,
        html: `
          <h2>New Service Request</h2>
          <p><strong>Customer:</strong> ${request.customer?.name}</p>
          <p><strong>Phone:</strong> ${request.customer?.phone}</p>
          <p><strong>Service:</strong> ${request.service_type}</p>
          <p><strong>Urgency:</strong> ${request.urgency}</p>
          <p><strong>Description:</strong> ${request.description}</p>
          ${request.preferred_date ? `<p><strong>Preferred Date:</strong> ${request.preferred_date}</p>` : ''}
        `,
      });
    } catch {
      // Email sending failed - notification was not sent but request was still created
    }
  }

  // Create notification for business users
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('business_id', businessId)
    .in('role', ['owner', 'admin', 'dispatcher']);

  if (users?.length) {
    await supabase.from('notifications').insert(
      users.map((user) => ({
        user_id: user.id,
        type: 'service_request',
        title: 'New Service Request',
        message: `${request.customer?.name} submitted a service request for ${request.service_type}`,
        data: { request_id: requestId },
      }))
    );
  }
}

/**
 * Get customer's documents
 */
export async function getCustomerDocuments(customerId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('documents')
    .select(
      `
      id,
      name,
      type,
      category,
      file_url,
      file_size,
      created_at
    `
    )
    .eq('customer_id', customerId)
    .eq('customer_visible', true)
    .order('created_at', { ascending: false });

  return data || [];
}

/**
 * Get customer's payment methods (if stored)
 */
export async function getCustomerPaymentMethods(customerId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('payment_methods')
    .select(
      `
      id,
      type,
      last_four,
      brand,
      exp_month,
      exp_year,
      is_default
    `
    )
    .eq('customer_id', customerId)
    .eq('status', 'active')
    .order('is_default', { ascending: false });

  return data || [];
}

/**
 * Get customer dashboard summary
 */
export async function getCustomerDashboardSummary(customerId: string) {
  const supabase = await createClient();

  // Get counts in parallel
  const [
    { count: upcomingAppointments },
    { count: unpaidInvoices },
    { data: totalDueData },
    { count: activeEquipment },
    { count: pendingRequests },
  ] = await Promise.all([
    supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .in('status', ['scheduled', 'in_progress']),
    supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .in('status', ['sent', 'overdue']),
    supabase
      .from('invoices')
      .select('total')
      .eq('customer_id', customerId)
      .in('status', ['sent', 'overdue']),
    supabase
      .from('customer_equipment')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .eq('status', 'active'),
    supabase
      .from('service_requests')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .eq('status', 'pending'),
  ]);

  const totalDue = totalDueData?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

  return {
    upcomingAppointments: upcomingAppointments || 0,
    unpaidInvoices: unpaidInvoices || 0,
    totalDue,
    activeEquipment: activeEquipment || 0,
    pendingRequests: pendingRequests || 0,
  };
}
