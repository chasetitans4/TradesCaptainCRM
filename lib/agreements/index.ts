// =====================================================
// SERVICE AGREEMENTS / RECURRING JOBS LIBRARY
// Manage maintenance contracts and recurring jobs
// =====================================================

import { createClient as createServerClient } from '@/lib/supabase/server';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

export type AgreementFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'biannual' | 'annual';
export type AgreementStatus = 'active' | 'paused' | 'cancelled' | 'expired';

export interface JobTemplate {
  title: string;
  description?: string;
  job_type?: string;
  duration_hours?: number;
  checklist_template_id?: string;
}

export interface ServiceAgreement {
  id: string;
  business_id: string;
  customer_id: string;
  name: string;
  description?: string;
  frequency: AgreementFrequency;
  start_date: string;
  end_date?: string;
  next_service_date?: string;
  price_per_service?: number;
  annual_price?: number;
  job_template?: JobTemplate;
  auto_generate_jobs: boolean;
  days_before_to_generate: number;
  auto_notify_customer: boolean;
  status: AgreementStatus;
  auto_renew: boolean;
  renewal_reminder_days: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  customer?: { id: string; name: string; phone?: string; email?: string };
  equipment?: { equipment: any }[];
}

interface CreateAgreementParams {
  businessId: string;
  customerId: string;
  name: string;
  frequency: AgreementFrequency;
  startDate: string;
  endDate?: string;
  pricePerService?: number;
  annualPrice?: number;
  jobTemplate?: JobTemplate;
  equipmentIds?: string[];
  autoGenerateJobs?: boolean;
  autoNotifyCustomer?: boolean;
  notes?: string;
}

/**
 * Create a new service agreement
 */
export async function createServiceAgreement(params: CreateAgreementParams): Promise<ServiceAgreement> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('service_agreements')
    .insert({
      business_id: params.businessId,
      customer_id: params.customerId,
      name: params.name,
      frequency: params.frequency,
      start_date: params.startDate,
      end_date: params.endDate,
      next_service_date: params.startDate,
      price_per_service: params.pricePerService,
      annual_price: params.annualPrice,
      job_template: params.jobTemplate,
      auto_generate_jobs: params.autoGenerateJobs ?? true,
      auto_notify_customer: params.autoNotifyCustomer ?? true,
      notes: params.notes,
    })
    .select()
    .single();

  if (error) throw error;

  // Link equipment
  if (params.equipmentIds?.length) {
    await supabase.from('agreement_equipment').insert(
      params.equipmentIds.map(eqId => ({
        service_agreement_id: data.id,
        equipment_id: eqId,
      }))
    );
  }

  return data;
}

/**
 * Get a single agreement by ID
 */
