// =====================================================
// ADMIN LEADS MANAGEMENT
// =====================================================

import { createAdminClient } from '@/lib/supabase/server';
import {
  Lead,
  LeadActivity,
  LeadStatus,
  LeadSource,
  CreateLeadInput,
  ReassignLeadInput,
  FormattedLeadData,
  AssignmentStrategy,
  BatchUploadResult,
  BatchUploadValidationError,
  AdminUser,
} from './types';
import { validateLead } from './csv-parser';

/**
 * Get leads (agents see only their own, management sees all)
 */
export async function getLeads(
  options: {
    agentId?: string;
    status?: LeadStatus;
    source?: LeadSource;
    search?: string;
    page?: number;
    limit?: number;
    isManagement?: boolean;
  } = {}
): Promise<{ leads: Lead[]; total: number }> {
  const supabase = createAdminClient();
  const { agentId, status, source, search, page = 1, limit = 25, isManagement = false } = options;

  let query = supabase
    .from('tc_leads')
    .select('*, agent:admin_users!tc_leads_agent_id_fkey(id, full_name, email)', { count: 'exact' })
    .order('created_at', { ascending: false });

  // Agents can only see their own leads
  if (!isManagement && agentId) {
    query = query.eq('agent_id', agentId);
  } else if (isManagement && agentId) {
    // Management filtering by specific agent
    query = query.eq('agent_id', agentId);
  }

  if (status) {
    query = query.eq('status', status);
  }
  if (source) {
    query = query.eq('source', source);
  }
  if (search) {
    query = query.or(`company_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    // Table might not exist yet, return empty
    return { leads: [], total: 0 };
  }

  return { leads: data || [], total: count || 0 };
}

/**
 * Get a single lead by ID
 */
export async function getLead(leadId: string, agentId?: string): Promise<Lead | null> {
  const supabase = createAdminClient();

  let query = supabase
    .from('tc_leads')
    .select('*, agent:admin_users!tc_leads_agent_id_fkey(id, full_name, email)')
    .eq('id', leadId);

  // If agentId provided, enforce ownership
  if (agentId) {
    query = query.eq('agent_id', agentId);
  }

  const { data, error } = await query.single();
  if (error) return null;

  return data;
}

/**
 * Create a new lead (auto-assigned to creating agent)
 */
export async function createLead(
  agentId: string,
  data: CreateLeadInput
): Promise<Lead> {
  const supabase = createAdminClient();

  const { data: lead, error } = await supabase
    .from('tc_leads')
    .insert({
      agent_id: agentId,
      assigned_at: new Date().toISOString(),
      company_name: data.company_name,
      contact_name: data.contact_name,
      email: data.email?.toLowerCase(),
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      trade_type: data.trade_type,
      employee_count: data.employee_count,
      current_website: data.current_website,
      current_crm: data.current_crm,
      interested_in: data.interested_in,
      preferred_plan: data.preferred_plan,
      estimated_value: data.estimated_value,
      notes: data.notes,
      source: 'manual',
      status: 'new',
    })
    .select()
    .single();

  if (error) throw error;

  // Log activity
  await logLeadActivity(lead.id, agentId, 'created', 'Lead created');

  return lead;
}

/**
 * Update a lead
 */
export async function updateLead(
  leadId: string,
  updates: Partial<CreateLeadInput>,
  agentId?: string
): Promise<Lead> {
  const supabase = createAdminClient();

  let query = supabase
    .from('tc_leads')
    .update({
      ...updates,
      email: updates.email?.toLowerCase(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId);

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }

  const { data, error } = await query.select().single();
  if (error) throw error;

  return data;
}

/**
 * Update lead status
 */
export async function updateLeadStatus(
  leadId: string,
  newStatus: LeadStatus,
  agentId: string
): Promise<Lead> {
  const supabase = createAdminClient();

  // Get current status
  const { data: lead } = await supabase
    .from('tc_leads')
    .select('status')
    .eq('id', leadId)
    .single();

  const oldStatus = lead?.status;

  const { data: updated, error } = await supabase
    .from('tc_leads')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)
    .select()
    .single();

  if (error) throw error;

  // Log activity
  await logLeadActivity(leadId, agentId, 'status_changed', `Status changed from ${oldStatus} to ${newStatus}`, {
    old_status: oldStatus,
    new_status: newStatus,
  });

  return updated;
}

/**
 * Reassign a lead to another agent (management only)
 */
export async function reassignLead(
  leadId: string,
  input: ReassignLeadInput,
  reassignedBy: string
): Promise<Lead> {
  const supabase = createAdminClient();

  // Get current lead
  const { data: lead } = await supabase
    .from('tc_leads')
    .select('agent_id')
    .eq('id', leadId)
    .single();

  const oldAgentId = lead?.agent_id;

  // Update lead
  const { data: updated, error } = await supabase
    .from('tc_leads')
    .update({
      agent_id: input.to_agent_id,
      assigned_at: new Date().toISOString(),
      assigned_by: reassignedBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)
    .select()
    .single();

  if (error) throw error;

  // Create reassignment record
  await supabase.from('lead_reassignments').insert({
    lead_id: leadId,
    from_agent_id: oldAgentId,
    to_agent_id: input.to_agent_id,
    reassigned_by: reassignedBy,
    reason: input.reason,
    notes: input.notes,
  });

  // Log activity
  await supabase.from('lead_activities').insert({
    lead_id: leadId,
    agent_id: reassignedBy,
    activity_type: 'reassigned',
    description: `Lead reassigned: ${input.reason}`,
    old_agent_id: oldAgentId,
    new_agent_id: input.to_agent_id,
    reassigned_by: reassignedBy,
    reassignment_reason: input.reason,
  });

  return updated;
}

/**
 * Bulk reassign leads
 */
export async function bulkReassignLeads(
  leadIds: string[],
  toAgentId: string,
  reason: string,
  reassignedBy: string
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const leadId of leadIds) {
    try {
      await reassignLead(leadId, {
        to_agent_id: toAgentId,
        reason,
      }, reassignedBy);
      success++;
    } catch {
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Log contact activity on a lead
 */
export async function logLeadContact(
  leadId: string,
  agentId: string,
  activityType: 'called' | 'emailed' | 'texted' | 'met',
  description?: string,
  nextFollowupAt?: string
): Promise<void> {
  const supabase = createAdminClient();

  // Update lead
  await supabase
    .from('tc_leads')
    .update({
      last_contact_at: new Date().toISOString(),
      next_followup_at: nextFollowupAt || undefined,
      contact_count: supabase.rpc('increment_contact_count', { lead_id: leadId }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', leadId);

  // Log activity
  await logLeadActivity(leadId, agentId, activityType, description || `${activityType} the lead`);
}

/**
 * Log lead activity
 */
export async function logLeadActivity(
  leadId: string,
  agentId: string,
  activityType: string,
  description?: string,
  extra?: {
    old_status?: string;
    new_status?: string;
    old_agent_id?: string;
    new_agent_id?: string;
    reassigned_by?: string;
    reassignment_reason?: string;
  }
): Promise<void> {
  const supabase = createAdminClient();

  await supabase.from('lead_activities').insert({
    lead_id: leadId,
    agent_id: agentId,
    activity_type: activityType,
    description,
    ...extra,
  });
}

/**
 * Get lead activities
 */
export async function getLeadActivities(leadId: string): Promise<LeadActivity[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('lead_activities')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  if (error) {
    // Table might not exist yet, return empty
    return [];
  }
  return data || [];
}

/**
 * Convert lead to customer
 */
export async function convertLead(
  leadId: string,
  agentId: string,
  accountId: string,
  accountType: 'crm' | 'web'
): Promise<Lead> {
  const supabase = createAdminClient();

  const updateData: any = {
    status: 'won',
    converted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (accountType === 'crm') {
    updateData.crm_account_id = accountId;
  } else {
    updateData.web_customer_id = accountId;
  }

  const { data, error } = await supabase
    .from('tc_leads')
    .update(updateData)
    .eq('id', leadId)
    .select()
    .single();

  if (error) throw error;

  // Log activity
  await logLeadActivity(leadId, agentId, 'converted', `Lead converted to ${accountType} customer`);

  return data;
}

/**
 * Get lead statistics for an agent
 */
export async function getLeadStats(agentId?: string): Promise<{
  total: number;
  new: number;
  contacted: number;
  qualified: number;
  won: number;
  lost: number;
}> {
  const supabase = createAdminClient();

  let query = supabase
    .from('tc_leads')
    .select('status');

  if (agentId) {
    query = query.eq('agent_id', agentId);
  }

  const { data } = await query;
  const leads = data || [];

  return {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
    won: leads.filter(l => l.status === 'won').length,
    lost: leads.filter(l => l.status === 'lost').length,
  };
}

/**
 * Delete a lead (hard delete)
 */
export async function deleteLead(leadId: string): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from('tc_leads')
    .delete()
    .eq('id', leadId);
}

// =====================================================
// BATCH LEAD UPLOAD FUNCTIONS
// =====================================================

/**
 * Create leads in batch
 */
export async function createLeadsBatch(
  leads: FormattedLeadData[],
  options: {
    assignmentStrategy: AssignmentStrategy;
    agentId?: string;
    uploadedBy: string;
  }
): Promise<BatchUploadResult> {
  const supabase = createAdminClient();
  const batchId = crypto.randomUUID();

  // Validate all leads first
  const validationErrors: BatchUploadValidationError[] = [];
  leads.forEach((lead, index) => {
    const errors = validateLead(lead, index + 1);
    validationErrors.push(...errors);
  });

  // If there are validation errors on required fields, report them
  const criticalErrors = validationErrors.filter(
    e => e.field === 'company_name' || e.field === 'contact_name'
  );

  if (criticalErrors.length > 0) {
    return {
      batch_id: batchId,
      total: leads.length,
      imported: 0,
      failed: criticalErrors.length,
      errors: criticalErrors,
    };
  }

  // Determine agent assignments
  let agentAssignments: string[];

  switch (options.assignmentStrategy) {
    case 'manual':
      if (!options.agentId) {
        throw new Error('Agent ID required for manual assignment');
      }
      agentAssignments = leads.map(() => options.agentId!);
      break;

    case 'round_robin':
      agentAssignments = await getRoundRobinAssignments(leads.length);
      break;

    case 'capacity':
      agentAssignments = await getCapacityBasedAssignments(leads.length);
      break;

    default:
      throw new Error(`Invalid assignment strategy: ${options.assignmentStrategy}`);
  }

  // Insert leads
  const leadsToInsert = leads.map((lead, index) => ({
    agent_id: agentAssignments[index],
    assigned_at: new Date().toISOString(),
    assigned_by: options.uploadedBy,
    company_name: lead.company_name,
    contact_name: lead.contact_name,
    email: lead.email?.toLowerCase(),
    phone: lead.phone,
    address: lead.address,
    city: lead.city,
    state: lead.state,
    zip: lead.zip,
    trade_type: lead.trade_type,
    employee_count: lead.employee_count,
    current_website: lead.current_website,
    current_crm: lead.current_crm,
    notes: lead.notes,
    source: 'batch_upload' as const,
    source_details: `Batch upload ${batchId}`,
    status: 'new' as const,
    batch_upload_id: batchId,
    contact_count: 0,
  }));

  const { data, error } = await supabase
    .from('tc_leads')
    .insert(leadsToInsert)
    .select('id');

  if (error) {
    return {
      batch_id: batchId,
      total: leads.length,
      imported: 0,
      failed: leads.length,
      errors: [{
        row: 0,
        field: 'database',
        message: error.message,
      }],
    };
  }

  const importedCount = data?.length || 0;

  // Log activity for each imported lead
  if (data && data.length > 0) {
    const activities = data.map((lead) => ({
      lead_id: lead.id,
      agent_id: options.uploadedBy,
      activity_type: 'created',
      description: `Lead created via batch upload (Batch: ${batchId})`,
    }));

    await supabase.from('lead_activities').insert(activities);
  }

  return {
    batch_id: batchId,
    total: leads.length,
    imported: importedCount,
    failed: leads.length - importedCount,
    errors: validationErrors.filter(e => e.field !== 'company_name' && e.field !== 'contact_name'),
  };
}

/**
 * Get round-robin agent assignments
 */
async function getRoundRobinAssignments(count: number): Promise<string[]> {
  const agents = await getActiveAgents();

  if (agents.length === 0) {
    throw new Error('No active agents available for assignment');
  }

  const assignments: string[] = [];
  for (let i = 0; i < count; i++) {
    assignments.push(agents[i % agents.length].id);
  }

  return assignments;
}

/**
 * Get capacity-based agent assignments (agents with fewest active leads get priority)
 */
async function getCapacityBasedAssignments(count: number): Promise<string[]> {
  const supabase = createAdminClient();
  const agents = await getActiveAgents();

  if (agents.length === 0) {
    throw new Error('No active agents available for assignment');
  }

  // Get lead counts per agent
  const { data: leadCounts } = await supabase
    .from('tc_leads')
    .select('agent_id')
    .in('status', ['new', 'contacted', 'qualified', 'proposal_sent', 'negotiating']);

  const countByAgent = new Map<string, number>();
  agents.forEach(agent => countByAgent.set(agent.id, 0));

  if (leadCounts) {
    leadCounts.forEach((lead) => {
      const current = countByAgent.get(lead.agent_id) || 0;
      countByAgent.set(lead.agent_id, current + 1);
    });
  }

  // Sort agents by lead count (ascending)
  const sortedAgents = agents.sort((a, b) =>
    (countByAgent.get(a.id) || 0) - (countByAgent.get(b.id) || 0)
  );

  // Assign leads, prioritizing agents with fewer leads
  const assignments: string[] = [];
  for (let i = 0; i < count; i++) {
    // Re-sort after each assignment to maintain balance
    sortedAgents.sort((a, b) =>
      (countByAgent.get(a.id) || 0) - (countByAgent.get(b.id) || 0)
    );

    const agent = sortedAgents[0];
    assignments.push(agent.id);
    countByAgent.set(agent.id, (countByAgent.get(agent.id) || 0) + 1);
  }

  return assignments;
}

/**
 * Get active agents for lead assignment
 */
export async function getActiveAgents(): Promise<AdminUser[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('status', 'active')
    .in('role', ['agent', 'admin', 'super_admin'])
    .order('full_name');

  if (error || !data) {
    return [];
  }

  return data;
}

/**
 * Get batch upload history
 */
export async function getBatchUploadHistory(limit = 10): Promise<{
  batch_id: string;
  uploaded_at: string;
  lead_count: number;
  uploaded_by: string;
}[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('tc_leads')
    .select('batch_upload_id, created_at, assigned_by')
    .not('batch_upload_id', 'is', null)
    .order('created_at', { ascending: false });

  if (!data) return [];

  // Group by batch_upload_id
  const batches = new Map<string, { uploaded_at: string; lead_count: number; uploaded_by: string }>();

  data.forEach((lead) => {
    if (!lead.batch_upload_id) return;

    const existing = batches.get(lead.batch_upload_id);
    if (existing) {
      existing.lead_count++;
    } else {
      batches.set(lead.batch_upload_id, {
        uploaded_at: lead.created_at,
        lead_count: 1,
        uploaded_by: lead.assigned_by || 'Unknown',
      });
    }
  });

  return Array.from(batches.entries())
    .slice(0, limit)
    .map(([batch_id, info]) => ({
      batch_id,
      ...info,
    }));
}
