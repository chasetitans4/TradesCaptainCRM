// =====================================================
// CUSTOMER EQUIPMENT TRACKING LIBRARY
// Track and manage equipment at customer locations
// =====================================================

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/client';

export interface CustomerEquipment {
  id: string;
  business_id: string;
  customer_id: string;
  equipment_type: string;
  name?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  location_in_property?: string;
  install_date?: string;
  manufacture_date?: string;
  last_service_date?: string;
  next_service_due?: string;
  warranty_expires?: string;
  warranty_provider?: string;
  warranty_details?: string;
  specifications?: Record<string, any>;
  status: 'active' | 'needs_repair' | 'replaced' | 'removed';
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  photo_urls?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface CreateEquipmentParams {
  businessId: string;
  customerId: string;
  equipmentType: string;
  name?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  locationInProperty?: string;
  installDate?: string;
  warrantyExpires?: string;
  specifications?: Record<string, any>;
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
}

interface EquipmentType {
  id: string;
  business_id?: string;
  name: string;
  icon?: string;
  default_specs?: Record<string, any>;
}

/**
 * Create new equipment for a customer
 */
export async function createEquipment(params: CreateEquipmentParams): Promise<CustomerEquipment> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('customer_equipment')
    .insert({
      business_id: params.businessId,
      customer_id: params.customerId,
      equipment_type: params.equipmentType,
      name: params.name,
      brand: params.brand,
      model: params.model,
      serial_number: params.serialNumber,
      location_in_property: params.locationInProperty,
      install_date: params.installDate,
      warranty_expires: params.warrantyExpires,
      specifications: params.specifications,
      condition: params.condition,
      notes: params.notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all equipment for a customer
 */
export async function getCustomerEquipment(customerId: string): Promise<CustomerEquipment[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('customer_equipment')
    .select(`
      *,
      jobs:job_equipment(
        job:jobs(id, title, status, scheduled_date)
      )
    `)
    .eq('customer_id', customerId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get single equipment by ID
 */
export async function getEquipment(equipmentId: string): Promise<CustomerEquipment | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('customer_equipment')
    .select('*')
    .eq('id', equipmentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Update equipment
 */
export async function updateEquipment(
  equipmentId: string,
  updates: Partial<Omit<CreateEquipmentParams, 'businessId' | 'customerId'>> & {
    status?: CustomerEquipment['status'];
    lastServiceDate?: string;
    nextServiceDue?: string;
  }
): Promise<CustomerEquipment> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('customer_equipment')
    .update({
      equipment_type: updates.equipmentType,
      name: updates.name,
      brand: updates.brand,
      model: updates.model,
      serial_number: updates.serialNumber,
      location_in_property: updates.locationInProperty,
      install_date: updates.installDate,
      warranty_expires: updates.warrantyExpires,
      specifications: updates.specifications,
      condition: updates.condition,
      notes: updates.notes,
      status: updates.status,
      last_service_date: updates.lastServiceDate,
      next_service_due: updates.nextServiceDue,
      updated_at: new Date().toISOString(),
    })
    .eq('id', equipmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get equipment with expiring warranties
 */
export async function getEquipmentWithExpiringWarranties(
  businessId: string,
  withinDays: number = 90
): Promise<(CustomerEquipment & { customer: { id: string; name: string; phone?: string; email?: string } })[]> {
  const supabase = await createServerClient();

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + withinDays);

  const { data, error } = await supabase
    .from('customer_equipment')
    .select(`
      *,
      customer:customers(id, name, phone, email)
    `)
    .eq('business_id', businessId)
    .eq('status', 'active')
    .not('warranty_expires', 'is', null)
    .lte('warranty_expires', futureDate.toISOString().split('T')[0])
    .gte('warranty_expires', new Date().toISOString().split('T')[0])
    .order('warranty_expires');

  if (error) throw error;
  return data;
}

/**
 * Link equipment to a job
 */
export async function linkEquipmentToJob(
  jobId: string,
  equipmentId: string,
  servicePerformed?: string,
  notes?: string
): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('job_equipment')
    .upsert({
      job_id: jobId,
      equipment_id: equipmentId,
      service_performed: servicePerformed,
      notes,
    });

  if (error) throw error;
}

/**
 * Get equipment linked to a job
 */
export async function getJobEquipment(jobId: string): Promise<CustomerEquipment[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('job_equipment')
    .select(`
      equipment:customer_equipment(*)
    `)
    .eq('job_id', jobId);

  if (error) throw error;
  return data.map(row => row.equipment);
}

/**
 * Update last service date for equipment
 */
export async function updateEquipmentLastService(equipmentId: string): Promise<void> {
  const supabase = await createServerClient();

  await supabase
    .from('customer_equipment')
    .update({
      last_service_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    })
    .eq('id', equipmentId);
}

/**
 * Get equipment types (including business-specific)
 */
export async function getEquipmentTypes(businessId: string): Promise<EquipmentType[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('equipment_types')
    .select('*')
    .or(`business_id.is.null,business_id.eq.${businessId}`)
    .order('name');

  if (error) throw error;
  return data;
}

/**
 * Create a custom equipment type for business
 */
export async function createEquipmentType(
  businessId: string,
  name: string,
  icon?: string,
  defaultSpecs?: Record<string, any>
): Promise<EquipmentType> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('equipment_types')
    .insert({
      business_id: businessId,
      name,
      icon,
      default_specs: defaultSpecs,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete equipment (soft delete - marks as removed)
 */
export async function deleteEquipment(equipmentId: string): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('customer_equipment')
    .update({
      status: 'removed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', equipmentId);

  if (error) throw error;
}

/**
 * Get equipment service history
 */
export async function getEquipmentServiceHistory(equipmentId: string): Promise<{
  job_id: string;
  job: { id: string; title: string; status: string; scheduled_date: string; completed_at?: string };
  service_performed?: string;
  notes?: string;
  created_at: string;
}[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('job_equipment')
    .select(`
      job_id,
      service_performed,
      notes,
      created_at,
      job:jobs(id, title, status, scheduled_date, completed_at)
    `)
    .eq('equipment_id', equipmentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
