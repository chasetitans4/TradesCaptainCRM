// =====================================================
// CUSTOMER PORTAL DATA ACCESS
// Read customer data for portal views
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';

/**
 * Get customer's upcoming appointments
 */
export async function getCustomerAppointments(customerId: string) {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('jobs')
      .select(
        `
        id,
        title:service_type,
        description,
        scheduled_date,
        scheduled_time:scheduled_time_start,
        estimated_duration,
        status,
        address:job_address_line1,
        assigned_user:users!jobs_assigned_user_id_fkey(id, first_name, last_name, phone)
      `
      )
      .eq('customer_id', customerId)
      .in('status', ['scheduled', 'in_progress', 'on_the_way'])
      .order('scheduled_date', { ascending: true })
      .limit(10);

    if (error) return [];
    
    // Map data to include full name
    return (data || []).map((job: any) => ({
      ...job,
      assigned_user: job.assigned_user ? {
        ...job.assigned_user,
        name: [job.assigned_user.first_name, job.assigned_user.last_name].filter(Boolean).join(' ') || 'Technician'
      } : null
    }));
  } catch {
    return [];
  }
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
  try {
    const supabase = createAdminClient();
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    const { data, count, error } = await supabase
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

    if (error) return { jobs: [], total: 0 };
    return { jobs: data || [], total: count || 0 };
  } catch {
    return { jobs: [], total: 0 };
  }
}

/**
 * Get customer's invoices
 */
export async function getCustomerInvoices(
  customerId: string,
  status?: 'unpaid' | 'paid' | 'all'
) {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from('invoices')
      .select(
        `
        id,
        invoice_number,
        status,
        subtotal,
        tax:tax_amount,
        total,
        due_date,
        paid_at,
        paid_amount:amount_paid,
        payment_method,
        created_at,
        job:jobs(title:service_type)
      `
      )
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (status === 'unpaid') {
      query = query.in('status', ['sent', 'overdue', 'partial']);
    } else if (status === 'paid') {
      query = query.eq('status', 'paid');
    }

    const { data, error } = await query;
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Get customer's quotes
 */
export async function getCustomerQuotes(customerId: string) {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('quotes')
      .select(
        `
        id,
        quote_number,
        status,
        total,
        valid_until,
        created_at,
        items:quote_items(*)
      `
      )
      .eq('customer_id', customerId)
      .in('status', ['sent', 'viewed'])
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Get customer's equipment (simple version without business filter)
 * @deprecated Use getCustomerEquipment from ./equipment instead
 */
export async function getCustomerEquipmentSimple(customerId: string) {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
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

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Get customer's service agreements
 */
export async function getCustomerAgreements(customerId: string) {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
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

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Get customer profile
 */
export async function getCustomerProfile(customerId: string) {
  try {
    const supabase = createAdminClient();

    // Check if key is loaded
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Data] SUPABASE_SERVICE_ROLE_KEY is missing!');
    }

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error) {
      // console.error('[Data] Error fetching customer:', error);
      return null;
    }
    
    if (!data) {
      // console.log('[Data] Customer query returned no data');
    }

    return data;
  } catch (_err) {
    // console.error('[Data] Exception fetching customer:', err);
    return null;
  }
}

/**
 * Get business info for portal branding
 */
export async function getBusinessForPortal(businessId: string) {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('businesses')
    .select('id, name, phone, email, logo_url, primary_color')
    .eq('id', businessId)
    .single();

  return data;
}

/**
 * Get platform settings for portal branding fallback
 */
export async function getPlatformSettings() {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'platform_branding')
      .single();
    
    return data?.value || null;
  } catch {
    return null;
  }
}

/**
 * Get customer's service requests
 */
export async function getCustomerServiceRequests(customerId: string) {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
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

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
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
    photos?: string[];
  }
) {
  const supabase = createAdminClient();

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
      photos: data.photos || [],
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
  const supabase = createAdminClient();

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
 * Get customer's documents (simple version without business filter)
 * @deprecated Use getCustomerDocuments from ./documents instead
 */
export async function getCustomerDocumentsSimple(customerId: string) {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
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
      .eq('visibility', 'customer_visible')
      .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Get customer's payment methods (if stored)
 */
export async function getCustomerPaymentMethods(customerId: string) {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
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

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

/**
 * Get customer dashboard summary
 */
export async function getCustomerDashboardSummary(customerId: string) {
  try {
    const supabase = createAdminClient();

    // Get counts in parallel - handle errors gracefully
    const results = await Promise.allSettled([
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

    // Extract values with safe defaults
    const upcomingAppointments = results[0].status === 'fulfilled' ? results[0].value.count || 0 : 0;
    const unpaidInvoices = results[1].status === 'fulfilled' ? results[1].value.count || 0 : 0;
    const totalDueData = results[2].status === 'fulfilled' ? results[2].value.data : null;
    const activeEquipment = results[3].status === 'fulfilled' ? results[3].value.count || 0 : 0;
    const pendingRequests = results[4].status === 'fulfilled' ? results[4].value.count || 0 : 0;

    const totalDue = totalDueData?.reduce((sum: number, inv: { total?: number }) => sum + (inv.total || 0), 0) || 0;

    return {
      upcomingAppointments,
      unpaidInvoices,
      totalDue,
      activeEquipment,
      pendingRequests,
    };
  } catch {
    // Return safe defaults if something goes wrong
    return {
      upcomingAppointments: 0,
      unpaidInvoices: 0,
      totalDue: 0,
      activeEquipment: 0,
      pendingRequests: 0,
    };
  }
}
