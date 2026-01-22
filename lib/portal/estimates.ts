// =====================================================
// PORTAL ESTIMATE APPROVAL WORKFLOW
// Quote viewing, approval, and communication
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { syncLogger } from '@/lib/logger';
import type { Quote, QuoteComment, QuoteApprovalStatus } from './types';

/**
 * Get pending estimates for a customer
 */
export async function getPendingEstimates(
  customerId: string,
  businessId: string
): Promise<Quote[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      quote_items(*),
      quote_comments(*)
    `)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .in('status', ['sent', 'viewed'])
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    syncLogger.error({
      msg: 'Failed to fetch pending estimates',
      customerId,
      error: error.message,
    });
    return [];
  }

  return (data || []).map((quote: any) => ({
    ...quote,
    items: quote.quote_items,
    comments: quote.quote_comments,
  }));
}

/**
 * Get all estimates for a customer (including approved/declined)
 */
export async function getCustomerEstimates(
  customerId: string,
  businessId: string,
  limit: number = 20
): Promise<Quote[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      quote_items(*),
      quote_comments(*)
    `)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .neq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    syncLogger.error({
      msg: 'Failed to fetch customer estimates',
      customerId,
      error: error.message,
    });
    return [];
  }

  return (data || []).map((quote: any) => ({
    ...quote,
    items: quote.quote_items,
    comments: quote.quote_comments,
  }));
}

/**
 * Get single estimate details
 */
export async function getEstimateDetails(
  quoteId: string,
  customerId: string,
  businessId: string
): Promise<Quote | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('quotes')
    .select(`
      *,
      quote_items(*),
      quote_comments(*)
    `)
    .eq('id', quoteId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (error) {
    return null;
  }

  // Mark as viewed if first time
  if (data.status === 'sent') {
    await supabase
      .from('quotes')
      .update({ status: 'viewed' })
      .eq('id', quoteId);
  }

  return {
    ...data,
    items: data.quote_items,
    comments: data.quote_comments,
  };
}

/**
 * Approve an estimate
 */
export async function approveEstimate(
  quoteId: string,
  customerId: string,
  businessId: string,
  approverName: string,
  approverEmail: string,
  signatureUrl?: string,
  ipAddress?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Verify quote belongs to customer and is pending
  const { data: quote } = await supabase
    .from('quotes')
    .select('id, status, approval_status, valid_until')
    .eq('id', quoteId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!quote) {
    return { success: false, error: 'Estimate not found' };
  }

  if (quote.approval_status !== 'pending') {
    return { success: false, error: 'Estimate has already been processed' };
  }

  // Check if expired
  if (quote.valid_until && new Date(quote.valid_until) < new Date()) {
    return { success: false, error: 'Estimate has expired. Please request a new one.' };
  }

  const { error } = await supabase
    .from('quotes')
    .update({
      status: 'accepted',
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by_name: approverName,
      approved_by_email: approverEmail,
      approval_signature_url: signatureUrl,
      approval_ip_address: ipAddress,
    })
    .eq('id', quoteId);

  if (error) {
    syncLogger.error({
      msg: 'Failed to approve estimate',
      quoteId,
      error: error.message,
    });
    return { success: false, error: 'Failed to approve estimate' };
  }

  syncLogger.info({
    msg: 'Estimate approved via portal',
    quoteId,
    customerId,
    approverName,
  });

  return { success: true };
}

/**
 * Decline an estimate
 */
export async function declineEstimate(
  quoteId: string,
  customerId: string,
  businessId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Verify quote belongs to customer and is pending
  const { data: quote } = await supabase
    .from('quotes')
    .select('id, approval_status')
    .eq('id', quoteId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!quote) {
    return { success: false, error: 'Estimate not found' };
  }

  if (quote.approval_status !== 'pending') {
    return { success: false, error: 'Estimate has already been processed' };
  }

  const { error } = await supabase
    .from('quotes')
    .update({
      status: 'declined',
      approval_status: 'declined',
      decline_reason: reason,
    })
    .eq('id', quoteId);

  if (error) {
    return { success: false, error: 'Failed to decline estimate' };
  }

  syncLogger.info({
    msg: 'Estimate declined via portal',
    quoteId,
    customerId,
    reason,
  });

  return { success: true };
}

/**
 * Request changes to an estimate
 */
export async function requestEstimateChanges(
  quoteId: string,
  customerId: string,
  businessId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Verify quote belongs to customer and is pending
  const { data: quote } = await supabase
    .from('quotes')
    .select('id, approval_status')
    .eq('id', quoteId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!quote) {
    return { success: false, error: 'Estimate not found' };
  }

  if (quote.approval_status !== 'pending') {
    return { success: false, error: 'Estimate has already been processed' };
  }

  const { error } = await supabase
    .from('quotes')
    .update({
      approval_status: 'changes_requested',
      change_request_notes: notes,
    })
    .eq('id', quoteId);

  if (error) {
    return { success: false, error: 'Failed to submit change request' };
  }

  // Also add as a comment
  await addEstimateComment(quoteId, customerId, businessId, notes, 'Changes requested');

  return { success: true };
}

/**
 * Add a comment/question to an estimate
 */
export async function addEstimateComment(
  quoteId: string,
  customerId: string,
  businessId: string,
  content: string,
  authorName?: string
): Promise<{ success: boolean; commentId?: string; error?: string }> {
  const supabase = createAdminClient();

  // Verify quote belongs to customer
  const { data: quote } = await supabase
    .from('quotes')
    .select('id')
    .eq('id', quoteId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!quote) {
    return { success: false, error: 'Estimate not found' };
  }

  // Get customer name if not provided
  let name = authorName;
  if (!name) {
    const { data: customer } = await supabase
      .from('customers')
      .select('name')
      .eq('id', customerId)
      .single();
    name = customer?.name;
  }

  const { data, error } = await supabase
    .from('quote_comments')
    .insert({
      quote_id: quoteId,
      author_type: 'customer',
      author_name: name,
      content,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: 'Failed to add comment' };
  }

  return { success: true, commentId: data.id };
}

/**
 * Get comments for an estimate
 */
export async function getEstimateComments(
  quoteId: string,
  customerId: string,
  businessId: string
): Promise<QuoteComment[]> {
  const supabase = createAdminClient();

  // Verify quote belongs to customer
  const { data: quote } = await supabase
    .from('quotes')
    .select('id')
    .eq('id', quoteId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!quote) {
    return [];
  }

  const { data, error } = await supabase
    .from('quote_comments')
    .select('*')
    .eq('quote_id', quoteId)
    .order('created_at', { ascending: true });

  if (error) {
    return [];
  }

  return data || [];
}

/**
 * Mark business comments as read
 */
export async function markCommentsAsRead(
  quoteId: string,
  customerId: string,
  businessId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Verify quote belongs to customer
  const { data: quote } = await supabase
    .from('quotes')
    .select('id')
    .eq('id', quoteId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!quote) return;

  await supabase
    .from('quote_comments')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('quote_id', quoteId)
    .eq('author_type', 'business')
    .eq('is_read', false);
}
