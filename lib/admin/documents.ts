// =====================================================
// DOCUMENT STORAGE LIBRARY
// Centralized document management
// Version: 5.8
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import type { Document, DocumentType, DocumentCategory } from './types';

// =====================================================
// DOCUMENT TEMPLATES
// =====================================================

/**
 * Get all document templates
 */
export async function getDocumentTemplates(
  category?: DocumentCategory
): Promise<Document[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('documents')
    .select('*')
    .eq('is_template', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to get templates: ${error.message}`);

  return data || [];
}

// =====================================================
// CLIENT DOCUMENTS
// =====================================================

/**
 * Get all documents for a client
 */
export async function getClientDocuments(
  clientId: string,
  category?: DocumentCategory
): Promise<Document[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('documents')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_template', false)
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to get documents: ${error.message}`);

  return data || [];
}

/**
 * Upload a document for a client
 */
export async function uploadDocument(
  clientId: string,
  agentId: string,
  input: {
    name: string;
    description?: string;
    document_type: DocumentType;
    category?: DocumentCategory;
    file_path: string;
    file_type?: string;
    file_size_bytes?: number;
  }
): Promise<Document> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('documents')
    .insert({
      client_id: clientId,
      uploaded_by: agentId,
      is_template: false,
      ...input,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to upload document: ${error.message}`);

  return data;
}

/**
 * Delete a document
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from('documents').delete().eq('id', documentId);

  if (error) throw new Error(`Failed to delete document: ${error.message}`);
}

/**
 * Get document by ID
 */
export async function getDocument(documentId: string): Promise<Document | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get document: ${error.message}`);
  }

  return data;
}

// =====================================================
// TEMPLATE CATEGORIES
// =====================================================

export const TEMPLATE_CATEGORIES = {
  agreements: 'Service Agreements (v5.8)',
  feature_sheets: 'Feature Sheets (v5.8)',
  sales_tools: 'Sales Tools',
  intake_forms: 'Intake Forms',
};

export const DEFAULT_TEMPLATES = [
  // Service Agreements
  { name: 'LeadsCaptain_Service_Agreement_v5.8.docx', category: 'agreements', type: 'agreement' },
  { name: 'Blue_Service_Agreement_v5.8.docx', category: 'agreements', type: 'agreement' },
  { name: 'Web_Service_Agreement_v5.8.docx', category: 'agreements', type: 'agreement' },
  { name: 'Silver_Service_Agreement_v5.8.docx', category: 'agreements', type: 'agreement' },
  { name: 'Gold_Service_Agreement_v5.8.docx', category: 'agreements', type: 'agreement' },
  { name: 'LocalSEO_Service_Agreement_v5.8.docx', category: 'agreements', type: 'agreement' },

  // Feature Sheets
  { name: 'LeadsCaptain_FeatureSheet_v5.8.pdf', category: 'feature_sheets', type: 'feature_sheet' },
  { name: 'Blue_FeatureSheet_v5.8.pdf', category: 'feature_sheets', type: 'feature_sheet' },
  { name: 'Web_FeatureSheet_v5.8.pdf', category: 'feature_sheets', type: 'feature_sheet' },
  { name: 'Silver_FeatureSheet_v5.8.pdf', category: 'feature_sheets', type: 'feature_sheet' },
  { name: 'Gold_FeatureSheet_v5.8.pdf', category: 'feature_sheets', type: 'feature_sheet' },
  { name: 'LocalSEO_FeatureSheet_v5.8.pdf', category: 'feature_sheets', type: 'feature_sheet' },

  // Sales Tools
  { name: 'TradesCaptain_PriceSheet_v5.8.xlsx', category: 'sales_tools', type: 'other' },
  { name: 'Commission_QuickReference_v5.8.pdf', category: 'sales_tools', type: 'other' },
  { name: 'LeadsCaptain_Demo_Script.pdf', category: 'sales_tools', type: 'other' },
  { name: 'Objection_Handling_Guide.pdf', category: 'sales_tools', type: 'other' },

  // Intake Forms
  { name: 'Website_Intake_Form.pdf', category: 'intake_forms', type: 'intake_form' },
  { name: 'GBP_Access_Request_Form.pdf', category: 'intake_forms', type: 'intake_form' },
  { name: 'SEO_Questionnaire.pdf', category: 'intake_forms', type: 'intake_form' },
];
