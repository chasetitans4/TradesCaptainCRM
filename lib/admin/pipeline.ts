// =====================================================
// SALES PIPELINE LIBRARY
// Kanban-style lead tracking for agents
// Version: 5.8
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import type {
  PipelineLead,
  PipelineActivity,
  PipelineTask,
  PipelineStats,
  PipelineStage,
  LeadActivityType,
  LeadTaskType,
} from './types';

// =====================================================
// PIPELINE OVERVIEW
// =====================================================

/**
 * Get pipeline overview with leads grouped by stage
 */
export async function getPipelineOverview(agentId: string): Promise<{
  stages: Record<PipelineStage, PipelineLead[]>;
  stats: PipelineStats;
}> {
  const supabase = createAdminClient();

  const { data: leads, error } = await supabase
    .from('pipeline_leads')
    .select('*')
    .eq('agent_id', agentId)
    .order('stage_changed_at', { ascending: false });

  if (error) throw new Error(`Failed to get pipeline: ${error.message}`);

  const allLeads = (leads || []).map((lead) => ({
    ...lead,
    days_in_stage: calculateDaysInStage(lead.stage_changed_at),
  }));

  // Group by stage
  const stages: Record<PipelineStage, PipelineLead[]> = {
    new: [],
    contacted: [],
    qualified: [],
    proposal: [],
    won: [],
    lost: [],
  };

  for (const lead of allLeads) {
    if (stages[lead.stage as PipelineStage]) {
      stages[lead.stage as PipelineStage].push(lead);
    }
  }

  // Get next task for each lead
  for (const stage of Object.keys(stages) as PipelineStage[]) {
    for (const lead of stages[stage]) {
      const { data: nextTask } = await supabase
        .from('pipeline_tasks')
        .select('*')
        .eq('lead_id', lead.id)
        .eq('is_completed', false)
        .order('due_date', { ascending: true })
        .limit(1)
        .single();

      lead.next_task = nextTask || null;
    }
  }

  // Calculate stats
  const activeLeads = allLeads.filter(
    (l) => l.stage !== 'won' && l.stage !== 'lost'
  );
  const wonLeads = allLeads.filter((l) => l.stage === 'won');
  const lostLeads = allLeads.filter((l) => l.stage === 'lost');

  const totalValue = activeLeads.reduce(
    (sum, l) => sum + (l.estimated_value_cents || 0),
    0
  );
  const winRate =
    wonLeads.length + lostLeads.length > 0
      ? Math.round((wonLeads.length / (wonLeads.length + lostLeads.length)) * 100)
      : 0;

  const stats: PipelineStats = {
    stages: (Object.keys(stages) as PipelineStage[]).map((stage) => ({
      stage,
      count: stages[stage].length,
      value_cents: stages[stage].reduce(
        (sum, l) => sum + (l.estimated_value_cents || 0),
        0
      ),
    })),
    total_leads: activeLeads.length,
    total_value_cents: totalValue,
    win_rate: winRate,
  };

  return { stages, stats };
}

function calculateDaysInStage(stageChangedAt: string): number {
  const changed = new Date(stageChangedAt);
  const now = new Date();
  return Math.floor((now.getTime() - changed.getTime()) / (1000 * 60 * 60 * 24));
}

// =====================================================
// LEAD CRUD
// =====================================================

/**
 * Get all leads for an agent
 */
export async function getLeads(
  agentId: string,
  options?: {
    stage?: PipelineStage;
    source?: string;
    limit?: number;
    offset?: number;
  }
): Promise<PipelineLead[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('pipeline_leads')
    .select('*')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  if (options?.stage) {
    query = query.eq('stage', options.stage);
  }

  if (options?.source) {
    query = query.eq('source', options.source);
  }

  if (options?.limit) {
    const offset = options.offset || 0;
    query = query.range(offset, offset + options.limit - 1);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to get leads: ${error.message}`);

  return (data || []).map((lead) => ({
    ...lead,
    days_in_stage: calculateDaysInStage(lead.stage_changed_at),
  }));
}

/**
 * Get a single lead by ID
 */
export async function getLead(leadId: string): Promise<PipelineLead | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('pipeline_leads')
    .select('*')
    .eq('id', leadId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get lead: ${error.message}`);
  }

  if (!data) return null;

  // Get next task
  const { data: nextTask } = await supabase
    .from('pipeline_tasks')
    .select('*')
    .eq('lead_id', leadId)
    .eq('is_completed', false)
    .order('due_date', { ascending: true })
    .limit(1)
    .single();

  return {
    ...data,
    days_in_stage: calculateDaysInStage(data.stage_changed_at),
    next_task: nextTask || null,
  };
}

/**
 * Create a new lead
 */
export async function createLead(
  agentId: string,
  input: {
    company_name?: string;
    contact_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    source?: string;
    interested_plan?: string;
    interested_track?: string;
    estimated_value_cents?: number;
    notes?: string;
  }
): Promise<PipelineLead> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('pipeline_leads')
    .insert({
      agent_id: agentId,
      ...input,
      stage: 'new',
      stage_changed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create lead: ${error.message}`);

  // Log activity
  await logActivity(data.id, agentId, 'note', 'Lead created');

  // Create initial follow-up task
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  await createTask(data.id, agentId, {
    task_type: 'call',
    description: 'Initial call',
    due_date: tomorrow.toISOString().split('T')[0],
  });

  return {
    ...data,
    days_in_stage: 0,
  };
}

/**
 * Update a lead
 */
export async function updateLead(
  leadId: string,
  agentId: string,
  updates: Partial<PipelineLead>
): Promise<PipelineLead> {
  const supabase = createAdminClient();

  // If stage is changing, update stage_changed_at and log activity
  const { data: currentLead } = await supabase
    .from('pipeline_leads')
    .select('stage')
    .eq('id', leadId)
    .single();

  const updateData: any = { ...updates, updated_at: new Date().toISOString() };

  if (updates.stage && currentLead && updates.stage !== currentLead.stage) {
    updateData.stage_changed_at = new Date().toISOString();

    await logActivity(
      leadId,
      agentId,
      'stage_change',
      `Stage changed from ${currentLead.stage} to ${updates.stage}`
    );
  }

  const { data, error } = await supabase
    .from('pipeline_leads')
    .update(updateData)
    .eq('id', leadId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update lead: ${error.message}`);

  return {
    ...data,
    days_in_stage: calculateDaysInStage(data.stage_changed_at),
  };
}

