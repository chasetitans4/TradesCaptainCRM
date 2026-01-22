
import { createClient } from '@/lib/supabase/server';
import { OfferApprovalRequest, OFFERS } from './offers';

// =====================================================
// APPROVAL REQUEST FUNCTIONS (DB-BACKED)
// =====================================================

export async function createApprovalRequest(request: Omit<OfferApprovalRequest, 'id' | 'status' | 'requested_at'>): Promise<OfferApprovalRequest> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('offer_approvals')
    .insert({
      offer_id: request.offer_id,
      offer_code: request.offer_code,
      agent_id: request.agent_id,
      agent_name: request.agent_name,
      customer_name: request.customer_name,
      customer_email: request.customer_email,
      plan_id: request.plan_id,
      plan_name: request.plan_name,
      original_price: request.original_price,
      discounted_price: request.discounted_price,
      discount_amount: request.discount_amount,
      reason: request.reason,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create approval request: ${error.message}`);
  }

  return transformApprovalRequest(data);
}

export async function getApprovalRequest(id: string): Promise<OfferApprovalRequest | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('offer_approvals')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  return transformApprovalRequest(data);
}

export async function getPendingApprovalRequests(): Promise<OfferApprovalRequest[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('offer_approvals')
    .select('*')
    .eq('status', 'pending')
    .order('requested_at', { ascending: false });

  if (error) return [];

  return (data || []).map(transformApprovalRequest);
}

export async function approveRequest(
  id: string,
  reviewedBy: string, // This might be a UUID or string depending on caller
  notes?: string
): Promise<OfferApprovalRequest | null> {
  const supabase = await createClient();
  
  // If reviewedBy is not a UUID, we might have issues if column is UUID. 
  // The table definition says `reviewed_by UUID`.
  // But the code interface says `reviewed_by?: string`.
  // We'll assume reviewedBy passed here is a UUID (from auth.uid()).
  // If it's a name, we can't store it in UUID column.
  // For now, let's try to store it. If it fails, we might need to change table or input.
  
  const updateData: any = {
    status: 'approved',
    reviewed_at: new Date().toISOString(),
    review_notes: notes
  };

  // Only add reviewed_by if it looks like a UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(reviewedBy)) {
    updateData.reviewed_by = reviewedBy;
  }

  const { data, error } = await supabase
    .from('offer_approvals')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return null;

  return transformApprovalRequest(data);
}

export async function denyRequest(
  id: string,
  reviewedBy: string,
  notes?: string
): Promise<OfferApprovalRequest | null> {
  const supabase = await createClient();
  
  const updateData: any = {
    status: 'denied',
    reviewed_at: new Date().toISOString(),
    review_notes: notes
  };

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(reviewedBy)) {
    updateData.reviewed_by = reviewedBy;
  }

  const { data, error } = await supabase
    .from('offer_approvals')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return null;

  return transformApprovalRequest(data);
}

// =====================================================
// OFFER USAGE TRACKING (DB-BACKED)
// =====================================================

export async function incrementOfferUsage(offerCode: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc('increment_saas_offer_usage', { p_offer_code: offerCode });
}

export async function getOfferUsageStats(): Promise<{ code: string; name: string; uses: number; max_uses?: number }[]> {
  const supabase = await createClient();
  const { data: stats } = await supabase.from('saas_offer_stats').select('*');
  
  const statsMap = new Map<string, number>();
  if (stats) {
    stats.forEach((s: any) => statsMap.set(s.offer_code, s.use_count));
  }

  return OFFERS.map(o => ({
    code: o.code,
    name: o.name,
    uses: statsMap.get(o.code) || 0,
    max_uses: o.max_uses,
  }));
}

// Helper to transform DB row to Interface
function transformApprovalRequest(row: any): OfferApprovalRequest {
  return {
    id: row.id,
    offer_id: row.offer_id,
    offer_code: row.offer_code,
    agent_id: row.agent_id, // UUID
    agent_name: row.agent_name,
    customer_name: row.customer_name,
    customer_email: row.customer_email,
    plan_id: row.plan_id,
    plan_name: row.plan_name,
    original_price: parseFloat(row.original_price),
    discounted_price: parseFloat(row.discounted_price),
    discount_amount: parseFloat(row.discount_amount),
    reason: row.reason,
    status: row.status,
    requested_at: row.requested_at,
    reviewed_at: row.reviewed_at,
    reviewed_by: row.reviewed_by, // UUID
    review_notes: row.review_notes
  };
}
