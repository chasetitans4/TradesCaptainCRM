// =====================================================
// LEAD SCORING
// Automatic lead scoring based on rules and engagement
// =====================================================

import { createClient } from '@/lib/supabase/server';

export interface ScoringRule {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  conditionType: string;
  conditionOperator: string;
  conditionValue: string;
  scoreAdjustment: number;
  isActive: boolean;
  createdAt: string;
}

export interface LeadEngagement {
  id: string;
  leadId: string;
  engagementType: string;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export interface CreateScoringRuleInput {
  name: string;
  description?: string;
  conditionType: string;
  conditionOperator: string;
  conditionValue: string;
  scoreAdjustment: number;
}

// Create scoring rule
export async function createScoringRule(
  businessId: string,
  data: CreateScoringRuleInput
): Promise<{ success: boolean; rule?: ScoringRule; error?: string }> {
  try {
    const supabase = await createClient();

    const { data: rule, error } = await supabase
      .from('lead_scoring_rules')
      .insert({
        business_id: businessId,
        name: data.name,
        description: data.description,
        condition_type: data.conditionType,
        condition_operator: data.conditionOperator,
        condition_value: data.conditionValue,
        score_adjustment: data.scoreAdjustment,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, rule: transformRule(rule) };
  } catch (error: any) {
    console.error('Error creating scoring rule:', error);
    return { success: false, error: error.message };
  }
}

// Update scoring rule
export async function updateScoringRule(
  ruleId: string,
  data: Partial<CreateScoringRuleInput> & { isActive?: boolean }
): Promise<{ success: boolean; rule?: ScoringRule; error?: string }> {
  try {
    const supabase = await createClient();

    const updateData: Record<string, any> = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.conditionType !== undefined) updateData.condition_type = data.conditionType;
    if (data.conditionOperator !== undefined) updateData.condition_operator = data.conditionOperator;
    if (data.conditionValue !== undefined) updateData.condition_value = data.conditionValue;
    if (data.scoreAdjustment !== undefined) updateData.score_adjustment = data.scoreAdjustment;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const { data: rule, error } = await supabase
      .from('lead_scoring_rules')
      .update(updateData)
      .eq('id', ruleId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, rule: transformRule(rule) };
  } catch (error: any) {
    console.error('Error updating scoring rule:', error);
    return { success: false, error: error.message };
  }
}

// Delete scoring rule
export async function deleteScoringRule(
  ruleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { error } = await supabase.from('lead_scoring_rules').delete().eq('id', ruleId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting scoring rule:', error);
    return { success: false, error: error.message };
  }
}

// Get scoring rules for a business
export async function getScoringRules(
  businessId: string,
  includeInactive: boolean = false
): Promise<ScoringRule[]> {
  const supabase = await createClient();

  let query = supabase
    .from('lead_scoring_rules')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at');

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data } = await query;

  return (data || []).map(transformRule);
}

// Calculate lead score
export async function calculateLeadScore(leadId: string): Promise<number> {
  const supabase = await createClient();

  // Get lead data
  const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();

  if (!lead) return 50;

  // Get scoring rules
  const { data: rules } = await supabase
    .from('lead_scoring_rules')
    .select('*')
    .eq('business_id', lead.business_id)
    .eq('is_active', true);

  // Get engagement data
  const { data: engagement } = await supabase
    .from('lead_engagement')
    .select('engagement_type')
    .eq('lead_id', leadId);

  let score = 50; // Base score
  const breakdown: Record<string, number> = {};

  // Apply custom rules
  for (const rule of rules || []) {
    const adjustment = evaluateRule(rule, lead, engagement || []);
    if (adjustment !== 0) {
      score += adjustment;
      breakdown[rule.name] = adjustment;
    }
  }

  // Apply built-in scoring factors
  const builtInFactors = calculateBuiltInFactors(lead, engagement || []);
  score += builtInFactors.total;
  Object.assign(breakdown, builtInFactors.breakdown);

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Update lead with score
  await supabase
    .from('leads')
    .update({
      score,
      score_breakdown: breakdown,
      last_scored_at: new Date().toISOString(),
    })
    .eq('id', leadId);

  return score;
}

// Evaluate a single scoring rule
function evaluateRule(rule: any, lead: any, engagement: any[]): number {
  let fieldValue: any;

  switch (rule.condition_type) {
    case 'source':
      fieldValue = lead.source;
      break;
    case 'service_type':
      fieldValue = lead.service_needed;
      break;
    case 'budget':
      fieldValue = lead.estimated_value;
      break;
    case 'urgency':
      fieldValue = lead.urgency;
      break;
    case 'property_type':
      fieldValue = lead.property_type;
      break;
    case 'location':
      fieldValue = lead.city || lead.zip;
      break;
    case 'engagement':
      fieldValue = engagement.filter((e) => e.engagement_type === rule.condition_value).length;
      break;
    default:
      return 0;
  }

  const matches = checkCondition(fieldValue, rule.condition_operator, rule.condition_value);
  return matches ? rule.score_adjustment : 0;
}

