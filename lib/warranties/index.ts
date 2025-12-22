// =====================================================
// WARRANTY TRACKING LIBRARY
// Equipment and parts warranty management
// =====================================================

import { createClient as createServerClient } from '@/lib/supabase/server';
import { logActivity } from '@/lib/activity';
import { sendPushNotification } from '@/lib/notifications/push';

export type WarrantyStatus = 'active' | 'expired' | 'claimed' | 'voided';
export type WarrantyType = 'manufacturer' | 'extended' | 'labor' | 'parts';
export type ClaimStatus = 'pending' | 'approved' | 'denied' | 'completed';

export interface Warranty {
  id: string;
  business_id: string;
  customer_id: string;
  equipment_id?: string;
  job_id?: string;
  warranty_type: WarrantyType;
  provider?: string;
  coverage_details?: string;
  start_date: string;
  end_date: string;
  terms?: string;
  status: WarrantyStatus;
  created_at: string;
  updated_at: string;
}

export interface WarrantyClaim {
  id: string;
  warranty_id: string;
  claim_number?: string;
  issue_description: string;
  claim_date: string;
  status: ClaimStatus;
  resolution?: string;
  resolution_date?: string;
  amount_claimed?: number;
  amount_approved?: number;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface CreateWarrantyParams {
  businessId: string;
  customerId: string;
  equipmentId?: string;
  jobId?: string;
  warrantyType: WarrantyType;
  provider: string;
  coverageDetails: string;
  startDate: Date;
  endDate: Date;
  terms?: string;
  contactInfo?: string;
  documentationUrl?: string;
}

/**
 * Create a warranty record
 */
export async function createWarranty(params: CreateWarrantyParams): Promise<Warranty> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('warranties')
    .insert({
      business_id: params.businessId,
      customer_id: params.customerId,
      equipment_id: params.equipmentId,
      job_id: params.jobId,
      warranty_type: params.warrantyType,
      provider: params.provider,
      coverage_details: params.coverageDetails,
      start_date: params.startDate.toISOString(),
      end_date: params.endDate.toISOString(),
      terms: params.terms,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;

  // Log activity
  await logActivity({
    businessId: params.businessId,
    customerId: params.customerId,
    activityType: 'note',
    title: `Warranty registered: ${params.provider} (${params.warrantyType})`,
    metadata: {
      warrantyId: data.id,
      provider: params.provider,
      endDate: params.endDate.toISOString(),
    },
    createdBySystem: true,
  });

  return data;
}

/**
 * Get warranty by ID
 */
export async function getWarranty(warrantyId: string): Promise<(Warranty & {
  customer: { name: string };
  equipment?: { model_number: string; serial_number: string };
}) | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('warranties')
    .select(`
      *,
      customer:customers(name),
      equipment:customer_equipment(model_number, serial_number)
    `)
    .eq('id', warrantyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

/**
 * Get warranties for a customer
 */
export async function getCustomerWarranties(
  customerId: string,
  includeExpired: boolean = false
): Promise<Warranty[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from('warranties')
    .select('*')
    .eq('customer_id', customerId)
    .order('end_date', { ascending: true });

  if (!includeExpired) {
    query = query.neq('status', 'expired');
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

/**
 * Get warranties expiring soon
 */
export async function getExpiringWarranties(
  businessId: string,
  withinDays: number = 30
): Promise<(Warranty & { customer: { name: string; email?: string; phone?: string } })[]> {
  const supabase = await createServerClient();

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + withinDays);

  const { data, error } = await supabase
    .from('warranties')
    .select(`
      *,
      customer:customers(name, email, phone)
    `)
    .eq('business_id', businessId)
    .eq('status', 'active')
    .lte('end_date', futureDate.toISOString())
    .gte('end_date', new Date().toISOString())
    .order('end_date', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Update warranty status
 */
export async function updateWarrantyStatus(
  warrantyId: string,
  status: WarrantyStatus
): Promise<Warranty> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('warranties')
    .update({ status })
    .eq('id', warrantyId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a warranty claim
 */
export async function createWarrantyClaim(
  warrantyId: string,
  issueDescription: string,
  createdBy: string,
  amountClaimed?: number
): Promise<WarrantyClaim> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('warranty_claims')
    .insert({
      warranty_id: warrantyId,
      issue_description: issueDescription,
      claim_date: new Date().toISOString(),
      status: 'pending',
      amount_claimed: amountClaimed,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) throw error;

  // Update warranty status
  await updateWarrantyStatus(warrantyId, 'claimed');

  // Get warranty for logging
  const warranty = await getWarranty(warrantyId);
  if (warranty) {
    await logActivity({
      businessId: warranty.business_id,
      customerId: warranty.customer_id,
      activityType: 'note',
      title: `Warranty claim submitted: ${warranty.provider}`,
      metadata: {
        warrantyId,
        claimId: data.id,
        issueDescription,
      },
      createdBySystem: true,
    });
  }

  return data;
}

/**
 * Update warranty claim
 */
export async function updateWarrantyClaim(
  claimId: string,
  updates: {
    status?: ClaimStatus;
    resolution?: string;
    amountApproved?: number;
    notes?: string;
    claimNumber?: string;
  }
): Promise<WarrantyClaim> {
  const supabase = await createServerClient();

  const updateData: any = {
    status: updates.status,
    resolution: updates.resolution,
    amount_approved: updates.amountApproved,
    notes: updates.notes,
    claim_number: updates.claimNumber,
  };

  if (updates.status === 'completed' || updates.status === 'denied') {
    updateData.resolution_date = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('warranty_claims')
    .update(updateData)
    .eq('id', claimId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get claims for a warranty
 */
export async function getWarrantyClaims(warrantyId: string): Promise<WarrantyClaim[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('warranty_claims')
    .select('*')
    .eq('warranty_id', warrantyId)
    .order('claim_date', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get all pending claims for a business
 */
export async function getPendingClaims(businessId: string): Promise<(WarrantyClaim & {
  warranty: Warranty & { customer: { name: string } };
})[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('warranty_claims')
    .select(`
      *,
      warranty:warranties!inner(
        *,
        customer:customers(name)
      )
    `)
    .eq('warranty.business_id', businessId)
    .in('status', ['pending', 'approved'])
    .order('claim_date', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Process expired warranties (cron job)
 */
export async function processExpiredWarranties(): Promise<{ updated: number; errors: string[] }> {
  const supabase = await createServerClient();

  const result = { updated: 0, errors: [] as string[] };

  const { data: expiredWarranties, error } = await supabase
    .from('warranties')
    .select('id')
    .eq('status', 'active')
    .lt('end_date', new Date().toISOString());

  if (error) {
    result.errors.push(`Failed to fetch expired warranties: ${error.message}`);
    return result;
  }

  for (const warranty of expiredWarranties || []) {
    try {
      await updateWarrantyStatus(warranty.id, 'expired');
      result.updated++;
    } catch (err: any) {
      result.errors.push(`Failed to update warranty ${warranty.id}: ${err.message}`);
    }
  }

  return result;
}

/**
 * Send warranty expiration notifications
 */
export async function sendExpirationNotifications(
  businessId: string,
  notifyDaysBefore: number = 30
): Promise<{ notified: number; errors: string[] }> {
  const result = { notified: 0, errors: [] as string[] };

  const expiringWarranties = await getExpiringWarranties(businessId, notifyDaysBefore);
  const supabase = await createServerClient();
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('business_id', businessId)
    .eq('status', 'active')
    .in('role', ['owner', 'admin', 'dispatcher']);

  for (const warranty of expiringWarranties) {
    try {
      // Calculate days until expiration
      const daysUntil = Math.ceil(
        (new Date(warranty.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );

      for (const user of users || []) {
        await sendPushNotification({
          userId: user.id,
          businessId,
          title: 'Warranty Expiring Soon',
          body: `${warranty.customer.name}'s ${warranty.provider} warranty expires in ${daysUntil} days`,
          url: `/warranties/${warranty.id}`,
          metadata: { warrantyId: warranty.id },
        });
      }

      result.notified++;
    } catch (err: any) {
      result.errors.push(`Failed to notify for warranty ${warranty.id}: ${err.message}`);
    }
  }

  return result;
}

/**
 * Get warranty statistics
 */
export async function getWarrantyStats(businessId: string): Promise<{
  totalActive: number;
  totalExpired: number;
  expiringThisMonth: number;
  totalClaims: number;
  pendingClaims: number;
  claimsByStatus: Record<ClaimStatus, number>;
  totalClaimedAmount: number;
  totalApprovedAmount: number;
}> {
  const supabase = await createServerClient();

  // Get warranties
  const { data: warranties, error: warError } = await supabase
    .from('warranties')
    .select('status, end_date')
    .eq('business_id', businessId);

  if (warError) throw warError;

  // Get claims
  const { data: claims, error: claimError } = await supabase
    .from('warranty_claims')
    .select(`
      status,
      amount_claimed,
      amount_approved,
      warranty:warranties!inner(business_id)
    `)
    .eq('warranty.business_id', businessId);

  if (claimError) throw claimError;

  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const claimsByStatus: Record<string, number> = {
    pending: 0,
    approved: 0,
    denied: 0,
    completed: 0,
  };

  let totalClaimedAmount = 0;
  let totalApprovedAmount = 0;

  for (const claim of claims || []) {
    claimsByStatus[claim.status] = (claimsByStatus[claim.status] || 0) + 1;
    totalClaimedAmount += claim.amount_claimed || 0;
    totalApprovedAmount += claim.amount_approved || 0;
  }

  return {
    totalActive: warranties?.filter(w => w.status === 'active').length || 0,
    totalExpired: warranties?.filter(w => w.status === 'expired').length || 0,
    expiringThisMonth: warranties?.filter(w =>
      w.status === 'active' &&
      new Date(w.end_date) <= nextMonth &&
      new Date(w.end_date) >= new Date()
    ).length || 0,
    totalClaims: claims?.length || 0,
    pendingClaims: claimsByStatus.pending,
    claimsByStatus: claimsByStatus as Record<ClaimStatus, number>,
    totalClaimedAmount,
    totalApprovedAmount,
  };
}

/**
 * Get warranty type label
 */
export function getWarrantyTypeLabel(type: WarrantyType): string {
  const labels: Record<WarrantyType, string> = {
    manufacturer: 'Manufacturer Warranty',
    extended: 'Extended Warranty',
    labor: 'Labor Warranty',
    parts: 'Parts Warranty',
  };
  return labels[type] || type;
}

/**
 * Calculate warranty coverage remaining
 */
export function getWarrantyCoverage(warranty: Warranty): {
  isActive: boolean;
  daysRemaining: number;
  percentageRemaining: number;
} {
  const now = new Date();
  const endDate = new Date(warranty.end_date);
  const startDate = new Date(warranty.start_date);

  const isActive = warranty.status === 'active' && endDate > now;
  const daysRemaining = isActive
    ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const percentageRemaining = isActive
    ? Math.round((daysRemaining / totalDays) * 100)
    : 0;

  return { isActive, daysRemaining, percentageRemaining };
}
