// =====================================================
// PORTAL DOCUMENT STORAGE
// Customer access to shared documents
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { syncLogger } from '@/lib/logger';
import type { CustomerDocument } from './types';

/**
 * Get all documents shared with a customer
 */
export async function getCustomerDocuments(
  customerId: string,
  businessId: string,
  category?: string
): Promise<CustomerDocument[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('customer_documents')
    .select('*')
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .eq('portal_visible', true)
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    syncLogger.error({
      msg: 'Failed to fetch customer documents',
      customerId,
      error: error.message,
    });
    return [];
  }

  return data || [];
}

/**
 * Get a single document (for download)
 */
export async function getDocumentDetails(
  documentId: string,
  customerId: string,
  businessId: string
): Promise<CustomerDocument | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('customer_documents')
    .select('*')
    .eq('id', documentId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .eq('portal_visible', true)
    .single();

  if (error) {
    return null;
  }

  // Track download
  await supabase
    .from('customer_documents')
    .update({
      download_count: (data.download_count || 0) + 1,
      last_downloaded_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  return data;
}

/**
 * Get documents by category
 */
export async function getDocumentsByCategory(
  customerId: string,
  businessId: string
): Promise<Record<string, CustomerDocument[]>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('customer_documents')
    .select('*')
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .eq('portal_visible', true)
    .order('created_at', { ascending: false });

  if (error) {
    return {};
  }

  // Group by category
  const grouped: Record<string, CustomerDocument[]> = {};
  for (const doc of data || []) {
    const category = doc.category || 'other';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(doc);
  }

  return grouped;
}

/**
 * Get equipment-related documents
 */
export async function getEquipmentDocuments(
  equipmentId: string,
  customerId: string,
  businessId: string
): Promise<CustomerDocument[]> {
  const supabase = createAdminClient();

  // Verify equipment belongs to customer
  const { data: equipment } = await supabase
    .from('customer_equipment')
    .select('id')
    .eq('id', equipmentId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!equipment) {
    return [];
  }

  const { data, error } = await supabase
    .from('customer_documents')
    .select('*')
    .eq('equipment_id', equipmentId)
    .eq('portal_visible', true)
    .order('created_at', { ascending: false });

  if (error) {
    return [];
  }

  return data || [];
}

/**
 * Get job-related documents
 */
export async function getJobDocuments(
  jobId: string,
  customerId: string,
  businessId: string
): Promise<CustomerDocument[]> {
  const supabase = createAdminClient();

  // Verify job belongs to customer
  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .single();

  if (!job) {
    return [];
  }

  const { data, error } = await supabase
    .from('customer_documents')
    .select('*')
    .eq('job_id', jobId)
    .eq('portal_visible', true)
    .order('created_at', { ascending: false });

  if (error) {
    return [];
  }

  return data || [];
}

/**
 * Get document categories available for a customer
 */
export async function getDocumentCategories(
  customerId: string,
  businessId: string
): Promise<{ category: string; count: number }[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('customer_documents')
    .select('category')
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .eq('portal_visible', true);

  if (error) {
    return [];
  }

  // Count by category
  const counts: Record<string, number> = {};
  for (const doc of data || []) {
    const category = doc.category || 'other';
    counts[category] = (counts[category] || 0) + 1;
  }

  return Object.entries(counts).map(([category, count]) => ({
    category,
    count,
  }));
}

/**
 * Generate a signed URL for document download
 */
export async function getDocumentDownloadUrl(
  documentId: string,
  customerId: string,
  businessId: string
): Promise<{ url: string; expiresIn: number } | null> {
  const supabase = createAdminClient();

  // Get document and verify access
  const { data: doc } = await supabase
    .from('customer_documents')
    .select('file_path, file_name')
    .eq('id', documentId)
    .eq('customer_id', customerId)
    .eq('business_id', businessId)
    .eq('portal_visible', true)
    .single();

  if (!doc || !doc.file_path) {
    return null;
  }

  // Generate signed URL (expires in 1 hour)
  const { data, error } = await supabase.storage
    .from('customer-documents')
    .createSignedUrl(doc.file_path, 3600);

  if (error) {
    syncLogger.error({
      msg: 'Failed to generate document download URL',
      documentId,
      error: error.message,
    });
    return null;
  }

  // Track download
  await supabase
    .from('customer_documents')
    .update({
      download_count: supabase.rpc('increment_download_count', { doc_id: documentId }),
      last_downloaded_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  return {
    url: data.signedUrl,
    expiresIn: 3600,
  };
}
