// =====================================================
// JOB MATERIALS TRACKING
// Parts and materials cost management
// =====================================================

import { createClient } from '@/lib/supabase/server';

export interface JobMaterial {
  id: string;
  jobId: string;
  name: string;
  description: string | null;
  partNumber: string | null;
  quantity: number;
  unitCost: number;
  unitPrice: number | null;
  totalCost: number;
  totalPrice: number | null;
  source: string | null;
  supplier: string | null;
  inventoryItemId: string | null;
  createdAt: string;
}

/**
 * Add material to a job
 */
export async function addJobMaterial(
  jobId: string,
  data: {
    name: string;
    description?: string;
    partNumber?: string;
    quantity: number;
    unitCost: number;
    unitPrice?: number;
    source?: string;
    supplier?: string;
    inventoryItemId?: string;
  }
): Promise<{ success: boolean; materialId?: string; error?: string }> {
  const supabase = await createClient();

  const totalCost = data.quantity * data.unitCost;
  const totalPrice = data.unitPrice ? data.quantity * data.unitPrice : null;

  const { data: material, error } = await supabase
    .from('job_materials')
    .insert({
      job_id: jobId,
      name: data.name,
      description: data.description || null,
      part_number: data.partNumber || null,
      quantity: data.quantity,
      unit_cost: data.unitCost,
      unit_price: data.unitPrice || null,
      total_cost: totalCost,
      total_price: totalPrice,
      source: data.source || null,
      supplier: data.supplier || null,
      inventory_item_id: data.inventoryItemId || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Update job cost summary
  const { updateJobCostSummary } = await import('./summary');
  await updateJobCostSummary(jobId);

  return { success: true, materialId: material.id };
}

/**
 * Update a job material
 */
export async function updateJobMaterial(
  materialId: string,
  data: Partial<{
    name: string;
    description: string;
    partNumber: string;
    quantity: number;
    unitCost: number;
    unitPrice: number;
    source: string;
    supplier: string;
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Get current material for job_id and recalculation
  const { data: current } = await supabase
    .from('job_materials')
    .select('*')
    .eq('id', materialId)
    .single();

  if (!current) {
    return { success: false, error: 'Material not found' };
  }

  const updateData: Record<string, any> = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.partNumber !== undefined) updateData.part_number = data.partNumber;
  if (data.source !== undefined) updateData.source = data.source;
  if (data.supplier !== undefined) updateData.supplier = data.supplier;

  // Recalculate totals if quantity or costs changed
  const quantity = data.quantity !== undefined ? data.quantity : current.quantity;
  const unitCost = data.unitCost !== undefined ? data.unitCost : current.unit_cost;
  const unitPrice = data.unitPrice !== undefined ? data.unitPrice : current.unit_price;

  if (data.quantity !== undefined) updateData.quantity = data.quantity;
  if (data.unitCost !== undefined) updateData.unit_cost = data.unitCost;
  if (data.unitPrice !== undefined) updateData.unit_price = data.unitPrice;

  updateData.total_cost = quantity * unitCost;
  updateData.total_price = unitPrice ? quantity * unitPrice : null;

  const { error } = await supabase
    .from('job_materials')
    .update(updateData)
    .eq('id', materialId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Update job cost summary
  const { updateJobCostSummary } = await import('./summary');
  await updateJobCostSummary(current.job_id);

  return { success: true };
}

/**
 * Delete a job material
 */
export async function deleteJobMaterial(materialId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: material } = await supabase
    .from('job_materials')
    .select('job_id')
    .eq('id', materialId)
    .single();

  if (!material) {
    return { success: false, error: 'Material not found' };
  }

  const { error } = await supabase.from('job_materials').delete().eq('id', materialId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Update job cost summary
  const { updateJobCostSummary } = await import('./summary');
  await updateJobCostSummary(material.job_id);

  return { success: true };
}

/**
 * Get materials for a job
 */
export async function getJobMaterials(jobId: string): Promise<JobMaterial[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('job_materials')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false });

  return (data || []).map((m) => ({
    id: m.id,
    jobId: m.job_id,
    name: m.name,
    description: m.description,
    partNumber: m.part_number,
    quantity: m.quantity,
    unitCost: m.unit_cost,
    unitPrice: m.unit_price,
    totalCost: m.total_cost,
    totalPrice: m.total_price,
    source: m.source,
    supplier: m.supplier,
    inventoryItemId: m.inventory_item_id,
    createdAt: m.created_at,
  }));
}

/**
 * Get material totals for a job
 */
export async function getJobMaterialTotals(jobId: string): Promise<{
  totalCost: number;
  totalPrice: number;
  itemCount: number;
  margin: number;
}> {
  const materials = await getJobMaterials(jobId);

  const totalCost = materials.reduce((sum, m) => sum + m.totalCost, 0);
  const totalPrice = materials.reduce((sum, m) => sum + (m.totalPrice || 0), 0);
  const itemCount = materials.length;
  const margin = totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0;

  return { totalCost, totalPrice, itemCount, margin };
}

/**
 * Copy materials from a quote to a job
 */
export async function copyMaterialsFromQuote(
  jobId: string,
  quoteId: string
): Promise<{ success: boolean; copiedCount: number; error?: string }> {
  const supabase = await createClient();

  // Get quote line items (materials)
  const { data: quoteItems } = await supabase
    .from('quote_line_items')
    .select('*')
    .eq('quote_id', quoteId)
    .eq('type', 'material');

  if (!quoteItems || quoteItems.length === 0) {
    return { success: true, copiedCount: 0 };
  }

  const materials = quoteItems.map((item) => ({
    job_id: jobId,
    name: item.description,
    quantity: item.quantity,
    unit_cost: item.unit_price * 0.7, // Estimate cost at 70% of price
    unit_price: item.unit_price,
    total_cost: item.quantity * item.unit_price * 0.7,
    total_price: item.total,
    source: 'quote',
  }));

  const { error } = await supabase.from('job_materials').insert(materials);

  if (error) {
    return { success: false, copiedCount: 0, error: error.message };
  }

  // Update job cost summary
  const { updateJobCostSummary } = await import('./summary');
  await updateJobCostSummary(jobId);

  return { success: true, copiedCount: materials.length };
}

/**
 * Search for parts/materials
 */
export async function searchMaterials(
  businessId: string,
  query: string
): Promise<Array<{
  name: string;
  partNumber: string | null;
  lastUnitCost: number;
  lastUnitPrice: number | null;
  usageCount: number;
}>> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('job_materials')
    .select(`
      name,
      part_number,
      unit_cost,
      unit_price,
      job:jobs(business_id)
    `)
    .or(`name.ilike.%${query}%,part_number.ilike.%${query}%`)
    .limit(100);

  // Filter by business and aggregate
  const materialMap = new Map<string, {
    name: string;
    partNumber: string | null;
    lastUnitCost: number;
    lastUnitPrice: number | null;
    usageCount: number;
  }>();

  for (const item of data || []) {
    if ((item.job as any)?.business_id !== businessId) continue;

    const key = item.name.toLowerCase();
    const existing = materialMap.get(key);

    if (existing) {
      existing.usageCount++;
      existing.lastUnitCost = item.unit_cost;
      existing.lastUnitPrice = item.unit_price;
    } else {
      materialMap.set(key, {
        name: item.name,
        partNumber: item.part_number,
        lastUnitCost: item.unit_cost,
        lastUnitPrice: item.unit_price,
        usageCount: 1,
      });
    }
  }

  return Array.from(materialMap.values()).sort((a, b) => b.usageCount - a.usageCount);
}

/**
 * Get most used materials for a business
 */
export async function getFrequentMaterials(
  businessId: string,
  limit: number = 10
): Promise<Array<{
  name: string;
  partNumber: string | null;
  avgUnitCost: number;
  usageCount: number;
}>> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('job_materials')
    .select(`
      name,
      part_number,
      unit_cost,
      job:jobs(business_id)
    `)
    .limit(500);

  // Filter by business and aggregate
  const materialMap = new Map<string, {
    name: string;
    partNumber: string | null;
    totalCost: number;
    usageCount: number;
  }>();

  for (const item of data || []) {
    if ((item.job as any)?.business_id !== businessId) continue;

    const key = item.name.toLowerCase();
    const existing = materialMap.get(key);

    if (existing) {
      existing.usageCount++;
      existing.totalCost += item.unit_cost;
    } else {
      materialMap.set(key, {
        name: item.name,
        partNumber: item.part_number,
        totalCost: item.unit_cost,
        usageCount: 1,
      });
    }
  }

  return Array.from(materialMap.values())
    .map((m) => ({
      name: m.name,
      partNumber: m.partNumber,
      avgUnitCost: m.totalCost / m.usageCount,
      usageCount: m.usageCount,
    }))
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit);
}
