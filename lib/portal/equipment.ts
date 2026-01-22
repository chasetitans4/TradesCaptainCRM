// =====================================================
// PORTAL EQUIPMENT REGISTRY
// Customer equipment and service history
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { syncLogger } from '@/lib/logger';
import type {
  CustomerEquipment,
  ServiceHistoryItem,
  MaintenanceReminder,
  Warranty,
} from './types';

/**
 * Get all equipment for a customer (portal visible only)
 */
export async function getCustomerEquipment(
  customerId: string,
  businessId: string
): Promise<CustomerEquipment[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('customer_equipment')
    .select('*')
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .eq('portal_visible', true)
    .neq('status', 'removed')
    .order('install_date', { ascending: false });

  if (error) {
    syncLogger.error({
      msg: 'Failed to fetch customer equipment',
      customerId,
      error: error.message,
    });
    return [];
  }

  return data || [];
}

/**
 * Get single equipment item with full details
 */
export async function getEquipmentDetails(
  equipmentId: string,
  customerId: string,
  businessId: string
): Promise<CustomerEquipment | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('customer_equipment')
    .select('*')
    .eq('id', equipmentId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .eq('portal_visible', true)
    .single();

  if (error) {
    return null;
  }

  return data;
}

/**
 * Get service history for equipment
 */
export async function getEquipmentServiceHistory(
  equipmentId: string,
  customerId: string,
  businessId: string,
  limit: number = 20
): Promise<ServiceHistoryItem[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('job_equipment')
    .select(`
      job:jobs(
        id,
        scheduled_date,
        scheduled_time_start,
        scheduled_time_end,
        service_type,
        job_type,
        status,
        description,
        customer_summary,
        customer_rating,
        customer_feedback,
        portal_visible,
        assigned_user_id,
        users:assigned_user_id(name)
      ),
      service_performed,
      notes
    `)
    .eq('equipment_id', equipmentId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    syncLogger.error({
      msg: 'Failed to fetch equipment service history',
      equipmentId,
      error: error.message,
    });
    return [];
  }

  // Filter to only portal visible completed jobs and transform
  return (data || [])
    .filter((item: any) => item.job?.portal_visible && item.job?.status === 'completed')
    .map((item: any) => ({
      id: item.job.id,
      scheduled_date: item.job.scheduled_date,
      scheduled_time_start: item.job.scheduled_time_start,
      scheduled_time_end: item.job.scheduled_time_end,
      service_type: item.job.service_type,
      job_type: item.job.job_type,
      status: item.job.status,
      description: item.service_performed || item.job.description,
      customer_summary: item.job.customer_summary,
      technician_name: item.job.users?.name,
      customer_rating: item.job.customer_rating,
      customer_feedback: item.job.customer_feedback,
    }));
}

/**
 * Get all service history for a customer
 */
export async function getCustomerServiceHistory(
  customerId: string,
  businessId: string,
  limit: number = 50
): Promise<ServiceHistoryItem[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('jobs')
    .select(`
      id,
      scheduled_date,
      scheduled_time_start,
      scheduled_time_end,
      service_type,
      job_type,
      status,
      description,
      customer_summary,
      customer_rating,
      customer_feedback,
      assigned_user_id,
      users:assigned_user_id(name),
      job_photos(id, photo_url, photo_type, caption),
      job_equipment(
        equipment:customer_equipment(id, name, equipment_type, brand, model)
      ),
      invoices(id, status, total)
    `)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .eq('portal_visible', true)
    .eq('status', 'completed')
    .order('scheduled_date', { ascending: false })
    .limit(limit);

  if (error) {
    syncLogger.error({
      msg: 'Failed to fetch customer service history',
      customerId,
      error: error.message,
    });
    return [];
  }

  return (data || []).map((job: any) => ({
    id: job.id,
    scheduled_date: job.scheduled_date,
    scheduled_time_start: job.scheduled_time_start,
    scheduled_time_end: job.scheduled_time_end,
    service_type: job.service_type,
    job_type: job.job_type,
    status: job.status,
    description: job.description,
    customer_summary: job.customer_summary,
    technician_name: job.users?.name,
    customer_rating: job.customer_rating,
    customer_feedback: job.customer_feedback,
    photos: job.job_photos,
    equipment: job.job_equipment?.map((je: any) => je.equipment).filter(Boolean),
    invoice_id: job.invoices?.[0]?.id,
    invoice_status: job.invoices?.[0]?.status,
    total_amount: job.invoices?.[0]?.total,
  }));
}

/**
 * Submit feedback for a completed job
 */
export async function submitJobFeedback(
  jobId: string,
  customerId: string,
  businessId: string,
  rating: number,
  feedback?: string
): Promise<{ success: boolean; error?: string }> {
  if (rating < 1 || rating > 5) {
    return { success: false, error: 'Rating must be between 1 and 5' };
  }

  const supabase = createAdminClient();

  // Verify job belongs to customer
  const { data: job } = await supabase
    .from('jobs')
    .select('id, status, customer_rating')
    .eq('id', jobId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!job) {
    return { success: false, error: 'Job not found' };
  }

  if (job.status !== 'completed') {
    return { success: false, error: 'Can only rate completed jobs' };
  }

  if (job.customer_rating) {
    return { success: false, error: 'Feedback already submitted for this job' };
  }

  const { error } = await supabase
    .from('jobs')
    .update({
      customer_rating: rating,
      customer_feedback: feedback,
      feedback_submitted_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    syncLogger.error({
      msg: 'Failed to submit job feedback',
      jobId,
      error: error.message,
    });
    return { success: false, error: 'Failed to submit feedback' };
  }

  return { success: true };
}

/**
 * Get maintenance reminders for a customer
 */
export async function getMaintenanceReminders(
  customerId: string,
  businessId: string
): Promise<MaintenanceReminder[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('maintenance_reminders')
    .select(`
      *,
      equipment:customer_equipment(id, name, equipment_type, brand, model)
    `)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .in('status', ['pending', 'sent'])
    .order('due_date', { ascending: true });

  if (error) {
    syncLogger.error({
      msg: 'Failed to fetch maintenance reminders',
      customerId,
      error: error.message,
    });
    return [];
  }

  return data || [];
}

/**
 * Get warranties for a customer
 */
export async function getCustomerWarranties(
  customerId: string,
  businessId: string
): Promise<Warranty[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('warranties')
    .select(`
      *,
      equipment:customer_equipment(id, name, equipment_type, brand, model),
      warranty_claims(*)
    `)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .eq('portal_visible', true)
    .order('end_date', { ascending: true });

  if (error) {
    syncLogger.error({
      msg: 'Failed to fetch customer warranties',
      customerId,
      error: error.message,
    });
    return [];
  }

  return (data || []).map((warranty: any) => ({
    ...warranty,
    claims: warranty.warranty_claims,
  }));
}

/**
 * Get warranties expiring soon
 */
export async function getExpiringWarranties(
  customerId: string,
  businessId: string,
  daysAhead: number = 90
): Promise<Warranty[]> {
  const supabase = createAdminClient();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const { data, error } = await supabase
    .from('warranties')
    .select(`
      *,
      equipment:customer_equipment(id, name, equipment_type, brand, model)
    `)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .eq('portal_visible', true)
    .eq('status', 'active')
    .lte('end_date', futureDate.toISOString().split('T')[0])
    .gte('end_date', new Date().toISOString().split('T')[0])
    .order('end_date', { ascending: true });

  if (error) {
    return [];
  }

  return data || [];
}
