// =====================================================
// DIGITAL SIGNATURES LIBRARY
// Capture and manage digital signatures for jobs/quotes
// =====================================================

import { createClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export type SignatureEntityType = 'job' | 'quote' | 'invoice' | 'document';

interface CaptureSignatureParams {
  businessId: string;
  entityType: SignatureEntityType;
  entityId: string;
  signatureDataUrl: string; // Base64 PNG from canvas
  signerName: string;
  signerEmail?: string;
  signerPhone?: string;
  agreementText?: string;
  ipAddress?: string;
}

interface Signature {
  id: string;
  business_id: string;
  entity_type: SignatureEntityType;
  entity_id: string;
  signature_url: string;
  storage_path: string;
  signer_name: string;
  signer_email?: string;
  signer_phone?: string;
  ip_address?: string;
  user_agent?: string;
  signed_at: string;
  agreement_text?: string;
  created_at: string;
}

/**
 * Get default agreement text based on entity type
 */
export function getDefaultAgreementText(entityType: SignatureEntityType): string {
  switch (entityType) {
    case 'job':
      return 'I acknowledge that the work described has been completed to my satisfaction.';
    case 'quote':
      return 'I accept this quote and authorize the work to proceed as described.';
    case 'invoice':
      return 'I acknowledge receipt of services and agree to the charges listed.';
    case 'document':
      return 'I agree to the terms described above.';
    default:
      return 'I agree to the terms described above.';
  }
}

/**
 * Capture a signature (client-side)
 */
export async function captureSignature(params: CaptureSignatureParams): Promise<string> {
  const {
    businessId,
    entityType,
    entityId,
    signatureDataUrl,
    signerName,
    signerEmail,
    signerPhone,
    agreementText,
    ipAddress,
  } = params;

  const supabase = createClient();

  // Convert base64 to blob
  const response = await fetch(signatureDataUrl);
  const blob = await response.blob();

  // Upload to storage
  const fileName = `${uuidv4()}.png`;
  const storagePath = `${businessId}/signatures/${entityType}/${entityId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('signatures')
    .upload(storagePath, blob, {
      contentType: 'image/png',
    });

  if (uploadError) throw uploadError;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('signatures')
    .getPublicUrl(storagePath);

  // Save signature record
  const { data, error } = await supabase
    .from('signatures')
    .insert({
      business_id: businessId,
      entity_type: entityType,
      entity_id: entityId,
      signature_url: publicUrl,
      storage_path: storagePath,
      signer_name: signerName,
      signer_email: signerEmail,
      signer_phone: signerPhone,
      agreement_text: agreementText || getDefaultAgreementText(entityType),
      ip_address: ipAddress,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    })
    .select()
    .single();

  if (error) throw error;

  // Update the entity with signature reference
  if (entityType === 'job') {
    await supabase
      .from('jobs')
      .update({ signature_id: data.id })
      .eq('id', entityId);
  } else if (entityType === 'quote') {
    await supabase
      .from('quotes')
      .update({ signature_id: data.id })
      .eq('id', entityId);
  }

  return data.id;
}

/**
 * Get a signature by ID
 */
export async function getSignature(signatureId: string): Promise<Signature | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('id', signatureId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Get signature for an entity
 */
export async function getSignatureForEntity(
  entityType: SignatureEntityType,
  entityId: string
): Promise<Signature | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Get signature for an entity (server-side)
 */
export async function getSignatureForEntityServer(
  entityType: SignatureEntityType,
  entityId: string
): Promise<Signature | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Check if entity has been signed
 */
export async function hasSignature(
  entityType: SignatureEntityType,
  entityId: string
): Promise<boolean> {
  const signature = await getSignatureForEntity(entityType, entityId);
  return signature !== null;
}

/**
 * Delete a signature
 */
export async function deleteSignature(signatureId: string): Promise<void> {
  const supabase = createClient();

  // Get storage path first
  const { data: signature } = await supabase
    .from('signatures')
    .select('storage_path, entity_type, entity_id')
    .eq('id', signatureId)
    .single();

  if (signature?.storage_path) {
    // Delete from storage
    await supabase.storage
      .from('signatures')
      .remove([signature.storage_path]);
  }

  // Clear reference from entity
  if (signature?.entity_type === 'job') {
    await supabase
      .from('jobs')
      .update({ signature_id: null })
      .eq('id', signature.entity_id);
  } else if (signature?.entity_type === 'quote') {
    await supabase
      .from('quotes')
      .update({ signature_id: null })
      .eq('id', signature.entity_id);
  }

  // Delete from database
  const { error } = await supabase
    .from('signatures')
    .delete()
    .eq('id', signatureId);

  if (error) throw error;
}
