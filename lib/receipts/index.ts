// =====================================================
// RECEIPTS LIBRARY
// Upload, tag, and manage expense receipts
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
const receiptsLogger = logger.child({ context: 'receipts' });

export interface Receipt {
  id: string;
  business_id: string;
  user_id: string;
  job_id?: string;
  image_url: string;
  amount?: number;
  vendor?: string;
  category?: string;
  description?: string;
  receipt_date: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: {
    id: string;
    name: string;
  };
  job?: {
    id: string;
    title: string;
    customer_name?: string;
  };
}

export interface ReceiptFilters {
  businessId: string;
  userId?: string;
  jobId?: string;
  category?: string;
  status?: 'pending' | 'approved' | 'rejected';
  startDate?: Date;
  endDate?: Date;
}

export const RECEIPT_CATEGORIES = [
  { value: 'materials', label: 'Materials' },
  { value: 'tools', label: 'Tools & Equipment' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'meals', label: 'Meals' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'vehicle', label: 'Vehicle Expense' },
  { value: 'other', label: 'Other' },
];

/**
 * Create a new receipt
 */
export async function createReceipt(
  userId: string,
  businessId: string,
  data: {
    imageUrl: string;
    amount?: number;
    vendor?: string;
    category?: string;
    description?: string;
    jobId?: string;
    receiptDate?: Date;
  }
): Promise<Receipt> {
  const supabase = await createClient();

  const { data: receipt, error } = await supabase
    .from('receipts')
    .insert({
      user_id: userId,
      business_id: businessId,
      image_url: data.imageUrl,
      amount: data.amount || null,
      vendor: data.vendor || null,
      category: data.category || null,
      description: data.description || null,
      job_id: data.jobId || null,
      receipt_date: (data.receiptDate || new Date()).toISOString().split('T')[0],
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    receiptsLogger.error({ msg: 'Error creating receipt', error });
    throw new Error('Failed to create receipt');
  }

  return receipt;
}

/**
 * Get receipts with filters
 */
export async function getReceipts(filters: ReceiptFilters): Promise<Receipt[]> {
  const supabase = await createClient();

  let query = supabase
    .from('receipts')
    .select(`
      *,
      user:users(id, name),
      job:jobs(id, title, customer_name)
    `)
    .eq('business_id', filters.businessId)
    .order('receipt_date', { ascending: false });

  if (filters.userId) {
    query = query.eq('user_id', filters.userId);
  }

  if (filters.jobId) {
    query = query.eq('job_id', filters.jobId);
  }

  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.startDate) {
    query = query.gte('receipt_date', filters.startDate.toISOString().split('T')[0]);
  }

  if (filters.endDate) {
    query = query.lte('receipt_date', filters.endDate.toISOString().split('T')[0]);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching receipts:', error);
    throw new Error('Failed to fetch receipts');
  }

  return data || [];
}

/**
 * Get a single receipt by ID
 */
export async function getReceipt(receiptId: string): Promise<Receipt | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('receipts')
    .select(`
      *,
      user:users(id, name),
      job:jobs(id, title, customer_name)
    `)
    .eq('id', receiptId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error fetching receipt:', error);
    throw new Error('Failed to fetch receipt');
  }

  return data;
}

/**
 * Update a receipt
 */
export async function updateReceipt(
  receiptId: string,
  updates: {
    amount?: number;
    vendor?: string;
    category?: string;
    description?: string;
    jobId?: string;
    receiptDate?: Date;
  }
): Promise<Receipt> {
  const supabase = await createClient();

  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.amount !== undefined) updateData.amount = updates.amount;
  if (updates.vendor !== undefined) updateData.vendor = updates.vendor;
  if (updates.category !== undefined) updateData.category = updates.category;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.jobId !== undefined) updateData.job_id = updates.jobId || null;
  if (updates.receiptDate) {
    updateData.receipt_date = updates.receiptDate.toISOString().split('T')[0];
  }

  const { data, error } = await supabase
    .from('receipts')
    .update(updateData)
    .eq('id', receiptId)
    .select()
    .single();

  if (error) {
    console.error('Error updating receipt:', error);
    throw new Error('Failed to update receipt');
  }

  return data;
}

/**
 * Delete a receipt
 */
export async function deleteReceipt(receiptId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('receipts')
    .delete()
    .eq('id', receiptId);

  if (error) {
    console.error('Error deleting receipt:', error);
    throw new Error('Failed to delete receipt');
  }
}

/**
 * Approve or reject a receipt
 */
export async function reviewReceipt(
  receiptId: string,
  action: 'approved' | 'rejected',
  reviewerId: string
): Promise<Receipt> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('receipts')
    .update({
      status: action,
      approved_by: reviewerId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', receiptId)
    .select()
    .single();

  if (error) {
    console.error('Error reviewing receipt:', error);
    throw new Error('Failed to review receipt');
  }

  return data;
}

/**
 * Get receipt summary for a job
 */
export async function getJobReceiptsSummary(
  jobId: string
): Promise<{
  totalAmount: number;
  count: number;
  byCategory: Record<string, { count: number; amount: number }>;
}> {
  const supabase = await createClient();

  const { data: receipts } = await supabase
    .from('receipts')
    .select('amount, category')
    .eq('job_id', jobId)
    .eq('status', 'approved');

  const byCategory: Record<string, { count: number; amount: number }> = {};
  let totalAmount = 0;

  (receipts || []).forEach((r) => {
    const cat = r.category || 'other';
    if (!byCategory[cat]) {
      byCategory[cat] = { count: 0, amount: 0 };
    }
    byCategory[cat].count++;
    byCategory[cat].amount += r.amount || 0;
    totalAmount += r.amount || 0;
  });

  return {
    totalAmount,
    count: receipts?.length || 0,
    byCategory,
  };
}

/**
 * Get monthly expense summary
 */
export async function getMonthlyExpenseSummary(
  businessId: string,
  year: number,
  month: number
): Promise<{
  totalAmount: number;
  count: number;
  byCategory: Record<string, number>;
  byUser: Record<string, { name: string; amount: number }>;
}> {
  const supabase = await createClient();

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const { data: receipts } = await supabase
    .from('receipts')
    .select(`
      amount,
      category,
      user:users(id, name)
    `)
    .eq('business_id', businessId)
    .eq('status', 'approved')
    .gte('receipt_date', startDate.toISOString().split('T')[0])
    .lte('receipt_date', endDate.toISOString().split('T')[0]);

  const byCategory: Record<string, number> = {};
  const byUser: Record<string, { name: string; amount: number }> = {};
  let totalAmount = 0;

  (receipts || []).forEach((r: any) => {
    const cat = r.category || 'other';
    byCategory[cat] = (byCategory[cat] || 0) + (r.amount || 0);

    if (r.user) {
      if (!byUser[r.user.id]) {
        byUser[r.user.id] = { name: r.user.name, amount: 0 };
      }
      byUser[r.user.id].amount += r.amount || 0;
    }

    totalAmount += r.amount || 0;
  });

  return {
    totalAmount,
    count: receipts?.length || 0,
    byCategory,
    byUser,
  };
}

/**
 * Upload receipt image to storage
 */
export async function uploadReceiptImage(
  businessId: string,
  file: File
): Promise<string> {
  const supabase = await createClient();

  const fileExt = file.name.split('.').pop();
  const fileName = `${businessId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('receipts')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading receipt image:', error);
    throw new Error('Failed to upload image');
  }

  const { data: urlData } = supabase.storage
    .from('receipts')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}
