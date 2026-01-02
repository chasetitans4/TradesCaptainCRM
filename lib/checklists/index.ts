// =====================================================
// JOB CHECKLISTS LIBRARY
// Manage checklist templates and job checklists
// =====================================================

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export type ChecklistType = 'pre_job' | 'service' | 'post_job' | 'safety';
export type ChecklistItemType = 'check' | 'text' | 'number' | 'photo' | 'signature';

export interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  required: boolean;
  type: ChecklistItemType;
  completed?: boolean;
  completed_at?: string;
  completed_by?: string;
  value?: any;
  notes?: string;
}

export interface ChecklistTemplate {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  job_types?: string[];
  checklist_type: ChecklistType;
  items: ChecklistItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobChecklist {
  id: string;
  job_id: string;
  template_id?: string;
  name: string;
  checklist_type?: ChecklistType;
  items: ChecklistItem[];
  total_items: number;
  completed_items: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create a checklist template
 */
export async function createChecklistTemplate(
  businessId: string,
  name: string,
  items: Omit<ChecklistItem, 'id' | 'completed' | 'completed_at' | 'completed_by' | 'value'>[],
  options?: {
    description?: string;
    jobTypes?: string[];
    checklistType?: ChecklistType;
  }
): Promise<ChecklistTemplate> {
  const supabase = await createServerClient();

  const itemsWithIds = items.map(item => ({
    ...item,
    id: uuidv4(),
  }));

  const { data, error } = await supabase
    .from('checklist_templates')
    .insert({
      business_id: businessId,
      name,
      description: options?.description,
      job_types: options?.jobTypes,
      checklist_type: options?.checklistType || 'service',
      items: itemsWithIds,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all checklist templates for a business
 * Optionally filter by job type
 */
export async function getChecklistTemplates(
  businessId: string,
  jobType?: string
): Promise<ChecklistTemplate[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from('checklist_templates')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true);

  if (jobType) {
    query = query.contains('job_types', [jobType]);
  }

  const { data, error } = await query.order('name');

  if (error) throw error;
  return data;
}

/**
 * Get templates for a specific job type
 */
export async function getTemplatesForJobType(
  businessId: string,
  jobType: string
): Promise<ChecklistTemplate[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('checklist_templates')
    .select('*')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .contains('job_types', [jobType]);

  if (error) throw error;
  return data;
}

/**
 * Apply a checklist template to a job
 */
export async function applyChecklistToJob(
  jobId: string,
  templateId: string
): Promise<JobChecklist> {
  const supabase = await createServerClient();

  // Get template
  const { data: template, error: templateError } = await supabase
    .from('checklist_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (templateError) throw templateError;
  if (!template) throw new Error('Template not found');

  // Reset completion status on items
  const items = (template.items as ChecklistItem[]).map(item => ({
    ...item,
    completed: false,
    completed_at: undefined,
    completed_by: undefined,
    value: undefined,
    notes: undefined,
  }));

  // Create job checklist from template
  const { data, error } = await supabase
    .from('job_checklists')
    .insert({
      job_id: jobId,
      template_id: templateId,
      name: template.name,
      checklist_type: template.checklist_type,
      items,
      total_items: items.length,
      completed_items: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a custom checklist for a job (not from template)
 */
export async function createJobChecklist(
  jobId: string,
  name: string,
  items: Omit<ChecklistItem, 'id' | 'completed' | 'completed_at' | 'completed_by' | 'value'>[],
  checklistType?: ChecklistType
): Promise<JobChecklist> {
  const supabase = await createServerClient();

  const itemsWithIds = items.map(item => ({
    ...item,
    id: uuidv4(),
    completed: false,
  }));

  const { data, error } = await supabase
    .from('job_checklists')
    .insert({
      job_id: jobId,
      name,
      checklist_type: checklistType || 'service',
      items: itemsWithIds,
      total_items: itemsWithIds.length,
      completed_items: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a checklist item
 */
export async function updateChecklistItem(
  checklistId: string,
  itemId: string,
  userId: string,
  updates: {
    completed?: boolean;
    value?: any;
    notes?: string;
  }
): Promise<JobChecklist> {
  const supabase = await createServerClient();

  // Get current checklist
  const { data: checklist, error: fetchError } = await supabase
    .from('job_checklists')
    .select('items, started_at')
    .eq('id', checklistId)
    .single();

  if (fetchError) throw fetchError;
  if (!checklist) throw new Error('Checklist not found');

  // Update the specific item
  const items = checklist.items as ChecklistItem[];
  const itemIndex = items.findIndex(i => i.id === itemId);

  if (itemIndex === -1) throw new Error('Item not found');

  items[itemIndex] = {
    ...items[itemIndex],
    ...updates,
    completed_at: updates.completed ? new Date().toISOString() : undefined,
    completed_by: updates.completed ? userId : undefined,
  };

  // Calculate completion
  const completedItems = items.filter(i => i.completed).length;
  const allRequiredComplete = items
    .filter(i => i.required)
    .every(i => i.completed);

  // Update checklist
  const { data, error } = await supabase
    .from('job_checklists')
    .update({
      items,
      completed_items: completedItems,
      started_at: checklist.started_at || new Date().toISOString(),
      completed_at: allRequiredComplete ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', checklistId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all checklists for a job
 */
export async function getJobChecklists(jobId: string): Promise<JobChecklist[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('job_checklists')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at');

  if (error) throw error;
  return data;
}

/**
 * Get checklist progress for a job
 */
export async function getChecklistProgress(jobId: string): Promise<{
  totalChecklists: number;
  completedChecklists: number;
  totalItems: number;
  completedItems: number;
  percentComplete: number;
}> {
  const checklists = await getJobChecklists(jobId);

  const totalItems = checklists.reduce((sum, c) => sum + c.total_items, 0);
  const completedItems = checklists.reduce((sum, c) => sum + c.completed_items, 0);
  const completedChecklists = checklists.filter(c => c.completed_at !== null).length;

  return {
    totalChecklists: checklists.length,
    completedChecklists,
    totalItems,
    completedItems,
    percentComplete: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
  };
}

/**
 * Update a template
 */
export async function updateChecklistTemplate(
  templateId: string,
  updates: {
    name?: string;
    description?: string;
    jobTypes?: string[];
    checklistType?: ChecklistType;
    items?: Omit<ChecklistItem, 'completed' | 'completed_at' | 'completed_by' | 'value'>[];
    isActive?: boolean;
  }
): Promise<ChecklistTemplate> {
  const supabase = await createServerClient();

  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.jobTypes !== undefined) updateData.job_types = updates.jobTypes;
  if (updates.checklistType !== undefined) updateData.checklist_type = updates.checklistType;
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
  if (updates.items !== undefined) {
    updateData.items = updates.items.map(item => ({
      ...item,
      id: item.id || uuidv4(),
    }));
  }

  const { data, error } = await supabase
    .from('checklist_templates')
    .update(updateData)
    .eq('id', templateId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a template (soft delete)
 */
export async function deleteChecklistTemplate(templateId: string): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('checklist_templates')
    .update({ is_active: false })
    .eq('id', templateId);

  if (error) throw error;
}

/**
 * Delete a job checklist
 */
export async function deleteJobChecklist(checklistId: string): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('job_checklists')
    .delete()
    .eq('id', checklistId);

  if (error) throw error;
}
