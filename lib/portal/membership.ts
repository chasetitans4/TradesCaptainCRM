// =====================================================
// PORTAL MEMBERSHIP & SERVICE AGREEMENTS
// Membership status, benefits, and renewals
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { syncLogger } from '@/lib/logger';
import type { ServiceAgreement, MembershipBenefitUsed } from './types';

/**
 * Get customer's active memberships/service agreements
 */
export async function getCustomerMemberships(
  customerId: string,
  businessId: string
): Promise<ServiceAgreement[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('service_agreements')
    .select(`
      *,
      agreement_equipment(
        equipment:customer_equipment(id, name, equipment_type, brand, model)
      ),
      membership_benefits_used(*)
    `)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .eq('portal_visible', true)
    .in('status', ['active', 'paused'])
    .order('created_at', { ascending: false });

  if (error) {
    syncLogger.error({
      msg: 'Failed to fetch customer memberships',
      customerId,
      error: error.message,
    });
    return [];
  }

  return (data || []).map((agreement: any) => ({
    ...agreement,
    equipment: agreement.agreement_equipment?.map((ae: any) => ae.equipment).filter(Boolean),
    benefits_used: agreement.membership_benefits_used,
    benefits: agreement.benefits || [],
  }));
}

/**
 * Get primary/active membership
 */
export async function getPrimaryMembership(
  customerId: string,
  businessId: string
): Promise<ServiceAgreement | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('service_agreements')
    .select(`
      *,
      agreement_equipment(
        equipment:customer_equipment(id, name, equipment_type, brand, model)
      ),
      membership_benefits_used(*)
    `)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .eq('portal_visible', true)
    .eq('status', 'active')
    .order('annual_price', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return null;
  }

  return {
    ...data,
    equipment: data.agreement_equipment?.map((ae: any) => ae.equipment).filter(Boolean),
    benefits_used: data.membership_benefits_used,
    benefits: data.benefits || [],
  };
}

/**
 * Get membership benefits usage history
 */
export async function getMembershipBenefitsUsed(
  agreementId: string,
  customerId: string,
  businessId: string
): Promise<MembershipBenefitUsed[]> {
  const supabase = createAdminClient();

  // Verify agreement belongs to customer
  const { data: agreement } = await supabase
    .from('service_agreements')
    .select('id')
    .eq('id', agreementId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!agreement) {
    return [];
  }

  const { data, error } = await supabase
    .from('membership_benefits_used')
    .select('*')
    .eq('service_agreement_id', agreementId)
    .order('used_at', { ascending: false });

  if (error) {
    return [];
  }

  return data || [];
}

/**
 * Calculate remaining services for membership
 */
export async function getRemainingServices(
  agreementId: string,
  customerId: string,
  businessId: string
): Promise<{
  servicesPerYear: number;
  servicesUsed: number;
  servicesRemaining: number;
  nextServiceDue?: string;
}> {
  const supabase = createAdminClient();

  const { data: agreement } = await supabase
    .from('service_agreements')
    .select('services_per_year, services_remaining, next_service_date, start_date')
    .eq('id', agreementId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!agreement) {
    return { servicesPerYear: 0, servicesUsed: 0, servicesRemaining: 0 };
  }

  const servicesPerYear = agreement.services_per_year || 0;
  const servicesRemaining = agreement.services_remaining ?? servicesPerYear;
  const servicesUsed = servicesPerYear - servicesRemaining;

  return {
    servicesPerYear,
    servicesUsed,
    servicesRemaining,
    nextServiceDue: agreement.next_service_date,
  };
}

/**
 * Get membership savings summary
 */
export async function getMembershipSavings(
  agreementId: string,
  customerId: string,
  businessId: string
): Promise<{
  totalSaved: number;
  discountsSaved: number;
  freeServicesSaved: number;
  diagnosticsSaved: number;
}> {
  const supabase = createAdminClient();

  // Verify agreement belongs to customer
  const { data: agreement } = await supabase
    .from('service_agreements')
    .select('id')
    .eq('id', agreementId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!agreement) {
    return { totalSaved: 0, discountsSaved: 0, freeServicesSaved: 0, diagnosticsSaved: 0 };
  }

  const { data: benefits } = await supabase
    .from('membership_benefits_used')
    .select('benefit_type, amount_saved')
    .eq('service_agreement_id', agreementId);

  if (!benefits || benefits.length === 0) {
    return { totalSaved: 0, discountsSaved: 0, freeServicesSaved: 0, diagnosticsSaved: 0 };
  }

  let discountsSaved = 0;
  let freeServicesSaved = 0;
  let diagnosticsSaved = 0;

  benefits.forEach((b) => {
    const amount = b.amount_saved || 0;
    switch (b.benefit_type) {
      case 'discount':
        discountsSaved += amount;
        break;
      case 'free_service':
        freeServicesSaved += amount;
        break;
      case 'free_diagnostic':
        diagnosticsSaved += amount;
        break;
    }
  });

  return {
    totalSaved: discountsSaved + freeServicesSaved + diagnosticsSaved,
    discountsSaved,
    freeServicesSaved,
    diagnosticsSaved,
  };
}

/**
 * Check if membership is due for renewal
 */
export async function checkMembershipRenewal(
  agreementId: string,
  customerId: string,
  businessId: string
): Promise<{
  needsRenewal: boolean;
  renewalDate?: string;
  daysUntilExpiry?: number;
  autoRenew: boolean;
}> {
  const supabase = createAdminClient();

  const { data: agreement } = await supabase
    .from('service_agreements')
    .select('end_date, auto_renew, renewal_reminder_days, status')
    .eq('id', agreementId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!agreement || !agreement.end_date) {
    return { needsRenewal: false, autoRenew: false };
  }

  const endDate = new Date(agreement.end_date);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const reminderDays = agreement.renewal_reminder_days || 30;

  return {
    needsRenewal: daysUntilExpiry <= reminderDays && agreement.status === 'active',
    renewalDate: agreement.end_date,
    daysUntilExpiry,
    autoRenew: agreement.auto_renew || false,
  };
}
