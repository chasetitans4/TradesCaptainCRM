// =====================================================
// PROMOTIONS & COUPONS
// Discount codes, promotional offers, and usage tracking
// =====================================================

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
const promotionsLogger = logger.child({ context: 'promotions' });

export interface Promotion {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  code: string;
  discountType: 'percentage' | 'fixed' | 'free_service';
  discountValue: number;
  maxUses: number | null;
  maxUsesPerCustomer: number;
  timesUsed: number;
  minimumOrderValue: number;
  applicableServices: string[] | null;
  newCustomersOnly: boolean;
  startsAt: string;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromotionInput {
  name: string;
  description?: string;
  code: string;
  discountType: 'percentage' | 'fixed' | 'free_service';
  discountValue: number;
  maxUses?: number;
  maxUsesPerCustomer?: number;
  minimumOrderValue?: number;
  applicableServices?: string[];
  newCustomersOnly?: boolean;
  startsAt?: string;
  expiresAt?: string;
}

export interface ValidationResult {
  valid: boolean;
  promotion?: Promotion;
  discount?: number;
  error?: string;
}

// Create promotion
export async function createPromotion(
  businessId: string,
  data: CreatePromotionInput
): Promise<{ success: boolean; promotion?: Promotion; error?: string }> {
  try {
    const supabase = await createClient();

    // Check for duplicate code
    const { data: existing } = await supabase
      .from('promotions')
      .select('id')
      .eq('business_id', businessId)
      .eq('code', data.code.toUpperCase())
      .single();

    if (existing) {
      return { success: false, error: 'A promotion with this code already exists' };
    }

    const { data: promo, error } = await supabase
      .from('promotions')
      .insert({
        business_id: businessId,
        name: data.name,
        description: data.description,
        code: data.code.toUpperCase(),
        discount_type: data.discountType,
        discount_value: data.discountValue,
        max_uses: data.maxUses,
        max_uses_per_customer: data.maxUsesPerCustomer || 1,
        minimum_order_value: data.minimumOrderValue || 0,
        applicable_services: data.applicableServices,
        new_customers_only: data.newCustomersOnly || false,
        starts_at: data.startsAt || new Date().toISOString(),
        expires_at: data.expiresAt,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, promotion: transformPromotion(promo) };
  } catch (error: any) {
    promotionsLogger.error({
      msg: 'Error creating promotion',
      businessId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return { success: false, error: error.message };
  }
}

// Update promotion
export async function updatePromotion(
  promotionId: string,
  data: Partial<CreatePromotionInput> & { isActive?: boolean }
): Promise<{ success: boolean; promotion?: Promotion; error?: string }> {
  try {
    const supabase = await createClient();

    const updateData: Record<string, any> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.discountType !== undefined) updateData.discount_type = data.discountType;
    if (data.discountValue !== undefined) updateData.discount_value = data.discountValue;
    if (data.maxUses !== undefined) updateData.max_uses = data.maxUses;
    if (data.maxUsesPerCustomer !== undefined)
      updateData.max_uses_per_customer = data.maxUsesPerCustomer;
    if (data.minimumOrderValue !== undefined)
      updateData.minimum_order_value = data.minimumOrderValue;
    if (data.applicableServices !== undefined)
      updateData.applicable_services = data.applicableServices;
    if (data.newCustomersOnly !== undefined) updateData.new_customers_only = data.newCustomersOnly;
    if (data.startsAt !== undefined) updateData.starts_at = data.startsAt;
    if (data.expiresAt !== undefined) updateData.expires_at = data.expiresAt;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const { data: promo, error } = await supabase
      .from('promotions')
      .update(updateData)
      .eq('id', promotionId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, promotion: transformPromotion(promo) };
  } catch (error: any) {
    promotionsLogger.error({
      msg: 'Error updating promotion',
      promotionId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return { success: false, error: error.message };
  }
}

// Delete promotion (soft delete)
export async function deletePromotion(
  promotionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('promotions')
      .update({ is_active: false })
      .eq('id', promotionId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    promotionsLogger.error({
      msg: 'Error deleting promotion',
      promotionId,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return { success: false, error: error.message };
  }
}

// Get all promotions for a business
export async function getPromotions(
  businessId: string,
  includeInactive: boolean = false
): Promise<Promotion[]> {
  const supabase = await createClient();

  let query = supabase
    .from('promotions')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data } = await query;

  return (data || []).map(transformPromotion);
}

// Get single promotion
export async function getPromotion(promotionId: string): Promise<Promotion | null> {
  const supabase = await createClient();

  const { data } = await supabase.from('promotions').select('*').eq('id', promotionId).single();

  return data ? transformPromotion(data) : null;
}

// Validate and calculate discount for promo code
export async function validatePromoCode(
  businessId: string,
  code: string,
  options?: {
    customerId?: string;
    orderValue?: number;
    serviceType?: string;
  }
): Promise<ValidationResult> {
  const supabase = await createClient();

  // Find promotion
  const { data: promo } = await supabase
    .from('promotions')
    .select('*')
    .eq('business_id', businessId)
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single();

  if (!promo) {
    return { valid: false, error: 'Invalid promo code' };
  }

  // Check if expired
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { valid: false, error: 'Promo code has expired' };
  }

  // Check if not started yet
  if (new Date(promo.starts_at) > new Date()) {
    return { valid: false, error: 'Promo code is not yet active' };
  }

  // Check max uses
  if (promo.max_uses && promo.times_used >= promo.max_uses) {
    return { valid: false, error: 'Promo code has reached maximum uses' };
  }

  // Check per-customer limit
  if (options?.customerId && promo.max_uses_per_customer) {
    const { count } = await supabase
      .from('promotion_uses')
      .select('id', { count: 'exact' })
      .eq('promotion_id', promo.id)
      .eq('customer_id', options.customerId);

    if ((count || 0) >= promo.max_uses_per_customer) {
      return { valid: false, error: 'You have already used this promo code' };
    }
  }

  // Check minimum order value
  if (options?.orderValue && promo.minimum_order_value > options.orderValue) {
    return {
      valid: false,
      error: `Minimum order value of $${promo.minimum_order_value} required`,
    };
  }

  // Check applicable services
  if (
    options?.serviceType &&
    promo.applicable_services?.length &&
    !promo.applicable_services.includes(options.serviceType)
  ) {
    return { valid: false, error: 'Promo code not valid for this service' };
  }

  // Check new customers only
  if (promo.new_customers_only && options?.customerId) {
    const { count } = await supabase
      .from('jobs')
      .select('id', { count: 'exact' })
      .eq('customer_id', options.customerId)
      .eq('status', 'completed');

    if ((count || 0) > 0) {
      return { valid: false, error: 'Promo code is for new customers only' };
    }
  }

  // Calculate discount
  let discount = 0;
  if (options?.orderValue) {
    if (promo.discount_type === 'percentage') {
      discount = options.orderValue * (promo.discount_value / 100);
    } else if (promo.discount_type === 'fixed') {
      discount = Math.min(promo.discount_value, options.orderValue);
    } else if (promo.discount_type === 'free_service') {
      discount = promo.discount_value; // Fixed amount for free service
    }
  }

  return {
    valid: true,
    promotion: transformPromotion(promo),
    discount,
  };
}

// Apply promotion to invoice/job
export async function applyPromotion(
  promotionId: string,
  customerId: string,
  discountAmount: number,
  options?: {
    invoiceId?: string;
    jobId?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Record usage
    await supabase.from('promotion_uses').insert({
      promotion_id: promotionId,
      customer_id: customerId,
      invoice_id: options?.invoiceId,
      job_id: options?.jobId,
      discount_amount: discountAmount,
    });

    // Increment times used
    await supabase.rpc('increment_promotion_uses', { p_promotion_id: promotionId });

    return { success: true };
  } catch (error: any) {
    promotionsLogger.error({
      msg: 'Error applying promotion',
      promotionId,
      customerId,
      discountAmount,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : { message: String(error) },
    });
    return { success: false, error: error.message };
  }
}

// Get promotion usage stats
export async function getPromotionStats(promotionId: string) {
  const supabase = await createClient();

  const { data: uses } = await supabase
    .from('promotion_uses')
    .select('discount_amount, created_at')
    .eq('promotion_id', promotionId);

  const { data: promo } = await supabase
    .from('promotions')
    .select('times_used, max_uses')
    .eq('id', promotionId)
    .single();

  return {
    timesUsed: promo?.times_used || 0,
    maxUses: promo?.max_uses,
    remainingUses: promo?.max_uses ? promo.max_uses - (promo.times_used || 0) : null,
    totalDiscountGiven: uses?.reduce((sum, u) => sum + (u.discount_amount || 0), 0) || 0,
    usageHistory: uses || [],
  };
}

// Get active promotions (for display on website, etc.)
export async function getActivePromotions(businessId: string): Promise<Promotion[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data } = await supabase
    .from('promotions')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .lte('starts_at', now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false });

  // Filter out maxed-out promotions
  return (data || [])
    .filter((p) => !p.max_uses || p.times_used < p.max_uses)
    .map(transformPromotion);
}

// Get promotion report
export async function getPromotionReport(
  businessId: string,
  startDate: string,
  endDate: string
) {
  const supabase = await createClient();

  const { data: uses } = await supabase
    .from('promotion_uses')
    .select(
      `
      discount_amount,
      created_at,
      promotion:promotions(id, name, code, discount_type, discount_value)
    `
    )
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // Filter by business
  const businessUses = (uses || []).filter(
    (u: any) => u.promotion && true // Would need to filter by business_id properly
  );

  const stats = {
    totalUses: businessUses.length,
    totalDiscountGiven: businessUses.reduce((sum, u) => sum + (u.discount_amount || 0), 0),
    byPromotion: {} as Record<string, { uses: number; discount: number }>,
  };

  businessUses.forEach((u: any) => {
    if (u.promotion) {
      const key = u.promotion.id;
      if (!stats.byPromotion[key]) {
        stats.byPromotion[key] = { uses: 0, discount: 0 };
      }
      stats.byPromotion[key].uses++;
      stats.byPromotion[key].discount += u.discount_amount || 0;
    }
  });

  return stats;
}

// Helper to transform database row to typed object
function transformPromotion(row: any): Promotion {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    code: row.code,
    discountType: row.discount_type,
    discountValue: parseFloat(row.discount_value),
    maxUses: row.max_uses,
    maxUsesPerCustomer: row.max_uses_per_customer,
    timesUsed: row.times_used,
    minimumOrderValue: parseFloat(row.minimum_order_value || 0),
    applicableServices: row.applicable_services,
    newCustomersOnly: row.new_customers_only,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
