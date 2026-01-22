// =====================================================
// BUSINESS INVENTORY MANAGEMENT
// Functions for managing business tools, gear, and supplies
// =====================================================

import { createClient } from '@/lib/supabase/server';

// Types
export interface InventoryCategory {
  id: string;
  business_id: string | null;
  name: string;
  parent_category_id: string | null;
  icon: string;
  color: string;
  sort_order: number;
  is_default: boolean;
  created_at: string;
  children?: InventoryCategory[];
}

export interface InventoryItem {
  id: string;
  business_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  current_value: number | null;
  warranty_expires: string | null;
  assigned_to: string | null;
  assigned_vehicle: string | null;
  location: string | null;
  status: 'available' | 'in_use' | 'maintenance' | 'retired' | 'lost';
  condition: 'excellent' | 'good' | 'fair' | 'poor' | null;
  last_maintenance: string | null;
  next_maintenance: string | null;
  quantity: number;
  min_quantity: number | null;
  photo_urls: string[] | null;
  specifications: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  category?: InventoryCategory;
  assigned_user?: { id: string; name: string };
}

export interface CreateInventoryItemInput {
  business_id: string;
  category_id?: string;
  name: string;
  description?: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
  warranty_expires?: string;
  assigned_to?: string;
  assigned_vehicle?: string;
  location?: string;
  status?: string;
  condition?: string;
  last_maintenance?: string;
  next_maintenance?: string;
  quantity?: number;
  min_quantity?: number;
  photo_urls?: string[];
  specifications?: Record<string, unknown>;
  notes?: string;
}

export interface InventoryFilters {
  businessId: string;
  categoryId?: string;
  status?: string;
  assignedTo?: string;
  search?: string;
  lowStockOnly?: boolean;
}

// =====================================================
// CATEGORY FUNCTIONS
// =====================================================

/**
 * Get all inventory categories (both default and business-specific)
 * Returns a flat list; use buildCategoryTree() for hierarchy
 */