export async function getAgreement(agreementId: string): Promise<ServiceAgreement | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('service_agreements')
    .select(`
      *,
      customer:customers(id, name, phone, email),
      equipment:agreement_equipment(
        equipment:customer_equipment(id, name, equipment_type, brand, model)
      )
    `)
    .eq('id', agreementId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Update an agreement
 */
export async function updateAgreement(
  agreementId: string,
  updates: {
    name?: string;
    price?: number;
    frequency?: AgreementFrequency;
    description?: string;
    terms?: string;
    autoRenew?: boolean;
    reminderDays?: number;
    endDate?: Date;
  }
): Promise<ServiceAgreement> {
  const supabase = await createServerClient();

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.price !== undefined) updateData.price_per_service = updates.price;
  if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.autoRenew !== undefined) updateData.auto_renew = updates.autoRenew;
  if (updates.reminderDays !== undefined) updateData.renewal_reminder_days = updates.reminderDays;
  if (updates.endDate !== undefined) updateData.end_date = updates.endDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('service_agreements')
    .update(updateData)
    .eq('id', agreementId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Cancel an agreement
 */
export async function cancelAgreement(agreementId: string, reason?: string): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('service_agreements')
    .update({
      status: 'cancelled',
      notes: reason ? `Cancelled: ${reason}` : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agreementId);

  if (error) throw error;
}

/**
 * Get all agreements for a customer
 */
export async function getCustomerAgreements(customerId: string): Promise<ServiceAgreement[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('service_agreements')
    .select(`
      *,
      equipment:agreement_equipment(
        equipment:customer_equipment(id, name, equipment_type, brand, model)
      )
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get all active agreements for a business
 */
export async function getActiveAgreements(businessId: string): Promise<ServiceAgreement[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('service_agreements')
    .select(`
      *,
      customer:customers(id, name, phone, email),
      equipment:agreement_equipment(
        equipment:customer_equipment(id, name, equipment_type)
      )
    `)
    .eq('business_id', businessId)
    .eq('status', 'active')
    .order('next_service_date');

  if (error) throw error;
  return data;
}

/**
 * Get upcoming services (for scheduling)
 */
export async function getUpcomingServices(
  businessId: string,
  withinDays: number = 14
): Promise<ServiceAgreement[]> {
  const supabase = await createServerClient();

  const futureDate = addDays(new Date(), withinDays);

  const { data, error } = await supabase
    .from('service_agreements')
    .select(`
      *,
      customer:customers(id, name, phone, email, address)
    `)
    .eq('business_id', businessId)
    .eq('status', 'active')
    .lte('next_service_date', futureDate.toISOString().split('T')[0])
    .gte('next_service_date', new Date().toISOString().split('T')[0])
    .order('next_service_date');

  if (error) throw error;
  return data;
}

/**
 * Calculate next service date based on frequency
 */
export function calculateNextServiceDate(currentDate: Date, frequency: AgreementFrequency): Date {
  switch (frequency) {
    case 'weekly':
      return addWeeks(currentDate, 1);
    case 'biweekly':
      return addWeeks(currentDate, 2);
    case 'monthly':
      return addMonths(currentDate, 1);
    case 'quarterly':
      return addMonths(currentDate, 3);
    case 'biannual':
      return addMonths(currentDate, 6);
    case 'annual':
      return addYears(currentDate, 1);
    default:
      return addMonths(currentDate, 1);
  }
}

/**
 * Process recurring jobs - generate jobs from agreements
 * This should be called by a cron job
 */
export async function processRecurringJobs(): Promise<{
  generated: number;
  errors: string[];
}> {
  const supabase = await createServerClient();

  const result = {
    generated: 0,
    errors: [] as string[],
  };

  // Find agreements where next_service_date is within generation window
  const { data: agreements, error } = await supabase
    .from('service_agreements')
    .select(`
      *,
      customer:customers(id, name),
      equipment:agreement_equipment(equipment:customer_equipment(*))
    `)
    .eq('status', 'active')
    .eq('auto_generate_jobs', true)
    .lte('next_service_date', addDays(new Date(), 14).toISOString().split('T')[0])
    .gte('next_service_date', new Date().toISOString().split('T')[0]);

  if (error) {
    result.errors.push(`Failed to fetch agreements: ${error.message}`);
    return result;
  }

  for (const agreement of agreements || []) {
    try {
      // Check if job already exists for this date
      const { data: existingJob } = await supabase
        .from('jobs')
        .select('id')
        .eq('service_agreement_id', agreement.id)
        .eq('scheduled_date', agreement.next_service_date)
        .single();

      if (existingJob) continue; // Already generated

      // Create job from template
      const template = (agreement.job_template as JobTemplate) || {};

      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          business_id: agreement.business_id,
          customer_id: agreement.customer_id,
          service_agreement_id: agreement.id,
          is_recurring: true,
          title: template.title || agreement.name,
          description: template.description,
          job_type: template.job_type,
          scheduled_date: agreement.next_service_date,
          estimated_duration: template.duration_hours,
          status: 'scheduled',
        })
        .select()
        .single();

      if (jobError) {
        result.errors.push(`Failed to create job for agreement ${agreement.id}: ${jobError.message}`);
        continue;
      }

      // Apply checklist if specified
      if (template.checklist_template_id && job) {
        // Import dynamically to avoid circular dependency
        const { applyChecklistToJob } = await import('@/lib/checklists');
        await applyChecklistToJob(job.id, template.checklist_template_id);
      }

      // Calculate next service date
      const nextDate = calculateNextServiceDate(
        new Date(agreement.next_service_date),
        agreement.frequency
      );

      // Check if next date exceeds end date
      let newStatus = agreement.status;
      if (agreement.end_date && nextDate > new Date(agreement.end_date)) {
        newStatus = 'expired';
      }

      await supabase
        .from('service_agreements')
        .update({
          next_service_date: nextDate.toISOString().split('T')[0],
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', agreement.id);

      result.generated++;

      // Notify customer if enabled
      if (agreement.auto_notify_customer) {
        // Send SMS/email about upcoming service
        // Implementation would use SMS library
      }
    } catch (err: any) {
      result.errors.push(`Error processing agreement ${agreement.id}: ${err.message}`);
    }
  }

  return result;
}

/**
 * Update agreement status
 */
export async function updateAgreementStatus(
  agreementId: string,
  status: AgreementStatus
): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('service_agreements')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', agreementId);

  if (error) throw error;
}

/**
 * Update agreement
 */
export async function updateServiceAgreement(
  agreementId: string,
  updates: Partial<Omit<CreateAgreementParams, 'businessId' | 'customerId'>> & {
    status?: AgreementStatus;
    nextServiceDate?: string;
  }
): Promise<ServiceAgreement> {
  const supabase = await createServerClient();

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
  if (updates.startDate !== undefined) updateData.start_date = updates.startDate;
  if (updates.endDate !== undefined) updateData.end_date = updates.endDate;
  if (updates.pricePerService !== undefined) updateData.price_per_service = updates.pricePerService;
  if (updates.annualPrice !== undefined) updateData.annual_price = updates.annualPrice;
  if (updates.jobTemplate !== undefined) updateData.job_template = updates.jobTemplate;
  if (updates.autoGenerateJobs !== undefined) updateData.auto_generate_jobs = updates.autoGenerateJobs;
  if (updates.autoNotifyCustomer !== undefined) updateData.auto_notify_customer = updates.autoNotifyCustomer;
  if (updates.notes !== undefined) updateData.notes = updates.notes;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.nextServiceDate !== undefined) updateData.next_service_date = updates.nextServiceDate;

  const { data, error } = await supabase
    .from('service_agreements')
    .update(updateData)
    .eq('id', agreementId)
    .select()
    .single();

  if (error) throw error;

  // Update equipment if provided
  if (updates.equipmentIds !== undefined) {
    // Remove existing
    await supabase
      .from('agreement_equipment')
      .delete()
      .eq('service_agreement_id', agreementId);

    // Add new
    if (updates.equipmentIds.length) {
      await supabase.from('agreement_equipment').insert(
        updates.equipmentIds.map(eqId => ({
          service_agreement_id: agreementId,
          equipment_id: eqId,
        }))
      );
    }
  }

  return data;
}

/**
 * Get agreements expiring soon (for renewal reminders)
 */
export async function getExpiringAgreements(
  businessId: string,
  withinDays: number = 30
): Promise<ServiceAgreement[]> {
  const supabase = await createServerClient();

  const futureDate = addDays(new Date(), withinDays);

  const { data, error } = await supabase
    .from('service_agreements')
    .select(`
      *,
      customer:customers(id, name, phone, email)
    `)
    .eq('business_id', businessId)
    .eq('status', 'active')
    .not('end_date', 'is', null)
    .lte('end_date', futureDate.toISOString().split('T')[0])
    .gte('end_date', new Date().toISOString().split('T')[0])
    .order('end_date');

  if (error) throw error;
  return data;
}

/**
 * Renew an agreement
 */
export async function renewAgreement(
  agreementId: string,
  newEndDate?: string
): Promise<ServiceAgreement> {
  const supabase = await createServerClient();

  const { data: agreement, error: fetchError } = await supabase
    .from('service_agreements')
    .select('*')
    .eq('id', agreementId)
    .single();

  if (fetchError) throw fetchError;

  // Calculate new end date if not provided
  let endDate = newEndDate;
  if (!endDate && agreement.end_date) {
    const currentEnd = new Date(agreement.end_date);
    endDate = addYears(currentEnd, 1).toISOString().split('T')[0];
  }

  const { data, error } = await supabase
    .from('service_agreements')
    .update({
      end_date: endDate,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', agreementId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get agreement statistics for a business
 */
export async function getAgreementStats(businessId: string): Promise<{
  total: number;
  active: number;
  paused: number;
  expiringSoon: number;
  monthlyRecurringRevenue: number;
}> {
  const supabase = await createServerClient();

  const { data: agreements, error } = await supabase
    .from('service_agreements')
    .select('status, price_per_service, frequency, end_date')
    .eq('business_id', businessId);

  if (error) throw error;

  const thirtyDaysFromNow = addDays(new Date(), 30);

  let monthlyRevenue = 0;
  const stats = {
    total: agreements.length,
    active: 0,
    paused: 0,
    expiringSoon: 0,
    monthlyRecurringRevenue: 0,
  };

  for (const agreement of agreements) {
    if (agreement.status === 'active') {
      stats.active++;

      // Calculate monthly revenue contribution
      if (agreement.price_per_service) {
        switch (agreement.frequency) {
          case 'weekly':
            monthlyRevenue += agreement.price_per_service * 4;
            break;
          case 'biweekly':
            monthlyRevenue += agreement.price_per_service * 2;
            break;
          case 'monthly':
            monthlyRevenue += agreement.price_per_service;
            break;
          case 'quarterly':
            monthlyRevenue += agreement.price_per_service / 3;
            break;
          case 'biannual':
            monthlyRevenue += agreement.price_per_service / 6;
            break;
          case 'annual':
            monthlyRevenue += agreement.price_per_service / 12;
            break;
        }
      }

      // Check if expiring soon
      if (agreement.end_date && new Date(agreement.end_date) <= thirtyDaysFromNow) {
        stats.expiringSoon++;
      }
    } else if (agreement.status === 'paused') {
      stats.paused++;
    }
  }

  stats.monthlyRecurringRevenue = Math.round(monthlyRevenue * 100) / 100;

  return stats;
}
