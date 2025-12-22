// =====================================================
// DOCUMENT STORAGE LIBRARY
// Contracts, permits, licenses, and file management
// =====================================================

import { createClient as createServerClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { logActivity } from '@/lib/activity';

export type DocumentType =
  | 'contract'
  | 'permit'
  | 'license'
  | 'insurance'
  | 'warranty'
  | 'invoice'
  | 'quote'
  | 'photo'
  | 'manual'
  | 'other';

export type DocumentEntityType = 'customer' | 'job' | 'equipment' | 'business';

export interface Document {
  id: string;
  business_id: string;
  entity_type: DocumentEntityType;
  entity_id: string;
  name: string;
  file_path: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  document_type: DocumentType;
  description?: string;
  tags?: string[];
  expiration_date?: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

interface UploadDocumentParams {
  businessId: string;
  entityType: DocumentEntityType;
  entityId: string;
  file: File;
  documentType: DocumentType;
  name?: string;
  description?: string;
  tags?: string[];
  expirationDate?: Date;
  uploadedBy: string;
}

/**
 * Upload a document
 */
export async function uploadDocument(params: UploadDocumentParams): Promise<Document> {
  const supabase = await createServerClient();

  const fileId = uuidv4();
  const fileExt = params.file.name.split('.').pop() || 'bin';
  const filePath = `${params.businessId}/${params.entityType}/${params.entityId}/${fileId}.${fileExt}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, params.file);

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  // Create document record
  const { data, error } = await supabase
    .from('documents')
    .insert({
      business_id: params.businessId,
      entity_type: params.entityType,
      entity_id: params.entityId,
      name: params.name || params.file.name,
      file_path: filePath,
      file_url: urlData.publicUrl,
      file_size: params.file.size,
      mime_type: params.file.type,
      document_type: params.documentType,
      description: params.description,
      tags: params.tags,
      expiration_date: params.expirationDate?.toISOString(),
      uploaded_by: params.uploadedBy,
    })
    .select()
    .single();

  if (error) throw error;

  // Log activity if it's a customer document
  if (params.entityType === 'customer') {
    await logActivity({
      businessId: params.businessId,
      customerId: params.entityId,
      userId: params.uploadedBy,
      activityType: 'document_uploaded',
      title: `Document uploaded: ${params.name || params.file.name}`,
      metadata: { documentType: params.documentType, fileName: params.file.name },
    });
  }

  return data;
}

/**
 * Get documents for an entity
 */
export async function getDocuments(
  entityType: DocumentEntityType,
  entityId: string,
  documentType?: DocumentType
): Promise<Document[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from('documents')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (documentType) {
    query = query.eq('document_type', documentType);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

/**
 * Get a single document
 */
export async function getDocument(documentId: string): Promise<Document | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

/**
 * Delete a document
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const supabase = await createServerClient();

  // Get document first
  const doc = await getDocument(documentId);
  if (!doc) throw new Error('Document not found');

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('documents')
    .remove([doc.file_path]);

  if (storageError) throw storageError;

  // Delete record
  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId);

  if (error) throw error;
}

/**
 * Update document metadata
 */
export async function updateDocument(
  documentId: string,
  updates: {
    name?: string;
    description?: string;
    tags?: string[];
    documentType?: DocumentType;
    expirationDate?: Date | null;
  }
): Promise<Document> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('documents')
    .update({
      name: updates.name,
      description: updates.description,
      tags: updates.tags,
      document_type: updates.documentType,
      expiration_date: updates.expirationDate?.toISOString() || null,
    })
    .eq('id', documentId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Search documents
 */
export async function searchDocuments(
  businessId: string,
  query: string,
  filters?: {
    documentType?: DocumentType;
    entityType?: DocumentEntityType;
    tags?: string[];
  }
): Promise<Document[]> {
  const supabase = await createServerClient();

  let dbQuery = supabase
    .from('documents')
    .select('*')
    .eq('business_id', businessId)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('created_at', { ascending: false });

  if (filters?.documentType) {
    dbQuery = dbQuery.eq('document_type', filters.documentType);
  }

  if (filters?.entityType) {
    dbQuery = dbQuery.eq('entity_type', filters.entityType);
  }

  if (filters?.tags && filters.tags.length > 0) {
    dbQuery = dbQuery.contains('tags', filters.tags);
  }

  const { data, error } = await dbQuery;

  if (error) throw error;
  return data;
}

/**
 * Get documents expiring soon
 */
export async function getExpiringDocuments(
  businessId: string,
  withinDays: number = 30
): Promise<Document[]> {
  const supabase = await createServerClient();

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + withinDays);

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('business_id', businessId)
    .not('expiration_date', 'is', null)
    .lte('expiration_date', futureDate.toISOString())
    .gte('expiration_date', new Date().toISOString())
    .order('expiration_date', { ascending: true });

  if (error) throw error;
  return data;
}

/**
 * Get expired documents
 */
export async function getExpiredDocuments(businessId: string): Promise<Document[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('business_id', businessId)
    .not('expiration_date', 'is', null)
    .lt('expiration_date', new Date().toISOString())
    .order('expiration_date', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get document storage stats for a business
 */
export async function getStorageStats(businessId: string): Promise<{
  totalDocuments: number;
  totalSize: number;
  byType: Record<DocumentType, { count: number; size: number }>;
  byEntity: Record<DocumentEntityType, { count: number; size: number }>;
}> {
  const supabase = await createServerClient();

  const { data: documents, error } = await supabase
    .from('documents')
    .select('document_type, entity_type, file_size')
    .eq('business_id', businessId);

  if (error) throw error;

  const byType: Record<string, { count: number; size: number }> = {};
  const byEntity: Record<string, { count: number; size: number }> = {};
  let totalSize = 0;

  for (const doc of documents) {
    totalSize += doc.file_size;

    // By type
    if (!byType[doc.document_type]) {
      byType[doc.document_type] = { count: 0, size: 0 };
    }
    byType[doc.document_type].count++;
    byType[doc.document_type].size += doc.file_size;

    // By entity
    if (!byEntity[doc.entity_type]) {
      byEntity[doc.entity_type] = { count: 0, size: 0 };
    }
    byEntity[doc.entity_type].count++;
    byEntity[doc.entity_type].size += doc.file_size;
  }

  return {
    totalDocuments: documents.length,
    totalSize,
    byType: byType as Record<DocumentType, { count: number; size: number }>,
    byEntity: byEntity as Record<DocumentEntityType, { count: number; size: number }>,
  };
}

/**
 * Copy document to another entity
 */
export async function copyDocument(
  documentId: string,
  targetEntityType: DocumentEntityType,
  targetEntityId: string,
  copiedBy: string
): Promise<Document> {
  const supabase = await createServerClient();

  // Get original document
  const original = await getDocument(documentId);
  if (!original) throw new Error('Document not found');

  // Copy file in storage
  const newFileId = uuidv4();
  const fileExt = original.file_path.split('.').pop() || 'bin';
  const newPath = `${original.business_id}/${targetEntityType}/${targetEntityId}/${newFileId}.${fileExt}`;

  const { error: copyError } = await supabase.storage
    .from('documents')
    .copy(original.file_path, newPath);

  if (copyError) throw copyError;

  // Get new URL
  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(newPath);

  // Create new document record
  const { data, error } = await supabase
    .from('documents')
    .insert({
      business_id: original.business_id,
      entity_type: targetEntityType,
      entity_id: targetEntityId,
      name: original.name,
      file_path: newPath,
      file_url: urlData.publicUrl,
      file_size: original.file_size,
      mime_type: original.mime_type,
      document_type: original.document_type,
      description: original.description,
      tags: original.tags,
      expiration_date: original.expiration_date,
      uploaded_by: copiedBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get document type label
 */
export function getDocumentTypeLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    contract: 'Contract',
    permit: 'Permit',
    license: 'License',
    insurance: 'Insurance',
    warranty: 'Warranty',
    invoice: 'Invoice',
    quote: 'Quote',
    photo: 'Photo',
    manual: 'Manual',
    other: 'Other',
  };
  return labels[type] || type;
}

/**
 * Get allowed mime types for document type
 */
export function getAllowedMimeTypes(documentType?: DocumentType): string[] {
  const baseMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (documentType === 'photo') {
    return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  }

  return [
    ...baseMimeTypes,
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'text/plain',
  ];
}
