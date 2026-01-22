// =====================================================
// BUSINESS AUDIT LOGGER
// Track user actions with timestamps for compliance
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const auditLogger = logger.child({ context: 'audit' });

export type AuditAction =
  // Customer actions
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  | 'customer.viewed'
  // Lead actions
  | 'lead.created'
  | 'lead.updated'
  | 'lead.deleted'
  | 'lead.status_changed'
  | 'lead.assigned'
  | 'lead.converted'
  // Job actions
  | 'job.created'
  | 'job.updated'
  | 'job.deleted'
  | 'job.status_changed'
  | 'job.assigned'
  | 'job.completed'
  | 'job.rescheduled'
  // Quote actions
  | 'quote.created'
  | 'quote.updated'
  | 'quote.deleted'
  | 'quote.sent'
  | 'quote.accepted'
  | 'quote.declined'
  | 'quote.converted_to_invoice'
  // Invoice actions
  | 'invoice.created'
  | 'invoice.updated'
  | 'invoice.deleted'
  | 'invoice.sent'
  | 'invoice.paid'
  | 'invoice.voided'
  | 'invoice.payment_plan_created'
  // Equipment actions
  | 'equipment.created'
  | 'equipment.updated'
  | 'equipment.deleted'
  | 'equipment.photo_added'
  | 'equipment.photo_deleted'
  // Inventory actions
  | 'inventory.created'
  | 'inventory.updated'
  | 'inventory.deleted'
  | 'inventory.transaction'
  // Team/User actions
  | 'team.member_added'
  | 'team.member_removed'
  | 'team.member_role_changed'
  | 'team.invite_sent'
  // Settings actions
  | 'settings.updated'
  | 'settings.business_updated'
  // Message actions
  | 'message.sent'
  | 'message.template_used'
  // Auth actions
  | 'auth.login'
  | 'auth.logout'
  | 'auth.password_changed'
  // Other actions
  | 'bulk.leads_assigned'
  | 'bulk.items_deleted'
  | 'export.generated'
  | 'report.viewed';

export type AuditTargetType =
  | 'customer'
  | 'lead'
  | 'job'
  | 'quote'
  | 'invoice'
  | 'equipment'
  | 'inventory'
  | 'user'
  | 'team'
  | 'settings'
  | 'message'
  | 'report'
  | 'bulk';

export interface AuditEntry {
  businessId: string;
  userId: string;
  userName?: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string;
  targetName?: string;
  details?: Record<string, unknown>;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit entry
 */
export async function logAuditEntry(entry: AuditEntry): Promise<string | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('business_audit_log')
      .insert({
        business_id: entry.businessId,
        user_id: entry.userId,
        user_name: entry.userName,
        action: entry.action,
        target_type: entry.targetType,
        target_id: entry.targetId,
        target_name: entry.targetName,
        details: entry.details || {},
        old_values: entry.oldValues || null,
        new_values: entry.newValues || null,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent,
      })
      .select('id')
      .single();

    if (error) {
      auditLogger.error({
        msg: 'Failed to write audit log',
        error: error.message,
        entry,
      });
      return null;
    }

    return data.id;
  } catch (error) {
    auditLogger.error({
      msg: 'Audit log exception',
      error: error instanceof Error ? error.message : 'Unknown error',
      entry,
    });
    return null;
  }
}

/**
 * Helper to format changes for audit details
 */
export function formatChanges(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  fieldsToTrack?: string[]
): { oldValues: Record<string, unknown>; newValues: Record<string, unknown> } {
  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  const keys = fieldsToTrack || Object.keys(newObj);

  for (const key of keys) {
    if (oldObj[key] !== newObj[key]) {
      oldValues[key] = oldObj[key];
      newValues[key] = newObj[key];
    }
  }

  return { oldValues, newValues };
}

/**
 * Get audit log entries for a business
 */
export async function getAuditLog(
  businessId: string,
  options: {
    limit?: number;
    offset?: number;
    action?: string;
    targetType?: string;
    targetId?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{
  entries: AuditLogEntry[];
  total: number;
}> {
  const supabase = createAdminClient();

  let query = supabase
    .from('business_audit_log')
    .select('*', { count: 'exact' })
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (options.action) {
    query = query.eq('action', options.action);
  }
  if (options.targetType) {
    query = query.eq('target_type', options.targetType);
  }
  if (options.targetId) {
    query = query.eq('target_id', options.targetId);
  }
  if (options.userId) {
    query = query.eq('user_id', options.userId);
  }
  if (options.startDate) {
    query = query.gte('created_at', options.startDate.toISOString());
  }
  if (options.endDate) {
    query = query.lte('created_at', options.endDate.toISOString());
  }

  const limit = options.limit || 50;
  const offset = options.offset || 0;

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    auditLogger.error({
      msg: 'Failed to fetch audit log',
      error: error.message,
      businessId,
    });
    return { entries: [], total: 0 };
  }

  return {
    entries: data as AuditLogEntry[],
    total: count || 0,
  };
}

export interface AuditLogEntry {
  id: string;
  business_id: string;
  user_id: string;
  user_name?: string;
  action: AuditAction;
  target_type: AuditTargetType;
  target_id?: string;
  target_name?: string;
  details: Record<string, unknown>;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * Get summary statistics for audit log
 */
export async function getAuditSummary(
  businessId: string,
  days: number = 30
): Promise<{
  totalActions: number;
  actionCounts: Record<string, number>;
  topUsers: { userId: string; userName: string; count: number }[];
  recentActivity: AuditLogEntry[];
}> {
  const supabase = createAdminClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get all entries for the period
  const { data: entries } = await supabase
    .from('business_audit_log')
    .select('*')
    .eq('business_id', businessId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  if (!entries || entries.length === 0) {
    return {
      totalActions: 0,
      actionCounts: {},
      topUsers: [],
      recentActivity: [],
    };
  }

  // Count by action
  const actionCounts: Record<string, number> = {};
  for (const entry of entries) {
    const actionCategory = entry.action.split('.')[0];
    actionCounts[actionCategory] = (actionCounts[actionCategory] || 0) + 1;
  }

  // Count by user
  const userCounts: Record<string, { name: string; count: number }> = {};
  for (const entry of entries) {
    if (!userCounts[entry.user_id]) {
      userCounts[entry.user_id] = { name: entry.user_name || 'Unknown', count: 0 };
    }
    userCounts[entry.user_id].count++;
  }

  const topUsers = Object.entries(userCounts)
    .map(([userId, data]) => ({
      userId,
      userName: data.name,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalActions: entries.length,
    actionCounts,
    topUsers,
    recentActivity: entries.slice(0, 10) as AuditLogEntry[],
  };
}