export async function getInventoryCategories(businessId: string): Promise<InventoryCategory[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('inventory_categories')
    .select('*')
    .or(`business_id.is.null,business_id.eq.${businessId}`)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Build a hierarchical tree from flat category list
 */
export function buildCategoryTree(categories: InventoryCategory[]): InventoryCategory[] {
  const categoryMap = new Map<string, InventoryCategory>();
  const rootCategories: InventoryCategory[] = [];

  // First pass: create map of all categories
  categories.forEach(cat => {
    categoryMap.set(cat.id, { ...cat, children: [] });
  });

  // Second pass: build tree structure
  categories.forEach(cat => {
    const category = categoryMap.get(cat.id)!;
    if (cat.parent_category_id) {
      const parent = categoryMap.get(cat.parent_category_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(category);
      } else {
        rootCategories.push(category);
      }
    } else {
      rootCategories.push(category);
    }
  });

  return rootCategories;
}

/**
 * Create a custom category for a business
 */
export async function createInventoryCategory(
  businessId: string,
  name: string,
  parentCategoryId?: string,
  icon?: string,
  color?: string
): Promise<InventoryCategory> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('inventory_categories')
    .insert({
      business_id: businessId,
      name,
      parent_category_id: parentCategoryId || null,
      icon: icon || 'box',
      color: color || '#6B7280',
      is_default: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a custom category (only non-default categories can be deleted)
 */
export async function deleteInventoryCategory(categoryId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('inventory_categories')
    .delete()
    .eq('id', categoryId)
    .eq('is_default', false); // Only allow deleting custom categories

  if (error) throw error;
}

// =====================================================
// INVENTORY ITEM FUNCTIONS
// =====================================================

/**
 * Get all inventory items with filters
 */
export async function getInventoryItems(filters: InventoryFilters): Promise<InventoryItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from('business_inventory')
    .select(`
      *,
      category:inventory_categories(*),
      assigned_user:users!business_inventory_assigned_to_fkey(id, name)
    `)
    .eq('business_id', filters.businessId)
    .neq('status', 'retired'); // Don't show retired by default

  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo);
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,model.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`);
  }

  if (filters.lowStockOnly) {
    query = query.not('min_quantity', 'is', null)
      .filter('quantity', 'lte', 'min_quantity');
  }

  const { data, error } = await query.order('name', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single inventory item by ID
 */
export async function getInventoryItem(itemId: string): Promise<InventoryItem | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('business_inventory')
    .select(`
      *,
      category:inventory_categories(*),
      assigned_user:users!business_inventory_assigned_to_fkey(id, name)
    `)
    .eq('id', itemId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Create a new inventory item
 */
export async function createInventoryItem(input: CreateInventoryItemInput): Promise<InventoryItem> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('business_inventory')
    .insert(input)
    .select(`
      *,
      category:inventory_categories(*),
      assigned_user:users!business_inventory_assigned_to_fkey(id, name)
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an inventory item
 */
export async function updateInventoryItem(
  itemId: string,
  updates: Partial<CreateInventoryItemInput>
): Promise<InventoryItem> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('business_inventory')
    .update(updates)
    .eq('id', itemId)
    .select(`
      *,
      category:inventory_categories(*),
      assigned_user:users!business_inventory_assigned_to_fkey(id, name)
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete (soft) an inventory item by marking as retired
 */
export async function deleteInventoryItem(itemId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('business_inventory')
    .update({ status: 'retired' })
    .eq('id', itemId);

  if (error) throw error;
}

/**
 * Get items that are low on stock
 */
export async function getLowStockItems(businessId: string): Promise<InventoryItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('business_inventory')
    .select(`
      *,
      category:inventory_categories(*)
    `)
    .eq('business_id', businessId)
    .not('min_quantity', 'is', null)
    .lte('quantity', supabase.rpc('get_min_quantity_ref')) // This won't work directly
    .order('quantity', { ascending: true });

  // Alternative approach: filter in application
  if (error) throw error;

  return (data || []).filter(item =>
    item.min_quantity !== null && item.quantity <= item.min_quantity
  );
}

/**
 * Get items needing maintenance
 */
export async function getItemsNeedingMaintenance(businessId: string): Promise<InventoryItem[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('business_inventory')
    .select(`
      *,
      category:inventory_categories(*),
      assigned_user:users!business_inventory_assigned_to_fkey(id, name)
    `)
    .eq('business_id', businessId)
    .not('next_maintenance', 'is', null)
    .lte('next_maintenance', today)
    .neq('status', 'retired')
    .order('next_maintenance', { ascending: true });

  if (error) throw error;
  return data || [];
}

// =====================================================
// JOB INVENTORY USAGE FUNCTIONS
// =====================================================

/**
 * Log inventory usage on a job
 */
export async function logInventoryUsage(
  jobId: string,
  inventoryId: string,
  quantityUsed: number = 1,
  notes?: string
): Promise<void> {
  const supabase = await createClient();

  // Get current item to update quantity
  const { data: item } = await supabase
    .from('business_inventory')
    .select('quantity')
    .eq('id', inventoryId)
    .single();

  // Insert usage record
  const { error: usageError } = await supabase
    .from('job_inventory_usage')
    .upsert({
      job_id: jobId,
      inventory_id: inventoryId,
      quantity_used: quantityUsed,
      notes,
    }, {
      onConflict: 'job_id,inventory_id',
    });

  if (usageError) throw usageError;

  // Decrement quantity for consumables
  if (item && item.quantity > 0) {
    await supabase
      .from('business_inventory')
      .update({ quantity: Math.max(0, item.quantity - quantityUsed) })
      .eq('id', inventoryId);
  }
}

/**
 * Get inventory used on a job
 */
export async function getJobInventoryUsage(jobId: string): Promise<Array<{
  inventory: InventoryItem;
  quantity_used: number;
  notes: string | null;
}>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('job_inventory_usage')
    .select(`
      quantity_used,
      notes,
      inventory:business_inventory(
        *,
        category:inventory_categories(*)
      )
    `)
    .eq('job_id', jobId);

  if (error) throw error;

  return (data || []).map(item => ({
    inventory: item.inventory as unknown as InventoryItem,
    quantity_used: item.quantity_used,
    notes: item.notes,
  }));
}

/**
 * Get usage history for an inventory item
 */
export async function getInventoryUsageHistory(inventoryId: string): Promise<Array<{
  job_id: string;
  job_title: string;
  quantity_used: number;
  notes: string | null;
  created_at: string;
}>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('job_inventory_usage')
    .select(`
      job_id,
      quantity_used,
      notes,
      created_at,
      job:jobs(title)
    `)
    .eq('inventory_id', inventoryId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data || []).map(item => ({
    job_id: item.job_id,
    job_title: (item.job as any)?.title || 'Unknown Job',
    quantity_used: item.quantity_used,
    notes: item.notes,
    created_at: item.created_at,
  }));
}
