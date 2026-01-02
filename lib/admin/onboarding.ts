// =====================================================
// CLIENT ONBOARDING LIBRARY
// Phase-based onboarding checklists
// Version: 5.8
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import type {
  OnboardingTemplate,
  OnboardingTemplateTask,
  ClientOnboarding,
  ClientOnboardingTask,
  OnboardingStatus,
  OnboardingTaskStatus,
} from './types';

// =====================================================
// ONBOARDING TEMPLATES
// =====================================================

/**
 * Get onboarding template for a plan track
 */
export async function getOnboardingTemplate(
  planTrack: string
): Promise<OnboardingTemplate[]> {
  const supabase = createAdminClient();

  const { data: templates, error } = await supabase
    .from('onboarding_templates')
    .select(`
      *,
      tasks:onboarding_template_tasks(*)
    `)
    .eq('plan_track', planTrack)
    .order('phase_number', { ascending: true });

  if (error) throw new Error(`Failed to get template: ${error.message}`);

  return (templates || []).map((t) => ({
    ...t,
    tasks: (t.tasks || []).sort(
      (a: OnboardingTemplateTask, b: OnboardingTemplateTask) =>
        (a.display_order || 0) - (b.display_order || 0)
    ),
  }));
}

// =====================================================
// CLIENT ONBOARDING
// =====================================================

/**
 * Get all onboardings in progress for an agent
 */
export async function getOnboardingsInProgress(
  agentId: string
): Promise<ClientOnboarding[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('client_onboarding')
    .select(`
      *,
      client:crm_accounts!client_id(id, business_name, plan_type),
      tasks:client_onboarding_tasks(*)
    `)
    .in('status', ['in_progress', 'stalled'])
    .order('started_at', { ascending: false });

  if (error) throw new Error(`Failed to get onboardings: ${error.message}`);

  // Filter by agent's clients
  const { data: agentClients } = await supabase
    .from('crm_accounts')
    .select('id')
    .eq('agent_id', agentId);

  const agentClientIds = new Set((agentClients || []).map((c) => c.id));

  return (data || [])
    .filter((o) => agentClientIds.has(o.client_id))
    .map((o) => ({
      ...o,
      client_name: o.client?.business_name,
      plan_type: o.client?.plan_type,
    }));
}

/**
 * Get onboarding for a specific client
 */
export async function getClientOnboarding(
  clientId: string
): Promise<ClientOnboarding | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('client_onboarding')
    .select(`
      *,
      client:crm_accounts!client_id(id, business_name, plan_type),
      tasks:client_onboarding_tasks(*)
    `)
    .eq('client_id', clientId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get onboarding: ${error.message}`);
  }

  if (!data) return null;

  return {
    ...data,
    client_name: data.client?.business_name,
    plan_type: data.client?.plan_type,
    tasks: (data.tasks || []).sort(
      (a: ClientOnboardingTask, b: ClientOnboardingTask) =>
        (a.phase_name || '').localeCompare(b.phase_name || '') ||
        a.created_at.localeCompare(b.created_at)
    ),
  };
}

/**
 * Create onboarding for a new client
 */
export async function createClientOnboarding(
  clientId: string,
  planTrack: string
): Promise<ClientOnboarding> {
  const supabase = createAdminClient();

  // Create onboarding record
  const { data: onboarding, error: onboardingError } = await supabase
    .from('client_onboarding')
    .insert({
      client_id: clientId,
      status: 'in_progress',
      progress_percent: 0,
    })
    .select()
    .single();

  if (onboardingError) {
    throw new Error(`Failed to create onboarding: ${onboardingError.message}`);
  }

  // Get template and create tasks
  const templates = await getOnboardingTemplate(planTrack);

  const tasks: Partial<ClientOnboardingTask>[] = [];
  for (const template of templates) {
    for (const task of template.tasks || []) {
      tasks.push({
        onboarding_id: onboarding.id,
        template_task_id: task.id,
        task_name: task.task_name,
        phase_name: template.phase_name,
        assigned_to: task.assigned_to,
        status: 'pending',
      });
    }
  }

  if (tasks.length > 0) {
    const { error: tasksError } = await supabase
      .from('client_onboarding_tasks')
      .insert(tasks);

    if (tasksError) {
      console.error('Failed to create onboarding tasks:', tasksError);
    }
  }

  return onboarding;
}

/**
 * Update onboarding task status
 */
export async function updateOnboardingTask(
  taskId: string,
  updates: {
    status?: OnboardingTaskStatus;
    blocked_reason?: string;
    notes?: string;
    completed_by?: string;
  }
): Promise<ClientOnboardingTask> {
  const supabase = createAdminClient();

  const updateData: any = { ...updates };

  if (updates.status === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('client_onboarding_tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update task: ${error.message}`);

  // Recalculate progress
  await recalculateOnboardingProgress(data.onboarding_id);

  return data;
}

/**
 * Recalculate onboarding progress percentage
 */
