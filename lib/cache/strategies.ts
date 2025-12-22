// =====================================================
// CACHING STRATEGIES
// Pre-built caching functions for common data
// =====================================================

import { userCache, businessCache, dashboardCache, aiCache } from './index';
import { createClient as createServerClient } from '@/lib/supabase/server';

// =====================================================
// USER CACHING
// =====================================================

/**
 * Get cached user profile (15 minutes TTL)
 */
export async function getCachedUserProfile(userId: string) {
  return userCache.getOrSet(
    `profile:${userId}`,
    async () => {
      const supabase = await createServerClient();
      const { data } = await supabase
        .from('profiles')
        .select('*, business:businesses(*)')
        .eq('id', userId)
        .single();
      return data;
    },
    900 // 15 minutes
  );
}

/**
 * Invalidate user cache when profile is updated
 */
export async function invalidateUserCache(userId: string) {
  await userCache.delete(`profile:${userId}`);
}

// =====================================================
// BUSINESS CACHING
// =====================================================

/**
 * Get cached business settings (5 minutes TTL)
 */
export async function getCachedBusinessSettings(businessId: string) {
  return businessCache.getOrSet(
    `settings:${businessId}`,
    async () => {
      const supabase = await createServerClient();
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .single();
      return data;
    },
    300 // 5 minutes
  );
}

/**
 * Invalidate all business-related cache
 */
export async function invalidateBusinessCache(businessId: string) {
  await businessCache.deletePattern(`*:${businessId}`);
  await dashboardCache.delete(`metrics:${businessId}`);
}

// =====================================================
// DASHBOARD CACHING
// =====================================================

/**
 * Get cached dashboard metrics (1 minute TTL)
 */
export async function getCachedDashboardMetrics(businessId: string) {
  return dashboardCache.getOrSet(
    `metrics:${businessId}`,
    async () => {
      const supabase = await createServerClient();

      // Run multiple queries in parallel
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const [todaysJobs, newLeads, revenueData, unreadMessages] = await Promise.all([
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .gte('scheduled_date', today)
          .lt('scheduled_date', `${today}T23:59:59`),

        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .eq('status', 'new'),

        supabase
          .from('invoices')
          .select('total')
          .eq('business_id', businessId)
          .eq('status', 'paid')
          .gte('paid_at', thirtyDaysAgo),

        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .eq('direction', 'inbound')
          .is('read_at', null),
      ]);

      const monthlyRevenue = revenueData.data?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;

      return {
        todaysJobs: todaysJobs.count || 0,
        newLeads: newLeads.count || 0,
        monthlyRevenue,
        unreadMessages: unreadMessages.count || 0,
        calculatedAt: new Date().toISOString(),
      };
    },
    60 // 1 minute
  );
}

/**
 * Get cached job stats (5 minutes TTL)
 */
export async function getCachedJobStats(businessId: string) {
  return dashboardCache.getOrSet(
    `job_stats:${businessId}`,
    async () => {
      const supabase = await createServerClient();

      const { data: jobs } = await supabase
        .from('jobs')
        .select('status')
        .eq('business_id', businessId);

      const stats = {
        total: jobs?.length || 0,
        scheduled: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
      };

      for (const job of jobs || []) {
        if (job.status in stats) {
          stats[job.status as keyof typeof stats]++;
        }
      }

      return stats;
    },
    300 // 5 minutes
  );
}

// =====================================================
// CUSTOM FIELDS CACHING
// =====================================================

/**
 * Get cached custom field definitions (10 minutes TTL)
 */
export async function getCachedCustomFields(businessId: string, entityType: string) {
  return businessCache.getOrSet(
    `custom_fields:${businessId}:${entityType}`,
    async () => {
      const supabase = await createServerClient();
      const { data } = await supabase
        .from('custom_field_definitions')
        .select('*')
        .eq('business_id', businessId)
        .eq('entity_type', entityType)
        .eq('is_active', true)
        .order('display_order');
      return data || [];
    },
    600 // 10 minutes
  );
}

/**
 * Invalidate custom fields cache
 */
export async function invalidateCustomFieldsCache(businessId: string, entityType?: string) {
  if (entityType) {
    await businessCache.delete(`custom_fields:${businessId}:${entityType}`);
  } else {
    await businessCache.deletePattern(`custom_fields:${businessId}:*`);
  }
}

// =====================================================
// CHECKLIST TEMPLATES CACHING
// =====================================================

/**
 * Get cached checklist templates (10 minutes TTL)
 */
export async function getCachedChecklistTemplates(businessId: string) {
  return businessCache.getOrSet(
    `checklist_templates:${businessId}`,
    async () => {
      const supabase = await createServerClient();
      const { data } = await supabase
        .from('checklist_templates')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    600 // 10 minutes
  );
}

// =====================================================
// EQUIPMENT TYPES CACHING
// =====================================================

/**
 * Get cached equipment types (30 minutes TTL - rarely changes)
 */
export async function getCachedEquipmentTypes(businessId: string) {
  return businessCache.getOrSet(
    `equipment_types:${businessId}`,
    async () => {
      const supabase = await createServerClient();
      const { data } = await supabase
        .from('equipment_types')
        .select('*')
        .eq('business_id', businessId)
        .order('name');
      return data || [];
    },
    1800 // 30 minutes
  );
}

// =====================================================
// AI RESPONSE CACHING
// =====================================================

/**
 * Get cached AI response (1 hour TTL)
 */
export async function getCachedAIResponse(promptHash: string): Promise<string | null> {
  return aiCache.get<string>(`response:${promptHash}`);
}

/**
 * Cache an AI response
 */
export async function cacheAIResponse(promptHash: string, response: string) {
  await aiCache.set(`response:${promptHash}`, response, 3600); // 1 hour
}

/**
 * Get cached AI summary for a customer (30 minutes TTL)
 */
export async function getCachedCustomerSummary(customerId: string) {
  return aiCache.getOrSet(
    `customer_summary:${customerId}`,
    async () => {
      // This would typically call an AI function
      // Returning null to indicate no cached summary
      return null;
    },
    1800 // 30 minutes
  );
}

// =====================================================
// NOTIFICATION PREFERENCES CACHING
// =====================================================

/**
 * Get cached notification preferences (15 minutes TTL)
 */
export async function getCachedNotificationPreferences(userId: string) {
  return userCache.getOrSet(
    `notification_prefs:${userId}`,
    async () => {
      const supabase = await createServerClient();
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      return data;
    },
    900 // 15 minutes
  );
}

/**
 * Invalidate notification preferences cache
 */
export async function invalidateNotificationPrefsCache(userId: string) {
  await userCache.delete(`notification_prefs:${userId}`);
}