// Check if condition matches
function checkCondition(value: any, operator: string, target: string): boolean {
  if (value === null || value === undefined) return false;

  switch (operator) {
    case 'equals':
      return String(value).toLowerCase() === target.toLowerCase();
    case 'not_equals':
      return String(value).toLowerCase() !== target.toLowerCase();
    case 'contains':
      return String(value).toLowerCase().includes(target.toLowerCase());
    case 'not_contains':
      return !String(value).toLowerCase().includes(target.toLowerCase());
    case 'greater_than':
      return Number(value) > Number(target);
    case 'less_than':
      return Number(value) < Number(target);
    case 'greater_or_equal':
      return Number(value) >= Number(target);
    case 'less_or_equal':
      return Number(value) <= Number(target);
    case 'exists':
      return value !== null && value !== undefined && value !== '';
    default:
      return false;
  }
}

// Calculate built-in scoring factors
function calculateBuiltInFactors(lead: any, engagement: any[]) {
  const breakdown: Record<string, number> = {};
  let total = 0;

  // Response time (faster = higher score)
  if (lead.first_response_at && lead.created_at) {
    const responseTime =
      new Date(lead.first_response_at).getTime() - new Date(lead.created_at).getTime();
    const hours = responseTime / (1000 * 60 * 60);

    if (hours < 1) {
      breakdown['Fast response (<1h)'] = 10;
      total += 10;
    } else if (hours < 4) {
      breakdown['Quick response (<4h)'] = 5;
      total += 5;
    } else if (hours > 24) {
      breakdown['Slow response (>24h)'] = -10;
      total -= 10;
    }
  }

  // Engagement count
  const engagementCount = engagement.length;
  if (engagementCount >= 5) {
    breakdown['High engagement (5+)'] = 15;
    total += 15;
  } else if (engagementCount >= 2) {
    breakdown['Some engagement (2-4)'] = 5;
    total += 5;
  }

  // Contact information quality
  if (lead.phone) {
    breakdown['Has phone'] = 5;
    total += 5;
  }

  if (lead.email) {
    breakdown['Has email'] = 5;
    total += 5;
  }

  // Lead value
  const estimatedValue = lead.estimated_value || 0;
  if (estimatedValue >= 5000) {
    breakdown['High value ($5000+)'] = 15;
    total += 15;
  } else if (estimatedValue >= 1000) {
    breakdown['Medium value ($1000-5000)'] = 5;
    total += 5;
  }

  // Lead age (older = less likely to convert)
  const daysSinceCreated =
    (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceCreated > 30) {
    breakdown['Stale lead (>30 days)'] = -15;
    total -= 15;
  } else if (daysSinceCreated > 14) {
    breakdown['Aging lead (>14 days)'] = -5;
    total -= 5;
  }

  // Status-based adjustments
  if (lead.status === 'qualified') {
    breakdown['Qualified status'] = 10;
    total += 10;
  } else if (lead.status === 'contacted') {
    breakdown['Contacted status'] = 5;
    total += 5;
  }

  return { breakdown, total };
}

// Track lead engagement
export async function trackLeadEngagement(
  leadId: string,
  engagementType: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    await supabase.from('lead_engagement').insert({
      lead_id: leadId,
      engagement_type: engagementType,
      metadata,
    });

    // Recalculate score
    await calculateLeadScore(leadId);

    return { success: true };
  } catch (error: any) {
    console.error('Error tracking lead engagement:', error);
    return { success: false, error: error.message };
  }
}

// Get lead engagement history
export async function getLeadEngagement(leadId: string): Promise<LeadEngagement[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('lead_engagement')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  return (data || []).map((e) => ({
    id: e.id,
    leadId: e.lead_id,
    engagementType: e.engagement_type,
    metadata: e.metadata,
    createdAt: e.created_at,
  }));
}

// Get hot leads (score > 70)
export async function getHotLeads(businessId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('leads')
    .select('*')
    .eq('business_id', businessId)
    .gte('score', 70)
    .in('status', ['new', 'contacted', 'qualified'])
    .order('score', { ascending: false });

  return data || [];
}

// Get leads needing attention (stale or low score)
export async function getLeadsNeedingAttention(businessId: string) {
  const supabase = await createClient();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data } = await supabase
    .from('leads')
    .select('*')
    .eq('business_id', businessId)
    .in('status', ['new', 'contacted'])
    .or(`score.lt.40,last_scored_at.lt.${thirtyDaysAgo.toISOString()}`)
    .order('created_at', { ascending: false });

  return data || [];
}

// Batch recalculate scores for all leads
export async function recalculateAllScores(businessId: string): Promise<number> {
  const supabase = await createClient();

  const { data: leads } = await supabase
    .from('leads')
    .select('id')
    .eq('business_id', businessId)
    .in('status', ['new', 'contacted', 'qualified']);

  let updated = 0;

  for (const lead of leads || []) {
    await calculateLeadScore(lead.id);
    updated++;
  }

  return updated;
}

// Get lead score distribution
export async function getScoreDistribution(businessId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from('leads')
    .select('score')
    .eq('business_id', businessId)
    .in('status', ['new', 'contacted', 'qualified']);

  const distribution = {
    hot: 0, // 70-100
    warm: 0, // 50-69
    cold: 0, // 30-49
    dead: 0, // 0-29
  };

  (data || []).forEach((lead) => {
    const score = lead.score || 50;
    if (score >= 70) distribution.hot++;
    else if (score >= 50) distribution.warm++;
    else if (score >= 30) distribution.cold++;
    else distribution.dead++;
  });

  return distribution;
}

// Helper to transform database row
function transformRule(row: any): ScoringRule {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    conditionType: row.condition_type,
    conditionOperator: row.condition_operator,
    conditionValue: row.condition_value,
    scoreAdjustment: row.score_adjustment,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}