async function recalculateOnboardingProgress(onboardingId: string): Promise<void> {
  const supabase = createAdminClient();

  const { data: tasks } = await supabase
    .from('client_onboarding_tasks')
    .select('status')
    .eq('onboarding_id', onboardingId);

  if (!tasks || tasks.length === 0) return;

  const completed = tasks.filter((t) => t.status === 'completed').length;
  const progress = Math.round((completed / tasks.length) * 100);

  const updates: any = { progress_percent: progress, updated_at: new Date().toISOString() };

  if (progress === 100) {
    updates.status = 'completed';
    updates.completed_at = new Date().toISOString();
  }

  await supabase.from('client_onboarding').update(updates).eq('id', onboardingId);
}

/**
 * Add note to onboarding
 */
export async function addOnboardingNote(
  clientId: string,
  note: string,
  agentName: string
): Promise<void> {
  const supabase = createAdminClient();

  const onboarding = await getClientOnboarding(clientId);
  if (!onboarding) {
    throw new Error('Onboarding not found');
  }

  // Create a note task
  await supabase.from('client_onboarding_tasks').insert({
    onboarding_id: onboarding.id,
    task_name: 'Note',
    phase_name: 'Notes',
    status: 'completed',
    notes: note,
    completed_at: new Date().toISOString(),
    completed_by: agentName,
  });
}

/**
 * Mark onboarding as stalled
 */
export async function markOnboardingStalled(
  clientId: string,
  reason: string
): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('client_onboarding')
    .update({
      status: 'stalled',
      updated_at: new Date().toISOString(),
    })
    .eq('client_id', clientId);
}

// =====================================================
// DEFAULT TEMPLATES
// =====================================================

export const DEFAULT_TEMPLATES = {
  nevermiss: [
    {
      phase: 1,
      name: 'Account Setup',
      tasks: [
        { name: 'Welcome email sent', assigned_to: 'auto' },
        { name: 'Client portal access created', assigned_to: 'auto' },
        { name: 'Payment method on file', assigned_to: 'auto' },
      ],
    },
    {
      phase: 2,
      name: 'Leads Captain Setup',
      tasks: [
        { name: 'Phone number provisioned', assigned_to: 'auto' },
        { name: 'Call forwarding configured', assigned_to: 'agent' },
        { name: 'AI responses customized', assigned_to: 'agent' },
        { name: 'Test call completed', assigned_to: 'agent' },
        { name: 'Client trained on dashboard', assigned_to: 'agent' },
      ],
    },
  ],
  gold: [
    {
      phase: 1,
      name: 'Account Setup',
      tasks: [
        { name: 'Welcome email sent', assigned_to: 'auto' },
        { name: 'Client portal access created', assigned_to: 'auto' },
        { name: 'Payment method on file', assigned_to: 'auto' },
        { name: 'Signed agreement uploaded', assigned_to: 'auto' },
      ],
    },
    {
      phase: 2,
      name: 'CRM Setup',
      tasks: [
        { name: 'Blue HQ account provisioned', assigned_to: 'auto' },
        { name: 'Business info configured', assigned_to: 'agent' },
        { name: 'Service types added', assigned_to: 'agent' },
        { name: 'Calendar availability set', assigned_to: 'client' },
      ],
    },
    {
      phase: 3,
      name: 'Leads Captain Setup',
      tasks: [
        { name: 'Phone number provisioned', assigned_to: 'auto' },
        { name: 'Call forwarding configured', assigned_to: 'agent' },
        { name: 'AI responses customized', assigned_to: 'agent' },
        { name: 'Test call completed', assigned_to: 'agent' },
        { name: 'Client trained on dashboard', assigned_to: 'agent' },
      ],
    },
    {
      phase: 4,
      name: 'Website',
      tasks: [
        { name: 'Website intake form sent', assigned_to: 'auto' },
        { name: 'Intake form completed', assigned_to: 'client' },
        { name: 'Content writing', assigned_to: 'team' },
        { name: 'Design mockup review', assigned_to: 'client' },
        { name: 'Client approval', assigned_to: 'client' },
        { name: 'Website live', assigned_to: 'team' },
      ],
    },
    {
      phase: 5,
      name: 'Local SEO',
      tasks: [
        { name: 'GBP access request sent', assigned_to: 'agent' },
        { name: 'GBP access received', assigned_to: 'client' },
        { name: 'GBP optimized', assigned_to: 'team' },
        { name: 'Citations submitted', assigned_to: 'team' },
        { name: 'Initial SEO report sent', assigned_to: 'team' },
      ],
    },
    {
      phase: 6,
      name: 'Go Live',
      tasks: [
        { name: 'All systems verified', assigned_to: 'agent' },
        { name: 'Client training call completed', assigned_to: 'agent' },
        { name: 'Go-live confirmation', assigned_to: 'agent' },
        { name: '7-day check-in scheduled', assigned_to: 'agent' },
      ],
    },
  ],
};