/**
 * Delete a lead
 */
export async function deleteLead(leadId: string): Promise<void> {
  const supabase = createAdminClient();

  // Delete related activities and tasks first
  await supabase.from('pipeline_activities').delete().eq('lead_id', leadId);
  await supabase.from('pipeline_tasks').delete().eq('lead_id', leadId);

  const { error } = await supabase
    .from('pipeline_leads')
    .delete()
    .eq('id', leadId);

  if (error) throw new Error(`Failed to delete lead: ${error.message}`);
}

/**
 * Move lead to a new stage
 */
export async function moveLeadToStage(
  leadId: string,
  agentId: string,
  newStage: PipelineStage,
  options?: { lost_reason?: string }
): Promise<PipelineLead> {
  const updates: Partial<PipelineLead> = { stage: newStage };

  if (newStage === 'lost' && options?.lost_reason) {
    updates.lost_reason = options.lost_reason;
  }

  if (newStage === 'won') {
    updates.converted_at = new Date().toISOString();
  }

  return updateLead(leadId, agentId, updates);
}

// =====================================================
// ACTIVITIES
// =====================================================

/**
 * Get activities for a lead
 */
export async function getLeadActivities(leadId: string): Promise<PipelineActivity[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('pipeline_activities')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to get activities: ${error.message}`);

  return data || [];
}

/**
 * Log an activity for a lead
 */
export async function logActivity(
  leadId: string,
  agentId: string,
  activityType: LeadActivityType,
  description?: string,
  options?: {
    duration_minutes?: number;
    outcome?: string;
  }
): Promise<PipelineActivity> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('pipeline_activities')
    .insert({
      lead_id: leadId,
      agent_id: agentId,
      activity_type: activityType,
      description,
      duration_minutes: options?.duration_minutes,
      outcome: options?.outcome,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to log activity: ${error.message}`);

  // Update last_contact_at on lead if it's a contact activity
  if (['call', 'email', 'meeting'].includes(activityType)) {
    await supabase
      .from('pipeline_leads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', leadId);
  }

  return data;
}

// =====================================================
// TASKS
// =====================================================

/**
 * Get tasks for a lead
 */
export async function getLeadTasks(
  leadId: string,
  includeCompleted = false
): Promise<PipelineTask[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('pipeline_tasks')
    .select('*')
    .eq('lead_id', leadId)
    .order('due_date', { ascending: true });

  if (!includeCompleted) {
    query = query.eq('is_completed', false);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to get tasks: ${error.message}`);

  return data || [];
}

/**
 * Get today's tasks for an agent
 */
export async function getTodaysTasks(agentId: string): Promise<PipelineTask[]> {
  const supabase = createAdminClient();

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('pipeline_tasks')
    .select(`
      *,
      lead:pipeline_leads(*)
    `)
    .eq('agent_id', agentId)
    .eq('is_completed', false)
    .lte('due_date', today)
    .order('due_date', { ascending: true });

  if (error) throw new Error(`Failed to get today's tasks: ${error.message}`);

  return data || [];
}

/**
 * Get overdue tasks for an agent
 */
export async function getOverdueTasks(agentId: string): Promise<PipelineTask[]> {
  const supabase = createAdminClient();

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('pipeline_tasks')
    .select(`
      *,
      lead:pipeline_leads(*)
    `)
    .eq('agent_id', agentId)
    .eq('is_completed', false)
    .lt('due_date', today)
    .order('due_date', { ascending: true });

  if (error) throw new Error(`Failed to get overdue tasks: ${error.message}`);

  return data || [];
}

/**
 * Create a task
 */
export async function createTask(
  leadId: string,
  agentId: string,
  input: {
    task_type: LeadTaskType;
    description?: string;
    due_date: string;
  }
): Promise<PipelineTask> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('pipeline_tasks')
    .insert({
      lead_id: leadId,
      agent_id: agentId,
      ...input,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create task: ${error.message}`);

  return data;
}

/**
 * Complete a task
 */
export async function completeTask(
  taskId: string,
  agentId: string
): Promise<PipelineTask> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('pipeline_tasks')
    .update({
      is_completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw new Error(`Failed to complete task: ${error.message}`);

  // Log activity
  await logActivity(data.lead_id, agentId, 'task_completed', data.description || 'Task completed');

  return data;
}

/**
 * Update a task
 */
export async function updateTask(
  taskId: string,
  updates: Partial<PipelineTask>
): Promise<PipelineTask> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('pipeline_tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update task: ${error.message}`);

  return data;
}

// =====================================================
// PIPELINE STATS
// =====================================================

/**
 * Get pipeline stats for reporting
 */
export async function getPipelineStats(agentId: string): Promise<PipelineStats> {
  const { stats } = await getPipelineOverview(agentId);
  return stats;
}
